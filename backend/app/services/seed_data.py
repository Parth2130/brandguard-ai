import json
from datetime import datetime, timedelta
from ..models import (
    db, Organization, User, BrandGuideline, BrandAsset, BrandRule,
    ProductInfo, UploadedContent, AnalysisResult, DetectedIssue,
    CorrectionSuggestion, ReviewRequest, ReviewComment, RevisionHistory,
    ActivityLog
)

def seed_technova_demo():
    """Initializes or resets the TechNova demonstration organization and dataset."""
    # Check if TechNova exists
    org = Organization.query.filter_by(name='TechNova Solutions').first()
    if org:
        # Ensure Round 3 benchmark fields are populated on existing demo products
        p1 = ProductInfo.query.filter_by(organization_id=org.id, product_name='NovaEngine 3.0').first()
        if p1 and not p1.verified_benchmarks:
            p1.verified_benchmarks = '25% performance improvement'
            p1.official_sla = '99.99% system availability, 10ms P99 latency'
            p1.prohibited_claims = '100% improved performance, zero risk, 100% guaranteed'
            db.session.commit()
        p2 = ProductInfo.query.filter_by(organization_id=org.id, product_name='NovaSecure AI').first()
        if p2 and not p2.verified_benchmarks:
            p2.verified_benchmarks = 'Sub-millisecond threat detection latency'
            p2.official_sla = '99.99% enterprise uptime SLA'
            p2.prohibited_claims = '100% unhackable, zero breach guarantee'
            db.session.commit()
        return org

    # 1. Create Organization
    org = Organization(
        name='TechNova Solutions',
        description='Enterprise Cloud Intelligence & High-Performance Data Infrastructure',
        industry='Enterprise Software',
        website='https://technova.io',
        contact_email='governance@technova.io',
        is_demo=True
    )
    db.session.add(org)
    db.session.flush()

    # 2. Create Users across 4 Roles
    users = [
        ('admin@technova.com', 'Sarah Connor', 'ADMIN', 'Chief Brand & Marketing Officer'),
        ('creator@technova.com', 'Alex Rivera', 'CONTENT_CREATOR', 'Senior Content Specialist'),
        ('reviewer@technova.com', 'David Chen', 'BRAND_REVIEWER', 'Global Brand Integrity Lead'),
        ('manager@technova.com', 'Elena Rostova', 'MARKETING_MANAGER', 'VP of Marketing Operations')
    ]
    user_map = {}
    for email, name, role, title in users:
        u = User(
            organization_id=org.id,
            email=email,
            full_name=name,
            role=role,
            job_title=title,
            is_active=True
        )
        u.set_password('password123')
        db.session.add(u)
        db.session.flush()
        user_map[role] = u

    # 3. Create Brand Rules
    brand_rules = [
        # Colors
        ('color', 'primary_hex', '#7C3AED', 'TechNova Royal Violet - Primary Brand Accent', 'critical'),
        ('color', 'secondary_hex', '#EDE9FE', 'Soft Lavender Tint - Card & Highlight Tone', 'high'),
        ('color', 'allowed_variation_1', '#6D28D9', 'Deep Indigo Violet - Hover States', 'medium'),
        ('color', 'allowed_variation_2', '#2E2459', 'Nightshade Purple - Primary Text', 'high'),
        # Typography
        ('typography', 'primary_font', 'Inter, Poppins, system-ui', 'Approved body and interface typeface', 'medium'),
        ('typography', 'heading_font', 'Poppins, 600 Semi-Bold', 'Standard display font for headline assets', 'medium'),
        # Tone
        ('tone', 'approved_tone', 'Professional and Friendly', 'Authoritative yet approachable enterprise voice', 'high'),
        ('tone', 'custom_tone_rule', 'Always communicate with factual confidence. Avoid high-pressure sales jargon or excessive exclamation marks.', 'Content Voice Standards', 'high'),
        # Terminology
        ('terminology', 'company_name', 'TechNova', 'Official company naming format. Case-sensitive: TechNova.', 'critical'),
        ('terminology', 'prohibited_term_1', 'LegacyCloud', 'Deprecated brand name. Prohibited in all external collateral.', 'critical'),
        ('terminology', 'prohibited_term_2', 'cheap stuff', 'Prohibited in product positioning. Use cost-effective or high-ROI.', 'high'),
        ('terminology', 'preferred_product_name', 'NovaEngine 3.0', 'Preferred brand name for core processing pipeline.', 'high')
    ]
    for r_type, key, val, desc, sev in brand_rules:
        br = BrandRule(
            organization_id=org.id,
            rule_type=r_type,
            rule_key=key,
            rule_value=val,
            description=desc,
            severity=sev,
            is_active=True
        )
        db.session.add(br)

    # 4. Brand Assets
    assets = [
        ('logo', 'TechNova Logo V2 (Full Color)', 'uploads/technova_logo_v2.png', 'v2.0', True, '{"colors": ["#7C3AED", "#2E2459"], "width": 800, "height": 240}'),
        ('logo', 'TechNova Monogram Badge V2', 'uploads/technova_badge_v2.png', 'v2.0', True, '{"colors": ["#7C3AED"], "width": 400, "height": 400}'),
        ('logo', 'TechNova Logo V1 (Outdated 2023)', 'uploads/technova_logo_v1_legacy.png', 'v1.0', False, '{"colors": ["#0284C7"], "width": 600, "height": 200}')
    ]
    for a_type, name, path, ver, active, meta in assets:
        ba = BrandAsset(
            organization_id=org.id,
            asset_type=a_type,
            name=name,
            file_path=path,
            file_url=f"/uploads/{path.split('/')[-1]}",
            version=ver,
            is_active=active,
            metadata_json=meta
        )
        db.session.add(ba)

    # 5. Product Information & Verified Claims
    products = [
        (
            'NovaEngine 3.0',
            'Distributed Cloud Engine',
            'High-throughput real-time stream analytics with 10ms P99 latency.',
            'Our product delivers 25% improved performance over standard compute clusters.',
            '25% performance improvement',
            '99.99% system availability, 10ms P99 latency',
            '100% improved performance, zero risk, 100% guaranteed',
            'TechNova Benchmark Tech Report 2026-Q1 (Audited)',
            '2026-01-15'
        ),
        (
            'NovaSecure AI',
            'Cybersecurity Suite',
            'Zero-trust packet inspection and multi-tenant cryptographic isolation.',
            'Guaranteed 99.99% enterprise uptime SLA with zero-trust perimeter enforcement.',
            'Sub-millisecond threat detection latency',
            '99.99% enterprise uptime SLA',
            '100% unhackable, zero breach guarantee',
            'SLA Master Agreement 2026',
            '2026-02-01'
        )
    ]
    for pname, cat, specs, claims, benchmarks, sla, prohibited, src, eff in products:
        pi = ProductInfo(
            organization_id=org.id,
            product_name=pname,
            category=cat,
            specifications=specs,
            approved_claims=claims,
            verified_benchmarks=benchmarks,
            official_sla=sla,
            prohibited_claims=prohibited,
            source_doc=src,
            effective_date=eff
        )
        db.session.add(pi)

    # 6. Brand Guideline Documents
    guideline = BrandGuideline(
        organization_id=org.id,
        title='TechNova Master Brand Governance Manual 2026',
        category='Brand Identity & Editorial',
        version='2.4',
        status='Active',
        raw_text="""TechNova Global Brand Governance Principles:
1. Color Identity: The primary signature color is TechNova Violet (#7C3AED), supported by Soft Lavender (#EDE9FE). No saturated red (#FF0000) or neon colors may be used on brand touchpoints.
2. Tone of Voice: Friendly, professional, and mathematically rigorous. Never use colloquial greetings (e.g. 'Yo!') or high-pressure superlatives ('100% guaranteed').
3. Performance Claims: All speed benchmarks must strictly cite the audited 25% performance improvement figure. Never claim 100% improvement.
4. Logos: Only TechNova Logo V2 is authorized. Outdated 2023 blue logos are strictly prohibited.
5. Terminology: Deprecated product 'LegacyCloud' must never appear. The company name is spelled 'TechNova' (capital T, capital N).""",
        document_name='TechNova_Brand_Manual_2026.pdf'
    )
    db.session.add(guideline)
    db.session.flush()

    # 7. Sample Content 1: Contains violations (for demo testing DETECT -> EXPLAIN -> CORRECT -> APPROVE)
    sample_text_1 = """Yo team! Get ready for the next-gen release.
Introducing the new cloud solution from technova.
Our product provides 100% improved performance and is 100% guaranteed to double your throughput.
Powered by LegacyCloud infrastructure, we blow all competition out of the water!
Visit us now before prices go up! Color theme: #FF0000 Red."""

    content1 = UploadedContent(
        organization_id=org.id,
        creator_id=user_map['CONTENT_CREATOR'].id,
        title='NovaEngine Q4 Marketing Launch Flyer',
        file_name='novaengine_launch_flyer.pdf',
        original_name='novaengine_launch_flyer.pdf',
        file_type='pdf',
        file_size=425000,
        file_path='uploads/novaengine_launch_flyer.pdf',
        file_url='/uploads/novaengine_launch_flyer.pdf',
        extracted_text=sample_text_1,
        current_content=sample_text_1,
        dominant_colors_json=json.dumps(['#FF0000', '#2E2459', '#FFFFFF']),
        status='PENDING_REVIEW'
    )
    db.session.add(content1)
    db.session.flush()

    # Analysis Result for Content 1
    analysis1 = AnalysisResult(
        content_id=content1.id,
        organization_id=org.id,
        summary='Detected 5 brand violations: 1 critical unsupported claim, 1 prohibited product term, 1 unapproved brand color, 1 informal brand tone issue, and 1 company name casing error.',
        compliance_score=48,
        overall_status='high_risk',
        analysis_categories_json=json.dumps({'logo': True, 'color': True, 'claim': True, 'tone': True, 'terminology': True, 'accessibility': True}),
        recommendations_json=json.dumps([
            "Revise the exaggerated 100% performance claim to the verified 25% benchmark.",
            "Remove prohibited term 'LegacyCloud'.",
            "Replace unapproved red color (#FF0000) with TechNova primary purple (#7C3AED)."
        ])
    )
    db.session.add(analysis1)
    db.session.flush()

    # Detected Issues for Content 1
    issues_data = [
        (
            'Unsupported Promotional Claim (100% Performance Metric)',
            'claim',
            'critical',
            'The content asserts a 100% improved performance claim, which directly contradicts TechNova verified benchmark data.',
            'Found: "Our product provides 100% improved performance"',
            'Product Claim Rule (NovaEngine 3.0): TechNova Benchmark Tech Report 2026-Q1',
            'Our product delivers 25% improved performance.',
            0.98,
            'Our product provides 100% improved performance',
            'Our product delivers 25% improved performance'
        ),
        (
            'Prohibited Terminology: LegacyCloud',
            'terminology',
            'critical',
            'The term LegacyCloud is explicitly prohibited across all published content.',
            'Found: "Powered by LegacyCloud infrastructure"',
            'Terminology Rule: Deprecated Product Naming Guideline',
            'Powered by NovaEngine 3.0 distributed cloud infrastructure.',
            0.99,
            'LegacyCloud',
            'NovaEngine 3.0'
        ),
        (
            'Unapproved Brand Colour (#FF0000)',
            'color',
            'high',
            'Detected saturated red #FF0000. Brand manual explicitly restricts red from primary brand touchpoints.',
            'Dominant color extracted: #FF0000',
            'Brand Color Palette: Primary #7C3AED (TechNova Royal Violet)',
            'Replace #FF0000 with approved primary color #7C3AED.',
            0.96,
            '#FF0000 Red',
            '#7C3AED TechNova Violet'
        ),
        (
            'Inconsistent Brand Tone (Overly Informal)',
            'tone',
            'medium',
            'Opening greeting "Yo team!" violates TechNova Professional and Friendly voice standard.',
            'Found: "Yo team!"',
            'Brand Voice Standards: Professional & Approachable',
            'Welcome enterprise leaders, or We are thrilled to announce.',
            0.91,
            'Yo team!',
            'We are thrilled to announce the next-generation release.'
        ),
        (
            'Incorrect Company Name Casing (technova)',
            'terminology',
            'medium',
            'Brand name must always be stylized with dual capitalization as TechNova.',
            'Found: "technova"',
            'Identity Guidelines: Official spelling is TechNova',
            'Capitalize as TechNova.',
            0.99,
            'technova',
            'TechNova'
        )
    ]

    for title, cat, sev, desc, evid, gref, sugg, conf, orig_text, sugg_text in issues_data:
        di = DetectedIssue(
            analysis_id=analysis1.id,
            title=title,
            category=cat,
            severity=sev,
            description=desc,
            evidence=evid,
            guideline_reference=gref,
            suggestion=sugg,
            confidence=conf,
            is_resolved=False
        )
        db.session.add(di)
        db.session.flush()

        # Add correction suggestion
        cs = CorrectionSuggestion(
            issue_id=di.id,
            content_id=content1.id,
            original_text=orig_text,
            suggested_text=sugg_text,
            category=cat,
            status='pending'
        )
        db.session.add(cs)

    # Review Request for Content 1
    rev1 = ReviewRequest(
        content_id=content1.id,
        organization_id=org.id,
        requester_id=user_map['CONTENT_CREATOR'].id,
        reviewer_id=user_map['BRAND_REVIEWER'].id,
        status='PENDING_REVIEW',
        decision='PENDING',
        reviewer_notes='Submitted for pre-publish review. Please inspect flagged promotional metrics and red accent color.',
        submitted_at=datetime.utcnow() - timedelta(hours=2)
    )
    db.session.add(rev1)
    db.session.flush()

    comment1 = ReviewComment(
        review_id=rev1.id,
        content_id=content1.id,
        user_id=user_map['BRAND_REVIEWER'].id,
        comment_text='Please accept the AI suggested correction for the 25% performance metric and change the red theme to #7C3AED. Once applied, I will approve immediately.'
    )
    db.session.add(comment1)

    # 8. Sample Content 2: Fully Compliant & Approved Asset
    sample_text_2 = """TechNova Solutions is proud to unveil NovaEngine 3.0.
Engineered for mission-critical cloud enterprise workloads, our product delivers 25% improved performance with 10ms low-latency throughput.
Backed by our 99.99% enterprise uptime SLA, TechNova empowers global infrastructure teams with unmatched reliability."""

    content2 = UploadedContent(
        organization_id=org.id,
        creator_id=user_map['CONTENT_CREATOR'].id,
        title='TechNova Enterprise Cloud Solution Brief',
        file_name='technova_solution_brief_2026.docx',
        original_name='technova_solution_brief_2026.docx',
        file_type='docx',
        file_size=185000,
        file_path='uploads/technova_solution_brief_2026.docx',
        file_url='/uploads/technova_solution_brief_2026.docx',
        extracted_text=sample_text_2,
        current_content=sample_text_2,
        dominant_colors_json=json.dumps(['#7C3AED', '#EDE9FE', '#2E2459']),
        status='APPROVED'
    )
    db.session.add(content2)
    db.session.flush()

    analysis2 = AnalysisResult(
        content_id=content2.id,
        organization_id=org.id,
        summary='Exemplary brand compliance. Zero policy or identity violations detected.',
        compliance_score=98,
        overall_status='compliant',
        analysis_categories_json=json.dumps({'logo': True, 'color': True, 'claim': True, 'tone': True, 'terminology': True, 'accessibility': True}),
        recommendations_json=json.dumps(["Asset is fully aligned with approved guidelines. Cleared for publication."])
    )
    db.session.add(analysis2)

    rev2 = ReviewRequest(
        content_id=content2.id,
        organization_id=org.id,
        requester_id=user_map['CONTENT_CREATOR'].id,
        reviewer_id=user_map['BRAND_REVIEWER'].id,
        status='APPROVED',
        decision='APPROVED',
        reviewer_notes='Approved without reservations. All brand terms, metrics, and colors follow governance standards.',
        submitted_at=datetime.utcnow() - timedelta(days=1),
        reviewed_at=datetime.utcnow() - timedelta(hours=18)
    )
    db.session.add(rev2)

    # Revision History
    rev_hist = RevisionHistory(
        content_id=content1.id,
        version_num=1,
        modified_by_id=user_map['CONTENT_CREATOR'].id,
        revised_text=sample_text_1,
        change_summary='Initial upload'
    )
    db.session.add(rev_hist)

    # Activity Logs
    logs = [
        ('SYSTEM_INITIALIZE', 'Organization', org.id, 'TechNova Brand Governance environment initialized.'),
        ('UPLOAD_CONTENT', 'Content', content1.id, 'NovaEngine Q4 Marketing Launch Flyer uploaded for analysis.'),
        ('RUN_ANALYSIS', 'Analysis', analysis1.id, 'AI Brand Engine completed audit with score 48/100.'),
        ('SUBMIT_REVIEW', 'ReviewRequest', rev1.id, 'Content routed to David Chen for formal review.'),
        ('APPROVE_CONTENT', 'Content', content2.id, 'TechNova Enterprise Cloud Solution Brief approved for publication.')
    ]
    for act, ttype, tid, detail in logs:
        al = ActivityLog(
            organization_id=org.id,
            user_id=user_map['ADMIN'].id,
            action=act,
            target_type=ttype,
            target_id=tid,
            details_json=json.dumps({'message': detail})
        )
        db.session.add(al)

    db.session.commit()
    print("[BrandGuard AI] TechNova demo organization seeded successfully.")
    return org
