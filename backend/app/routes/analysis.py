import json
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, UploadedContent, AnalysisResult, DetectedIssue,
    CorrectionSuggestion, BrandRule, BrandAsset, ProductInfo,
    BrandGuideline, ActivityLog
)
from ..middleware.auth_middleware import login_required
from ..ai.brand_engine import BrandAnalysisEngine

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/<int:content_id>', methods=['POST'])
@login_required
def run_analysis(content_id):
    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content record not found.'}), 404

    data = request.get_json(silent=True) or {}
    selected_categories = data.get('categories') # optional filter: ['logo', 'color', 'claim', ...]

    content.status = 'ANALYZING'
    db.session.commit()

    # Retrieve organization brand knowledge base
    org = g.current_user.organization
    rules = BrandRule.query.filter_by(organization_id=g.organization_id, is_active=True).all()
    assets = BrandAsset.query.filter_by(organization_id=g.organization_id).all()
    products = ProductInfo.query.filter_by(organization_id=g.organization_id).all()
    guidelines = BrandGuideline.query.filter_by(organization_id=g.organization_id, status='Active').all()

    # Run AI Analysis Engine
    try:
        raw_result = BrandAnalysisEngine.analyze_content(
            content_record=content,
            organization=org,
            rules=rules,
            assets=assets,
            products=products,
            guidelines=guidelines,
            selected_categories=selected_categories
        )
    except Exception as e:
        content.status = 'UPLOADED'
        db.session.commit()
        return jsonify({'error': f"AI Analysis failed: {str(e)}"}), 500

    # Save Analysis Result
    analysis = AnalysisResult(
        content_id=content.id,
        organization_id=g.organization_id,
        summary=raw_result.get('summary', 'Analysis completed.'),
        compliance_score=raw_result.get('compliance_score', 100),
        overall_status=raw_result.get('overall_status', 'needs_review'),
        analysis_categories_json=json.dumps(selected_categories or ['logo', 'color', 'claim', 'tone', 'terminology', 'accessibility']),
        recommendations_json=json.dumps(raw_result.get('recommendations', [])),
        raw_response_json=json.dumps(raw_result)
    )
    db.session.add(analysis)
    db.session.flush()

    # Save Detected Issues and Correction Suggestions
    issues_list = raw_result.get('issues', [])
    for issue_data in issues_list:
        issue = DetectedIssue(
            analysis_id=analysis.id,
            title=issue_data.get('title', 'Brand Inconsistency'),
            category=issue_data.get('category', 'general'),
            severity=issue_data.get('severity', 'medium'),
            description=issue_data.get('description', ''),
            evidence=issue_data.get('evidence', ''),
            guideline_reference=issue_data.get('guideline_reference', ''),
            suggestion=issue_data.get('suggestion', ''),
            confidence=issue_data.get('confidence', 0.90),
            is_resolved=False
        )
        db.session.add(issue)
        db.session.flush()

        # Create smart correction suggestion record
        # Derive original snippet from evidence if applicable
        evidence_str = issue_data.get('evidence', '')
        sugg_text = issue_data.get('suggestion', '')
        
        orig_match = ''
        if 'Found:' in evidence_str or 'Detected:' in evidence_str:
            parts = evidence_str.split(':', 1)
            orig_match = parts[1].strip().strip('"').strip("'")
        else:
            orig_match = evidence_str[:100]

        cs = CorrectionSuggestion(
            issue_id=issue.id,
            content_id=content.id,
            original_text=orig_match or issue_data.get('title'),
            suggested_text=sugg_text,
            category=issue_data.get('category', 'content'),
            status='pending'
        )
        db.session.add(cs)

    content.status = 'ANALYZED'
    
    # Log Activity
    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='RUN_ANALYSIS',
        target_type='Analysis',
        target_id=analysis.id,
        details_json=json.dumps({
            'score': analysis.compliance_score,
            'issues_found': len(issues_list),
            'content_title': content.title
        })
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'AI Analysis completed successfully.',
        'analysis': analysis.to_dict()
    }), 201

@analysis_bp.route('/<int:analysis_id>', methods=['GET'])
@login_required
def get_analysis_by_id(analysis_id):
    analysis = AnalysisResult.query.filter_by(id=analysis_id, organization_id=g.organization_id).first()
    if not analysis:
        return jsonify({'error': 'Analysis record not found.'}), 404

    return jsonify({'analysis': analysis.to_dict()})

@analysis_bp.route('/<int:analysis_id>/issues', methods=['GET'])
@login_required
def get_analysis_issues(analysis_id):
    analysis = AnalysisResult.query.filter_by(id=analysis_id, organization_id=g.organization_id).first()
    if not analysis:
        return jsonify({'error': 'Analysis record not found.'}), 404

    severity_filter = request.args.get('severity')
    category_filter = request.args.get('category')

    query = DetectedIssue.query.filter_by(analysis_id=analysis.id)
    if severity_filter and severity_filter.lower() != 'all':
        query = query.filter_by(severity=severity_filter.lower())
    if category_filter and category_filter.lower() != 'all':
        query = query.filter_by(category=category_filter.lower())

    issues = query.order_by(DetectedIssue.created_at.asc()).all()
    return jsonify({
        'analysis_id': analysis.id,
        'compliance_score': analysis.compliance_score,
        'overall_status': analysis.overall_status,
        'issues': [i.to_dict() for i in issues]
    })
