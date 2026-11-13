import json
import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')


from app import create_app
from app.models import db, User, UploadedContent, AnalysisResult, DetectedIssue, ReviewRequest

def test_complete_brandguard_workflow():
    print("\n==================================================")
    print(" BRANDGUARD AI COMPREHENSIVE INTEGRATION TEST")
    print("==================================================")
    
    app = create_app()
    client = app.test_client()

    # 1. Test Health Endpoint
    print("\n[Step 1] Testing Health Endpoint...")
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print("  ✓ /api/health returned 200 OK:", res.json)

    # 2. Test Invalid Login
    print("\n[Step 2] Testing Invalid Login...")
    res = client.post('/api/auth/login', json={'email': 'wrong@test.com', 'password': 'bad'})
    assert res.status_code == 401, f"Expected 401: {res.data}"
    print("  ✓ Correctly rejected invalid credentials with 401.")

    # 3. Test Valid Login as Admin (Sarah Connor)
    print("\n[Step 3] Logging in as Admin (admin@technova.com)...")
    res = client.post('/api/auth/login', json={'email': 'admin@technova.com', 'password': 'password123'})
    assert res.status_code == 200, f"Login failed: {res.data}"
    token = res.json['token']
    auth_headers = {'Authorization': f'Bearer {token}'}
    print(f"  ✓ Admin logged in successfully! Role: {res.json['user']['role']}")

    # 4. Test Dashboard Stats Calculation from actual DB
    print("\n[Step 4] Querying Dashboard Real Statistics...")
    res = client.get('/api/dashboard/stats', headers=auth_headers)
    assert res.status_code == 200, f"Stats failed: {res.data}"
    stats = res.json
    print(f"  ✓ Total Analyzed: {stats['total_analyzed']}")
    print(f"  ✓ Approved Content: {stats['approved_content']}")
    print(f"  ✓ Pending Reviews: {stats['pending_reviews']}")
    print(f"  ✓ Detected Violations: {stats['detected_violations']}")
    print(f"  ✓ Critical Issues: {stats['critical_issues']}")
    print(f"  ✓ Brand Compliance Score: {stats['brand_compliance_score']}%")

    # 5. Test Brand Knowledge Base Overview
    print("\n[Step 5] Checking Brand Knowledge Base...")
    res = client.get('/api/brands', headers=auth_headers)
    assert res.status_code == 200
    bdata = res.json
    print(f"  ✓ Organization: {bdata['organization']['name']}")
    print(f"  ✓ Registered Rules: {len(bdata['rules'])}")
    print(f"  ✓ Brand Assets: {len(bdata['assets'])}")
    print(f"  ✓ Products & Verified Claims: {len(bdata['products'])}")
    print(f"  ✓ Guideline Documents: {len(bdata['guidelines'])}")

    # 6. Test Content Upload (Text / Mock poster with intentional brand violations)
    print("\n[Step 6] Uploading Promotional Asset with Intentional Brand Violations...")
    # Create test text file with violations
    test_content_path = os.path.join(app.config['UPLOAD_FOLDER'], 'test_campaign_flyer.txt')
    test_text = """Yo team! Check out the brand new solution from technova.
Our product provides 100% improved performance and is 100% guaranteed.
Built on LegacyCloud architecture. Primary color: #FF0000 Red."""
    with open(test_content_path, 'w', encoding='utf-8') as f:
        f.write(test_text)

    with open(test_content_path, 'rb') as f:
        data = {
            'file': (f, 'test_campaign_flyer.txt'),
            'title': 'Test Promotional Flyer'
        }
        res = client.post('/api/content/upload', data=data, content_type='multipart/form-data', headers=auth_headers)
    assert res.status_code == 201, f"Upload failed: {res.data}"
    content_id = res.json['content']['id']
    print(f"  ✓ Asset uploaded successfully! Content ID: {content_id}")

    # 7. Test AI Brand Governance Analysis
    print("\n[Step 7] Running AI Brand Governance Audit Engine...")
    res = client.post(f'/api/analysis/{content_id}', headers=auth_headers)
    assert res.status_code == 201, f"Analysis failed: {res.data}"
    analysis = res.json['analysis']
    analysis_id = analysis['id']
    print(f"  ✓ Analysis completed!")
    print(f"  ✓ Compliance Score: {analysis['compliance_score']}/100")
    print(f"  ✓ Overall Status: {analysis['overall_status']}")
    print(f"  ✓ Detected Issues Count: {len(analysis['issues'])}")
    for issue in analysis['issues']:
        print(f"    - [{issue['severity'].upper()}] {issue['title']} (Guideline: {issue['guideline_reference']})")

    assert len(analysis['issues']) > 0, "Expected violations to be detected!"

    # 8. Test Smart Suggestions - Accept First Suggestion
    print("\n[Step 8] Applying Smart Correction Suggestion...")
    first_issue = analysis['issues'][0]
    first_sugg = first_issue['correction_suggestion']
    if first_sugg:
        res = client.post(f"/api/suggestions/{first_sugg['id']}/accept", headers=auth_headers)
        assert res.status_code == 200
        print(f"  ✓ Accepted suggestion #{first_sugg['id']}!")
        print(f"  ✓ Updated draft content snippet:\n{res.json['updated_content'][:120]}...")

    # 9. Test Submitting for Human Review
    print("\n[Step 9] Submitting Content for Human Review...")
    res = client.post('/api/reviews/submit', json={
        'content_id': content_id,
        'notes': 'Applied 25% performance metric correction. Requesting reviewer sign-off.'
    }, headers=auth_headers)
    assert res.status_code == 201
    review_id = res.json['review']['id']
    print(f"  ✓ Created Review Request #{review_id} with status: {res.json['review']['status']}")

    # 10. Test Reviewer Comments Thread
    print("\n[Step 10] Adding Review Comment...")
    res = client.post(f'/api/reviews/{review_id}/comments', json={
        'comment': 'Looks significantly improved. Validating color tone change.'
    }, headers=auth_headers)
    assert res.status_code == 201
    print("  ✓ Comment recorded in review audit log.")

    # 11. Test Reviewer Approval (as Brand Reviewer)
    print("\n[Step 11] Approving Content Publication...")
    res = client.post(f'/api/reviews/{review_id}/approve', json={
        'notes': 'All critical claims aligned with TechNova 2026 guidelines. Approved.'
    }, headers=auth_headers)
    assert res.status_code == 200
    print(f"  ✓ Review decision: {res.json['review']['decision']}!")

    # 12. Test Updated Dashboard Metrics
    print("\n[Step 12] Verifying Updated Dashboard Database Statistics...")
    res = client.get('/api/dashboard/stats', headers=auth_headers)
    assert res.status_code == 200
    new_stats = res.json
    print(f"  ✓ Approved Content count is now: {new_stats['approved_content']}")
    print(f"  ✓ Total Content Analyzed is now: {new_stats['total_analyzed']}")

    # 13. Test CSV Report Export
    print("\n[Step 13] Testing Governance CSV Export Endpoint...")
    res = client.get('/api/analytics/export', headers=auth_headers)
    assert res.status_code == 200
    assert 'Content ID' in res.data.decode('utf-8')
    print("  ✓ CSV report generated and validated.")

    print("\n==================================================")
    print(" ALL 13 TEST STEPS PASSED SUCCESSFULLY (100% OK)!")
    print("==================================================")

if __name__ == '__main__':
    test_complete_brandguard_workflow()
