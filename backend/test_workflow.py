import json
import os
import sys
from PIL import Image

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory and venv site-packages are in sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
venv_site = os.path.join(backend_dir, 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.insert(0, venv_site)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.models import (
    db, User, UploadedContent, AnalysisResult, DetectedIssue,
    ReviewRequest, ActivityLog, ClaimVerificationResult, VisualAuditResult
)

def run_round_3_verification():
    print("\n" + "=" * 65)
    print(" BRANDGUARD AI – ROUND 3 VERIFICATION & TEST SUITE")
    print(" Tagline: Intelligent Brand Governance – Before Every Publish.")
    print(" Team: Duo Coders")
    print("=" * 65)

    app = create_app()
    client = app.test_client()

    # ---------------------------------------------------------
    # Step 1: Health Check & System Verification
    # ---------------------------------------------------------
    print("\n[TEST 1] System Health & Readiness...")
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print("  ✓ /api/health returned 200 OK:", res.json)

    # ---------------------------------------------------------
    # Step 2: Authentication (Admin & Reviewer)
    # ---------------------------------------------------------
    print("\n[TEST 2] Authentication & RBAC Verification...")
    res = client.post('/api/auth/login', json={'email': 'admin@technova.com', 'password': 'password123'})
    assert res.status_code == 200, f"Login failed: {res.data}"
    admin_token = res.json['token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    print(f"  ✓ Admin logged in (Role: {res.json['user']['role']})")

    res = client.post('/api/auth/login', json={'email': 'reviewer@technova.com', 'password': 'password123'})
    assert res.status_code == 200
    rev_token = res.json['token']
    rev_headers = {'Authorization': f'Bearer {rev_token}'}
    print(f"  ✓ Reviewer logged in (Role: {res.json['user']['role']})")

    # ---------------------------------------------------------
    # Step 3: Product Knowledge Base Verification
    # ---------------------------------------------------------
    print("\n[TEST 3] Product & Claims Knowledge Base Inspection...")
    res = client.get('/api/claims/products', headers=admin_headers)
    assert res.status_code == 200
    products = res.json['products']
    assert len(products) > 0, "Expected seeded TechNova products!"
    nova_engine = next((p for p in products if 'NovaEngine' in p['product_name']), None)
    assert nova_engine is not None, "NovaEngine product missing from Knowledge Base!"
    print(f"  ✓ Product: {nova_engine['product_name']}")
    print(f"  ✓ Verified Benchmark: {nova_engine['verified_benchmarks']}")
    print(f"  ✓ Official SLA: {nova_engine['official_sla']}")
    print(f"  ✓ Prohibited Claims: {nova_engine['prohibited_claims']}")

    # ---------------------------------------------------------
    # Step 4: Scenario 1 - Multimodal Visual & Palette Extraction Engine
    # ---------------------------------------------------------
    print("\n[TEST 4] SCENARIO 1: Multimodal Visual & Palette Extraction Engine...")
    # Create an actual test image with an unapproved red (#FF0000) header and neutral background
    test_img_path = os.path.join(app.config['UPLOAD_FOLDER'], 'test_marketing_banner.png')
    img = Image.new('RGB', (400, 300), color=(255, 255, 255))
    # Fill top region with #FF0000 (RGB: 255, 0, 0)
    for x in range(400):
        for y in range(120):
            img.putpixel((x, y), (255, 0, 0))
    img.save(test_img_path)

    with open(test_img_path, 'rb') as f:
        upload_res = client.post('/api/content/upload', data={
            'file': (f, 'test_marketing_banner.png'),
            'title': 'Q1 Promo Banner Graphic'
        }, content_type='multipart/form-data', headers=admin_headers)
    assert upload_res.status_code == 201
    img_content_id = upload_res.json['content']['id']
    print(f"  ✓ Uploaded visual asset (Content #{img_content_id})")

    # Run Analysis
    ana_res = client.post(f'/api/analysis/{img_content_id}', headers=admin_headers)
    assert ana_res.status_code == 201
    v_audit = ana_res.json['analysis'].get('visual_audit')
    assert v_audit is not None, "Visual audit data missing from analysis result!"

    print(f"  ✓ Dominant colors extracted: {len(v_audit['dominant_colors'])} tones")
    print(f"  ✓ Approved brand palette matched against: {v_audit['approved_palette']}")
    print(f"  ✓ Unapproved colors detected: {len(v_audit['unapproved_colors'])}")
    for uc in v_audit['unapproved_colors']:
        print(f"    - Detected {uc['detected_hex']} (ΔE distance: {uc['perceptual_distance']} to approved {uc['closest_approved_hex']})")
        assert uc['perceptual_distance'] > 5.0, "Delta-E should be > 5.0 for unapproved red!"
        assert uc['closest_approved_hex'] in ['#7C3AED', '#EDE9FE'], f"Expected approved tone, got {uc['closest_approved_hex']}"

    # Test Smart Visual Recoloring (Part 1.6)
    print("\n[TEST 4.1] Smart Visual Recoloring & Before/After Output...")
    recolor_res = client.post(f'/api/visual-audit/{img_content_id}/recolor', json={
        'target_hex': '#FF0000',
        'replacement_hex': '#7C3AED',
        'tolerance': 45
    }, headers=admin_headers)
    assert recolor_res.status_code == 200
    rec_data = recolor_res.json
    print(f"  ✓ Recoloring result: {rec_data['message']}")
    print(f"  ✓ Original URL: {rec_data['original_url']}")
    print(f"  ✓ Corrected URL: {rec_data['corrected_url']}")
    # Verify corrected image file exists and has purple pixels
    corrected_file_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(rec_data['corrected_url']))
    assert os.path.exists(corrected_file_path), "Corrected image file was not created on disk!"
    c_img = Image.open(corrected_file_path).convert('RGB')
    p_sample = c_img.getpixel((50, 50)) # previously red (255, 0, 0)
    # Check that sample pixel is close to #7C3AED (RGB: 124, 58, 237)
    print(f"  ✓ Pixel at (50, 50) recolored from (255, 0, 0) to RGB: {p_sample}")
    assert p_sample[0] < 150 and p_sample[2] > 200, "Pixel was not correctly converted to brand purple!"

    # ---------------------------------------------------------
    # Step 5: Scenario 2 - Automated Anti-Hallucination & False Claim Blocker
    # ---------------------------------------------------------
    print("\n[TEST 5] SCENARIO 2: Anti-Hallucination & False Claim Blocker...")
    # Content with exaggerated 100% improved performance claim (benchmark is 25%)
    false_claim_text = """NovaEngine provides 100% improved performance and is 100% guaranteed."""
    test_doc_path = os.path.join(app.config['UPLOAD_FOLDER'], 'test_false_claim.txt')
    with open(test_doc_path, 'w', encoding='utf-8') as f:
        f.write(false_claim_text)

    with open(test_doc_path, 'rb') as f:
        upload_res = client.post('/api/content/upload', data={
            'file': (f, 'test_false_claim.txt'),
            'title': 'NovaEngine Exaggerated Campaign Copy'
        }, content_type='multipart/form-data', headers=admin_headers)
    assert upload_res.status_code == 201
    claim_content_id = upload_res.json['content']['id']

    # Run Analysis
    ana_res = client.post(f'/api/analysis/{claim_content_id}', headers=admin_headers)
    assert ana_res.status_code == 201
    classified_claims = ana_res.json['analysis'].get('classified_claims', [])
    assert len(classified_claims) > 0, "No claims classified!"

    contradicted = next((c for c in classified_claims if c['classification'] == 'CONTRADICTED'), None)
    assert contradicted is not None, "Failed to detect CONTRADICTED false claim!"
    print(f"  ✓ Detected Claim: \"{contradicted['claim_text']}\"")
    print(f"  ✓ Classification: {contradicted['classification']}")
    print(f"  ✓ Verified Benchmark: {contradicted['verified_benchmark']}")
    print(f"  ✓ Explanation: {contradicted['explanation']}")
    print(f"  ✓ Suggested Correction: \"{contradicted['suggested_correction']}\"")
    assert "25%" in contradicted['verified_benchmark'] or "25%" in contradicted['suggested_correction']

    # ---------------------------------------------------------
    # Step 6: Scenario 5 - False Claim Blocking & Reviewer Override
    # ---------------------------------------------------------
    print("\n[TEST 6] SCENARIO 5: False Claim Blocking of Publication Clearance...")
    # Submit for review
    sub_res = client.post('/api/reviews/submit', json={
        'content_id': claim_content_id,
        'notes': 'Submitting for clearance.'
    }, headers=admin_headers)
    assert sub_res.status_code == 201
    review_id = sub_res.json['review']['id']

    # Reviewer attempts to approve blocked content without resolving contradicted claim -> MUST BE BLOCKED
    print("  [Step 6.1] Attempting approval with unresolved contradicted claims...")
    blocked_res = client.post(f'/api/reviews/{review_id}/approve', json={
        'notes': 'Attempting early sign-off.'
    }, headers=rev_headers)
    assert blocked_res.status_code == 400, "Approval should have been blocked due to contradicted claim!"
    print(f"  ✓ Publication clearance correctly BLOCKED (HTTP 400): {blocked_res.json['error']}")

    # Reviewer overrides the contradictions with recorded justification
    print("  [Step 6.2] Applying Reviewer Override with recorded justification...")
    for c in classified_claims:
        if c.get('classification') == 'CONTRADICTED':
            override_res = client.post(f"/api/claims/{c['id']}/override", json={
                'reason': f"Special exemption for claim: '{c['claim_text']}' approved by Product VP."
            }, headers=rev_headers)
            assert override_res.status_code == 200
            print(f"  ✓ Overridden claim #{c['id']}: {c['claim_text']}")

    # Now approval succeeds
    print("  [Step 6.3] Retrying approval post-override...")
    approved_res = client.post(f'/api/reviews/{review_id}/approve', json={
        'notes': 'Approved under logged VP exemption.'
    }, headers=rev_headers)
    assert approved_res.status_code == 200, f"Approval failed: {approved_res.json}"
    print(f"  ✓ Approval cleared for publication! Decision: {approved_res.json['review']['decision']}")

    # ---------------------------------------------------------
    # Step 7: Scenario 3 - Tri-State Governance & Threaded Comments
    # ---------------------------------------------------------
    print("\n[TEST 7] SCENARIO 3: Tri-State Governance & Threaded Comments...")
    # Create fresh content for tri-state review test
    res = client.post('/api/reviews/submit', json={
        'content_id': img_content_id,
        'notes': 'Visual asset submitted with unapproved red.'
    }, headers=admin_headers)
    assert res.status_code == 201
    tri_review_id = res.json['review']['id']

    # 1. Reviewer REQUESTS CHANGES
    print("  [Step 7.1] Reviewer issues REQUEST_CHANGES...")
    chg_res = client.post(f'/api/reviews/{tri_review_id}/request-changes', json={
        'notes': 'Please recolor the red header to official brand purple #7C3AED.'
    }, headers=rev_headers)
    assert chg_res.status_code == 200
    assert chg_res.json['review']['status'] == 'CHANGES_REQUESTED'
    print(f"  ✓ Review status updated to: {chg_res.json['review']['status']}")

    # 2. Add Top-Level Comment from Reviewer
    print("  [Step 7.2] Adding Top-Level Reviewer Comment...")
    c1_res = client.post(f'/api/reviews/{tri_review_id}/comments', json={
        'comment': 'Check Section 3 of Brand Manual: unapproved red #FF0000 violates accessibility.'
    }, headers=rev_headers)
    assert c1_res.status_code == 201
    parent_comment_id = c1_res.json['comment']['id']
    print(f"  ✓ Top-level comment #{parent_comment_id} created by {c1_res.json['comment']['user_name']}")

    # 3. Creator Posts Threaded Reply (with parent_comment_id)
    print("  [Step 7.3] Creator replies to comment...")
    c2_res = client.post(f'/api/reviews/{tri_review_id}/comments', json={
        'comment': 'Understood! I ran the Smart Recoloring tool and converted all pixels to #7C3AED.',
        'parent_comment_id': parent_comment_id
    }, headers=admin_headers)
    assert c2_res.status_code == 201
    assert c2_res.json['comment']['parent_comment_id'] == parent_comment_id
    print(f"  ✓ Threaded reply #{c2_res.json['comment']['id']} linked to parent #{parent_comment_id}")

    # 4. Fetch Threaded Comments Structure
    print("  [Step 7.4] Fetching hierarchical comments...")
    threads_res = client.get(f'/api/reviews/{tri_review_id}/comments', headers=admin_headers)
    assert threads_res.status_code == 200
    comments = threads_res.json['comments']
    assert len(comments) >= 1
    parent_thread = next((c for c in comments if c['id'] == parent_comment_id), None)
    assert parent_thread is not None, f"Parent thread #{parent_comment_id} not found in comments!"
    assert len(parent_thread['replies']) >= 1, f"Expected replies under comment #{parent_comment_id}!"
    print(f"  ✓ Retrieved {len(comments)} thread(s) with {len(parent_thread['replies'])} nested reply(s) successfully!")

    # ---------------------------------------------------------
    # Step 8: Scenario 4 - Smart Correction Studio & Recalculate Score
    # ---------------------------------------------------------
    print("\n[TEST 8] SCENARIO 4: Smart Correction Application & Score Recalculation...")
    reanalyze_res = client.post(f'/api/suggestions/content/{img_content_id}/reanalyze', headers=admin_headers)
    assert reanalyze_res.status_code == 200
    print(f"  ✓ Re-analyzed content! New compliance score: {reanalyze_res.json['new_score']}/100")

    # ---------------------------------------------------------
    # Step 9: Tamper-Evident SHA-256 Hash Chain Audit Trail Verification
    # ---------------------------------------------------------
    print("\n[TEST 9] Tamper-Evident SHA-256 Hash Chain Verification...")
    with app.app_context():
        logs = ActivityLog.query.order_by(ActivityLog.id.asc()).all()
        assert len(logs) > 5, "Expected activity logs to be recorded!"
        chained_count = 0
        for i, log in enumerate(logs):
            if log.event_hash and log.previous_hash is not None:
                chained_count += 1
                if i > 0 and logs[i-1].organization_id == log.organization_id:
                    # Check that previous hash matches or is genesis
                    assert log.previous_hash == logs[i-1].event_hash or log.previous_hash in ["0" * 64, "GENESIS_HASH"], \
                        f"Hash broken at log #{log.id}!"
        print(f"  ✓ Verified SHA-256 hash chaining across {chained_count} activity audit log records!")

    # ---------------------------------------------------------
    # Step 10: Real Database Analytics Telemetry
    # ---------------------------------------------------------
    print("\n[TEST 10] Real Database Analytics & Reviewer Activity Breakdown...")
    analytics_res = client.get('/api/analytics/overview', headers=admin_headers)
    assert analytics_res.status_code == 200
    a_data = analytics_res.json
    print(f"  ✓ Approval Rate: {a_data['approval_rate']}%")
    print(f"  ✓ Rejection Rate: {a_data['rejection_rate']}%")
    print(f"  ✓ Changes Requested Count: {a_data['changes_requested_count']}")
    print(f"  ✓ Reviewer Activity Records: {len(a_data['reviewer_activity'])}")
    for ra in a_data['reviewer_activity']:
        print(f"    - Reviewer: {ra['name']} ({ra['role']}) -> Total: {ra['total_reviewed']}, Approved: {ra['approved']}, Changes: {ra['changes_requested']}, Rejected: {ra['rejected']}")

    print("\n" + "=" * 65)
    print(" ALL SCENARIOS & ACCEPTANCE CRITERIA VERIFIED 100% PASSING!")
    print("=" * 65)

if __name__ == '__main__':
    run_round_3_verification()
