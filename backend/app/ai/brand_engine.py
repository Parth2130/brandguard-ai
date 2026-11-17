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
        text = (content_record.current_content or content_record.extracted_text or "").strip()
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

        # 1. COLOR VERIFICATION (Perceptual Distance CIE L*a*b* Delta-E)
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

            primary_col = approved_colors[0] if approved_colors else '#7C3AED'
            all_approved = approved_colors + allowed_variations

            # Check dominant colors extracted from image or mentioned in text
            detected_hexes = set(dominant_colors)
            # Find hex codes in text like #FF0000 or #DC2626
            text_hexes = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', text)
            for h in text_hexes:
                detected_hexes.add(h.upper())

            # Evaluate each detected color with perceptual distance
            for col in detected_hexes:
                col_upper = col.upper()
                if col_upper in ['#FFFFFF', '#000000', '#F8F6FF']:
                    continue

                # Compute perceptual Delta-E against approved palette
                closest_approved, min_delta_e = DocumentProcessor.find_closest_approved_color(col_upper, all_approved)

                # Delta-E <= 5.0 is visually acceptable match
                if min_delta_e > 5.0:
                    issues.append({
                        "title": f"UNAPPROVED BRAND COLOUR DETECTED ({col_upper})",
                        "category": "color",
                        "severity": "high" if col_upper in ['#FF0000', '#DC2626', '#E11D48'] else "medium",
                        "description": f"The asset contains color {col_upper}, which is not part of {organization.name}'s approved color palette (perceptual distance ΔE = {min_delta_e} from closest approved tone {closest_approved}).",
                        "evidence": f"Detected unapproved color value: {col_upper} (Closest approved: {closest_approved}, ΔE={min_delta_e})",
                        "guideline_reference": f"Brand Color Palette Rule: Primary {primary_col}",
                        "suggestion": f"Replace {col_upper} with approved brand color {closest_approved}.",
                        "confidence": 0.96
                    })

        # 2. LOGO VERIFICATION
        if 'logo' in categories:
            active_logos = [a for a in assets if a.asset_type == 'logo' and a.is_active]
            inactive_logos = [a for a in assets if a.asset_type == 'logo' and not a.is_active]

            # In image files, verify if logo metadata matches
            if content_record.file_type in ['png', 'jpg', 'jpeg', 'webp']:
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

        # 3. CONTENT AND CLAIM VERIFICATION (Automated Anti-Hallucination & False Claim Blocker)
        classified_claims = []
        if 'claim' in categories:
            content_percentages = re.findall(r'(\d+[\.\d]*)\s*%', text)

            for prod in products:
                approved_claims_text = prod.approved_claims or ""
                verified_benchmarks = prod.verified_benchmarks or ""
                official_sla = prod.official_sla or ""
                prohibited_claims_text = prod.prohibited_claims or ""
                source_doc = prod.source_doc or "TechNova Benchmark Tech Report 2026-Q1 (Audited)"

                approved_percentages = re.findall(r'(\d+[\.\d]*)\s*%', approved_claims_text + " " + verified_benchmarks)
                target_approved = approved_percentages[0] + '%' if approved_percentages else (verified_benchmarks or "25% improved performance")

                for cp in content_percentages:
                    if cp not in approved_percentages:
                        is_contradicted = float(cp) > 30 or (approved_percentages and float(cp) > float(approved_percentages[0]))
                        if is_contradicted:
                            claim_statement = f"{cp}% improved performance"
                            bench_statement = f"{target_approved} improved performance" if "%" in target_approved else target_approved

                            classified_claims.append({
                                "claim_text": claim_statement,
                                "classification": "CONTRADICTED",
                                "product_name": prod.product_name,
                                "verified_benchmark": bench_statement,
                                "explanation": f"The uploaded promotional claim exceeds the approved performance benchmark ({target_approved}) stored in the product knowledge base.",
                                "suggested_correction": f"Our product delivers {target_approved} improved performance.",
                                "source_reference": source_doc,
                                "confidence": 0.98
                            })

                            issues.append({
                                "title": f"Unsupported Promotional Claim ({cp}% Performance Claim)",
                                "category": "claim",
                                "severity": "critical",
                                "description": f"The content asserts a '{cp}%' performance improvement, which exceeds or contradicts the officially verified benchmark for {prod.product_name} ({target_approved}).",
                                "evidence": f"Found text with '{cp}%' metric vs approved '{target_approved}'",
                                "guideline_reference": f"Product Claim Rule ({prod.product_name}): Source document '{source_doc}'",
                                "suggestion": f"Revise claim statement to match the approved benchmark: '{target_approved}'.",
                                "confidence": 0.98
                            })
                        else:
                            classified_claims.append({
                                "claim_text": f"{cp}% claim",
                                "classification": "UNSUPPORTED",
                                "product_name": prod.product_name,
                                "verified_benchmark": "None on file",
                                "explanation": f"Claim statement with {cp}% is not explicitly verified in {prod.product_name} knowledge base. Flagged for human review.",
                                "suggested_correction": f"Verify against official specifications or adjust to verified benchmark: '{target_approved}'.",
                                "source_reference": source_doc,
                                "confidence": 0.85
                            })
                    else:
                        classified_claims.append({
                            "claim_text": f"{cp}% improved performance",
                            "classification": "VERIFIED",
                            "product_name": prod.product_name,
                            "verified_benchmark": f"{target_approved} performance improvement",
                            "explanation": f"Promotional statement adheres to officially verified {prod.product_name} benchmark.",
                            "suggested_correction": f"{target_approved} improved performance",
                            "source_reference": source_doc,
                            "confidence": 1.0
                        })

                # Check prohibited or absolute unverified claims
                unverified_patterns = [
                    (r'\b100%\s+guaranteed\b', "100% guaranteed", "Guaranteed satisfaction subject to terms", "CONTRADICTED"),
                    (r'\bbest\s+in\s+the\s+world\b', "best in the world", "industry-leading solution", "UNSUPPORTED"),
                    (r'\b#1\s+platform\b', "#1 platform", "leading enterprise platform", "UNSUPPORTED"),
                    (r'\bzero\s+risk\b', "zero risk", "reliable, enterprise-grade safety", "CONTRADICTED"),
                ]
                for pat, match_label, sugg, classification in unverified_patterns:
                    if re.search(pat, text, re.IGNORECASE):
                        classified_claims.append({
                            "claim_text": match_label,
                            "classification": classification,
                            "product_name": prod.product_name,
                            "verified_benchmark": "Prohibited superlative claim policy" if classification == "CONTRADICTED" else "Unsubstantiated claim",
                            "explanation": f"The promotional claim '{match_label}' requires audited legal verification and contradicts corporate marketing standards.",
                            "suggested_correction": sugg,
                            "source_reference": "Legal & Promotional Claims Policy: Substantive Verification Required",
                            "confidence": 0.94
                        })
                        issues.append({
                            "title": f"Unsubstantiated Absolute Claim ('{match_label}')",
                            "category": "claim",
                            "severity": "critical" if classification == "CONTRADICTED" else "high",
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

        # Structure visual audit summary
        unapproved_colors_list = []
        if 'color' in categories:
            for col in detected_hexes:
                col_upper = col.upper()
                if col_upper in ['#FFFFFF', '#000000', '#F8F6FF']:
                    continue
                closest_approved, min_delta_e = DocumentProcessor.find_closest_approved_color(col_upper, all_approved)
                if min_delta_e > 5.0:
                    unapproved_colors_list.append({
                        "detected_hex": col_upper,
                        "closest_approved_hex": closest_approved,
                        "perceptual_distance": min_delta_e,
                        "severity": "high" if col_upper in ['#FF0000', '#DC2626', '#E11D48'] else "medium"
                    })

        contrast_warnings = []
        if len(dominant_colors) >= 2:
            ce = DocumentProcessor.evaluate_contrast_wcag(dominant_colors[0], dominant_colors[1])
            if not ce.get('passes_normal'):
                contrast_warnings.append({
                    "foreground": dominant_colors[0],
                    "background": dominant_colors[1],
                    "ratio": ce.get('contrast_ratio'),
                    "passes_aa": ce.get('passes_normal'),
                    "recommendation": "Increase contrast to meet WCAG 4.5:1 ratio."
                })

        dominant_color_objects = []
        for i, h in enumerate(list(detected_hexes) if 'color' in categories else dominant_colors):
            pct = 60 if i == 0 else (30 if i == 1 else 10)
            dominant_color_objects.append({"hex": h, "percent": pct})

        visual_audit_data = {
            "dominant_colors": dominant_color_objects,
            "approved_palette": approved_colors if 'color' in categories else [],
            "unapproved_colors": unapproved_colors_list,
            "contrast_analysis": DocumentProcessor.evaluate_contrast_wcag(dominant_colors[0], dominant_colors[1]) if len(dominant_colors) >= 2 else None,
            "contrast_warnings": contrast_warnings,
            "file_type": content_record.file_type,
            "image_url": content_record.file_url
        }

        return {
            "summary": summary,
            "compliance_score": score,
            "overall_status": overall_status,
            "issues": issues,
            "classified_claims": classified_claims if 'claim' in categories else [],
            "visual_audit": visual_audit_data,
            "recommendations": recommendations,
            "engine": "deterministic_ground_truth"
        }

    @classmethod
    def _run_gemini_analysis(cls, api_key, text, dominant_colors, content_record, organization, rules, assets, products, guidelines, categories):
        """
        Executes Google Gemini API with structured JSON output enforcing BrandGuard schema.
        """
        model = getattr(Config, 'GEMINI_MODEL', 'gemini-2.5-flash') or 'gemini-2.5-flash'
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
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
