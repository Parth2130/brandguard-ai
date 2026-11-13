import json
import re
import requests
try:
    from config import Config
except ImportError:
    from ..config import Config

from ..processors.document_processor import DocumentProcessor

class BrandAnalysisEngine:
    @classmethod
    def analyze_content(cls, content_record, organization, rules, assets, products, guidelines, selected_categories=None):
        """
        Main entry point for analyzing uploaded content against brand knowledge base.
        Returns validated structured JSON.
        """
        text = (content_record.extracted_text or "").strip()
        dominant_colors = []
        try:
            if content_record.dominant_colors_json:
                dominant_colors = json.loads(content_record.dominant_colors_json)
        except Exception:
            pass

        # If categories not specified, analyze all 6
        all_categories = ['logo', 'color', 'claim', 'tone', 'terminology', 'accessibility']
        active_cats = selected_categories if selected_categories else all_categories

        # Check if external Gemini API key is configured
        api_key = Config.GEMINI_API_KEY
        if api_key and api_key.strip():
            try:
                result = cls._run_gemini_analysis(
                    api_key=api_key,
                    text=text,
                    dominant_colors=dominant_colors,
                    content_record=content_record,
                    organization=organization,
                    rules=rules,
                    assets=assets,
                    products=products,
                    guidelines=guidelines,
                    categories=active_cats
                )
                if result and 'issues' in result:
                    return result
            except Exception as e:
                print(f"[BrandGuard AI] Gemini API call failed or timed out: {e}. Falling back to deterministic engine.")

        # Deterministic Ground-Truth Engine
        return cls._run_deterministic_analysis(
            text=text,
            dominant_colors=dominant_colors,
            content_record=content_record,
            organization=organization,
            rules=rules,
            assets=assets,
            products=products,
            guidelines=guidelines,
            categories=active_cats
        )

    @classmethod
    def _run_deterministic_analysis(cls, text, dominant_colors, content_record, organization, rules, assets, products, guidelines, categories):
        """
        Deterministic, high-accuracy brand rule evaluation grounded directly
        in the organization's stored Brand Knowledge Base.
        """
        issues = []
        recommendations = []

        # 1. COLOR VERIFICATION
        if 'color' in categories:
            approved_colors = []
            allowed_variations = []
            for r in rules:
                if r.rule_type == 'color':
                    if 'hex' in r.rule_key.lower() or r.rule_key.startswith('#'):
                        approved_colors.append(r.rule_value.upper())
                    if 'variation' in r.rule_key.lower():
                        allowed_variations.append(r.rule_value.upper())

            if not approved_colors:
                # Default fallback rule if none registered
                approved_colors = ['#7C3AED', '#EDE9FE', '#FFFFFF', '#2E2459']

            # Check dominant colors extracted from image or mentioned in text
            detected_hexes = set(dominant_colors)
            # Find hex codes in text like #FF0000 or #DC2626
            text_hexes = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', text)
            for h in text_hexes:
                detected_hexes.add(h.upper())

            # Evaluate each detected color
            for col in detected_hexes:
                col_upper = col.upper()
                # Check distance or exact match
                is_approved = any(col_upper == app.upper() for app in approved_colors + allowed_variations)
                
                # If col is extreme background (e.g. pure white #FFFFFF or pure black #000000), allow
                if col_upper in ['#FFFFFF', '#000000', '#F8F6FF']:
                    continue

                if not is_approved:
                    # Flag unapproved color
                    primary_col = approved_colors[0] if approved_colors else '#7C3AED'
                    issues.append({
                        "title": f"Unapproved Brand Colour Detected ({col_upper})",
                        "category": "color",
                        "severity": "high" if col_upper in ['#FF0000', '#DC2626', '#E11D48'] else "medium",
                        "description": f"The asset contains color {col_upper}, which is not part of {organization.name}'s approved color palette.",
                        "evidence": f"Detected unapproved color value: {col_upper}",
                        "guideline_reference": f"Brand Color Palette Rule: Primary {primary_col}",
                        "suggestion": f"Replace {col_upper} with approved primary brand color {primary_col} or secondary {approved_colors[1] if len(approved_colors)>1 else '#EDE9FE'}.",
                        "confidence": 0.95
                    })

        # 2. LOGO VERIFICATION
        if 'logo' in categories:
            active_logos = [a for a in assets if a.asset_type == 'logo' and a.is_active]
            inactive_logos = [a for a in assets if a.asset_type == 'logo' and not a.is_active]

            # In image files, verify if logo metadata matches
            if content_record.file_type in ['png', 'jpg', 'jpeg']:
                if not active_logos:
                    issues.append({
                        "title": "Missing Active Approved Logo Reference",
                        "category": "visual",
                        "severity": "medium",
                        "description": f"No active approved logo asset is registered in {organization.name}'s Brand Knowledge Base for automated comparison.",
                        "evidence": "Knowledge Base assets list contains 0 active approved logos.",
                        "guideline_reference": "Brand Identity Assets: Primary Logo",
                        "suggestion": "Upload and mark an approved brand logo in the Knowledge Base to enable visual asset verification.",
                        "confidence": 0.90
                    })
                else:
                    # Mark visual checks for human review per requirements
                    recommendations.append(f"Verify visual logo placement against approved {active_logos[0].name} ({active_logos[0].version}).")

            # Check for outdated logo references in text
            for old_logo in inactive_logos:
                if old_logo.name.lower() in text.lower():
                    issues.append({
                        "title": f"Outdated Logo Variant Referenced ({old_logo.name})",
                        "category": "visual",
                        "severity": "high",
                        "description": f"The content mentions or references an outdated logo variant: '{old_logo.name}'.",
                        "evidence": f"Found reference to: '{old_logo.name}'",
                        "guideline_reference": f"Brand Asset Guidelines: Active version is {active_logos[0].name if active_logos else 'latest'}",
                        "suggestion": f"Update the asset reference to use {active_logos[0].name if active_logos else 'the latest approved logo'}.",
                        "confidence": 0.92
                    })

        # 3. CONTENT AND CLAIM VERIFICATION
        if 'claim' in categories:
            # Check claims against registered ProductInfo
            for prod in products:
                # Check for exaggerated percentages or performance claims
                # e.g., if approved is 25% and text says 100% or 50%
                approved_claims_text = prod.approved_claims or ""
                # Extract percentages in content
                content_percentages = re.findall(r'(\d+[\.\d]*)\s*%', text)
                approved_percentages = re.findall(r'(\d+[\.\d]*)\s*%', approved_claims_text)

                for cp in content_percentages:
                    if cp not in approved_percentages and float(cp) > 30:
                        # Exaggerated or unverified metric
                        target_approved = approved_percentages[0] + '%' if approved_percentages else "verified metric"
                        issues.append({
                            "title": f"Unsupported Promotional Claim ({cp}% Performance Claim)",
                            "category": "claim",
                            "severity": "critical",
                            "description": f"The content asserts a '{cp}%' performance improvement, which exceeds or contradicts the officially verified claim for {prod.product_name}.",
                            "evidence": f"Found text with '{cp}%' metric vs approved '{target_approved}'",
                            "guideline_reference": f"Product Claim Rule ({prod.product_name}): Source document '{prod.source_doc or 'Specification Sheet'}'",
                            "suggestion": f"Revise claim statement to match the approved claim: '{prod.approved_claims or 'approved specification'}' ({target_approved}).",
                            "confidence": 0.96
                        })

                # Check for absolute unverified claims: "100% guaranteed", "best in the world", "#1 on the market"
                unverified_patterns = [
                    (r'\b100%\s+guaranteed\b', "100% guaranteed", "Guaranteed satisfaction subject to terms"),
                    (r'\bbest\s+in\s+the\s+world\b', "best in the world", "industry-leading solution"),
                    (r'\b#1\s+platform\b', "#1 platform", "leading enterprise platform"),
                    (r'\bzero\s+risk\b', "zero risk", "reliable, enterprise-grade safety"),
                ]
                for pat, match_label, sugg in unverified_patterns:
                    if re.search(pat, text, re.IGNORECASE):
                        issues.append({
                            "title": f"Unsubstantiated Absolute Claim ('{match_label}')",
                            "category": "claim",
                            "severity": "high",
                            "description": f"Absolute superlative claim '{match_label}' requires legal verification and supporting evidence before publication.",
                            "evidence": f"Detected phrase: '{match_label}' in content text.",
                            "guideline_reference": "Legal & Promotional Claims Policy: Substantive Verification Required",
                            "suggestion": f"Rephrase with defensible wording: '{sugg}'.",
                            "confidence": 0.93
                        })

        # 4. BRAND TONE ANALYSIS
        if 'tone' in categories:
            tone_rules = [r for r in rules if r.rule_type == 'tone']
            approved_tones = [r.rule_value for r in tone_rules if 'tone' in r.rule_key.lower()]
            if not approved_tones:
                approved_tones = ["Professional and Friendly"]

            # Informal slang and buzzword patterns
            unprofessional_patterns = [
                (r'\byo\b|\bhey\s+dude\b|\bwhats\s+up\b', "Overly informal greeting/slang", "Welcome / Greetings"),
                (r'\bshit\b|\bdamn\b|\bcrap\b', "Profanity / Vulgarity", "Remove offensive words"),
                (r'!{3,}', "Excessive exclamation marks (!!!)", "Use single punctuation (.)"),
                (r'\bgrab\s+it\s+now\s+or\s+cry\b', "High-pressure coercive sales tactic", "Discover our solutions today"),
                (r'\bcheap\s+stuff\b', "Diminutive brand language", "Cost-effective enterprise solution")
            ]
            for pat, issue_desc, sugg in unprofessional_patterns:
                match = re.search(pat, text, re.IGNORECASE)
                if match:
                    issues.append({
                        "title": f"Inconsistent Brand Tone: {issue_desc}",
                        "category": "tone",
                        "severity": "medium",
                        "description": f"Content language contradicts {organization.name}'s approved tone ({', '.join(approved_tones)}).",
                        "evidence": f"Found text segment matching: '{match.group(0)}'",
                        "guideline_reference": f"Brand Voice Guideline: {', '.join(approved_tones)}",
                        "suggestion": f"Replace with professional phrasing: '{sugg}'.",
                        "confidence": 0.91
                    })

        # 5. TERMINOLOGY CHECKING
        if 'terminology' in categories:
            term_rules = [r for r in rules if r.rule_type == 'terminology']
            for tr in term_rules:
                if 'prohibited' in tr.rule_key.lower() or 'forbidden' in tr.rule_key.lower():
                    prohibited_word = tr.rule_value.strip()
                    if prohibited_word and re.search(r'\b' + re.escape(prohibited_word) + r'\b', text, re.IGNORECASE):
                        issues.append({
                            "title": f"Prohibited Terminology: '{prohibited_word}'",
                            "category": "terminology",
                            "severity": tr.severity or "high",
                            "description": f"The word '{prohibited_word}' is explicitly marked as prohibited in {organization.name}'s terminology dictionary.",
                            "evidence": f"Found prohibited term '{prohibited_word}' in content.",
                            "guideline_reference": f"Approved Terminology Rule: {tr.description or 'Strict company naming convention'}",
                            "suggestion": f"Remove '{prohibited_word}' and replace with approved product nomenclature.",
                            "confidence": 0.98
                        })

            # Check company name casing or outdated naming
            # e.g., "technova" lowercase instead of "TechNova"
            org_name = organization.name
            if org_name and org_name.lower() in text.lower():
                # Check for exact casing mistakes like technova or TECHNOVA if org is CamelCase
                matches = re.findall(r'\b' + re.escape(org_name.lower()) + r'\b', text, re.IGNORECASE)
                for m in matches:
                    if m != org_name and m.lower() == org_name.lower():
                        issues.append({
                            "title": f"Incorrect Company Brand Naming Casing ('{m}')",
                            "category": "terminology",
                            "severity": "medium",
                            "description": f"The company brand name must always be stylized as '{org_name}'. Found incorrect casing '{m}'.",
                            "evidence": f"Detected casing: '{m}'",
                            "guideline_reference": f"Identity Guidelines: Official brand spelling is '{org_name}'",
                            "suggestion": f"Change '{m}' to '{org_name}'.",
                            "confidence": 0.99
                        })
                        break

        # 6. ACCESSIBILITY ANALYSIS
        if 'accessibility' in categories:
            # Contrast checks if colors were extracted
            if len(dominant_colors) >= 2:
                contrast = DocumentProcessor.calculate_contrast_ratio(dominant_colors[0], dominant_colors[1])
                if contrast < 4.5:
                    issues.append({
                        "title": f"Insufficient Color Contrast Ratio ({contrast}:1)",
                        "category": "accessibility",
                        "severity": "medium",
                        "description": f"The contrast ratio between primary dominant colors ({dominant_colors[0]} and {dominant_colors[1]}) is {contrast}:1, which fails WCAG 2.1 AA requirement of 4.5:1 for body text.",
                        "evidence": f"Measured contrast: {contrast}:1 between {dominant_colors[0]} and {dominant_colors[1]}",
                        "guideline_reference": "WCAG 2.1 AA Accessibility Standard: 4.5:1 minimum contrast",
                        "suggestion": f"Increase lightness contrast between text and background to achieve at least 4.5:1.",
                        "confidence": 0.94
                    })

            # Readability check on text (sentence length check)
            sentences = re.split(r'[.!?]+', text)
            long_sentences = [s.strip() for s in sentences if len(s.split()) > 35]
            if long_sentences:
                issues.append({
                    "title": "Complex Reading Grade Level (Overly Long Sentences)",
                    "category": "accessibility",
                    "severity": "low",
                    "description": f"Found {len(long_sentences)} sentences with over 35 words. Complex sentences degrade comprehension for diverse audiences.",
                    "evidence": f"Example sentence: \"{long_sentences[0][:80]}...\"",
                    "guideline_reference": "Content Accessibility & Plain Language Guidelines",
                    "suggestion": "Break complex compound sentences into shorter, digestible phrases (under 20 words).",
                    "confidence": 0.88
                })

        # Calculate Compliance Score (100 base)
        score = 100
        for issue in issues:
            sev = issue.get('severity', 'medium')
            if sev == 'critical':
                score -= 25
            elif sev == 'high':
                score -= 15
            elif sev == 'medium':
                score -= 8
            elif sev == 'low':
                score -= 4
        score = max(0, min(100, score))

        critical_count = sum(1 for i in issues if i.get('severity') == 'critical')
        if score >= 90 and critical_count == 0:
            overall_status = "compliant"
            summary = f"Content successfully passed brand governance with an exemplary compliance score of {score}/100."
        elif score >= 60 and critical_count <= 1:
            overall_status = "needs_review"
            summary = f"Content requires attention ({len(issues)} detected issue{'s' if len(issues)!=1 else ''}). Resolve flagged violations before publication."
        else:
            overall_status = "high_risk"
            summary = f"Critical brand identity and promotional claim violations detected. Content has been restricted from publication until revised."

        if not recommendations:
            if issues:
                recommendations = [f"Apply smart corrections for '{issues[0]['title']}'", "Route document to Brand Reviewer for sign-off."]
            else:
                recommendations = ["All guidelines verified. Ready to submit for one-click reviewer approval."]

        return {
            "summary": summary,
            "compliance_score": score,
            "overall_status": overall_status,
            "issues": issues,
            "recommendations": recommendations,
            "engine": "deterministic_ground_truth"
        }

    @classmethod
    def _run_gemini_analysis(cls, api_key, text, dominant_colors, content_record, organization, rules, assets, products, guidelines, categories):
        """
        Executes Gemini 1.5 Flash API with structured JSON output enforcing BrandGuard schema.
        """
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        rules_context = [f"- [{r.rule_type.upper()}] {r.rule_key}: {r.rule_value} (Severity: {r.severity})" for r in rules]
        products_context = [f"- Product: {p.product_name}, Approved Claims: {p.approved_claims}, Specs: {p.specifications}" for p in products]
        assets_context = [f"- Asset: {a.name} ({a.asset_type}, version {a.version}, active={a.is_active})" for a in assets]

        system_instruction = f"""
You are the BrandGuard AI Brand Governance Quality-Control Engine for '{organization.name}'.
Your task is to analyze content against approved brand guidelines and return a STRICT JSON object.

ORGANIZATION BRAND KNOWLEDGE BASE:
Rules:
{chr(10).join(rules_context) if rules_context else "None defined"}

Products & Verified Claims:
{chr(10).join(products_context) if products_context else "None defined"}

Assets:
{chr(10).join(assets_context) if assets_context else "None defined"}

CRITICAL RULES:
1. Never invent missing guideline references.
2. Maintain evidence for every finding.
3. Calculate compliance_score (0-100) strictly: 100 minus critical(-25), high(-15), medium(-8), low(-4).
4. Output MUST BE valid JSON adhering to this schema:
{{
  "summary": "string",
  "compliance_score": number,
  "overall_status": "compliant" | "needs_review" | "high_risk",
  "issues": [
    {{
      "title": "string",
      "category": "visual" | "color" | "claim" | "tone" | "terminology" | "accessibility",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "string",
      "evidence": "string",
      "guideline_reference": "string",
      "suggestion": "string",
      "confidence": number
    }}
  ],
  "recommendations": ["string"]
}}
"""

        user_content = f"""
CONTENT TO ANALYZE:
Filename: {content_record.original_name}
File Type: {content_record.file_type}
Extracted Dominant Colors: {dominant_colors}
Extracted Text:
\"\"\"
{text[:4000]}
\"\"\"
"""

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_instruction + "\n\n" + user_content}]}
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        resp = requests.post(endpoint, json=payload, timeout=25)
        if resp.status_code == 200:
            data = resp.json()
            raw_text = data['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(raw_text)
            parsed['engine'] = 'gemini_1.5_flash'
            return parsed
        else:
            raise Exception(f"Gemini API returned status {resp.status_code}: {resp.text}")
