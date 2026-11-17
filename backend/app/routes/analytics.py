import csv
import io
from flask import Blueprint, jsonify, g, Response
from sqlalchemy import func
from ..models import (
    db, UploadedContent, AnalysisResult, DetectedIssue,
    ReviewRequest, User
)
from ..middleware.auth_middleware import login_required

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/overview', methods=['GET'])
@login_required
def get_analytics_overview():
    org_id = g.organization_id

    total_uploads = UploadedContent.query.filter_by(organization_id=org_id).count()
    total_analyzed = db.session.query(UploadedContent).filter(
        UploadedContent.organization_id == org_id,
        UploadedContent.analysis_results.any()
    ).count()

    approved_count = UploadedContent.query.filter_by(organization_id=org_id, status='APPROVED').count()
    rejected_count = UploadedContent.query.filter_by(organization_id=org_id, status='REJECTED').count()
    changes_requested_count = UploadedContent.query.filter(
        UploadedContent.organization_id == org_id,
        UploadedContent.status.in_(['CHANGES_REQUESTED', 'REVISION_REQUESTED'])
    ).count()
    pending_count = ReviewRequest.query.filter_by(organization_id=org_id, status='PENDING_REVIEW').count()

    total_decided = approved_count + rejected_count + changes_requested_count
    approval_rate = round((approved_count / total_decided * 100), 1) if total_decided > 0 else 100.0
    rejection_rate = round((rejected_count / total_decided * 100), 1) if total_decided > 0 else 0.0
    changes_requested_rate = round((changes_requested_count / total_decided * 100), 1) if total_decided > 0 else 0.0

    avg_score = db.session.query(func.avg(AnalysisResult.compliance_score)).filter(
        AnalysisResult.organization_id == org_id
    ).scalar()
    compliance_score = round(float(avg_score), 1) if avg_score else 100.0

    # Severity counts
    severities = db.session.query(
        DetectedIssue.severity,
        func.count(DetectedIssue.id)
    ).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id
    ).group_by(DetectedIssue.severity).all()

    sev_dict = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    for s, c in severities:
        if s in sev_dict:
            sev_dict[s] = c

    # Reviewer activity breakdown from real database
    reviewers = User.query.filter(
        User.organization_id == org_id,
        User.role.in_(['BRAND_REVIEWER', 'ADMIN'])
    ).all()

    reviewer_activity = []
    for r in reviewers:
        approved = ReviewRequest.query.filter_by(organization_id=org_id, reviewer_id=r.id, status='APPROVED').count()
        rejected = ReviewRequest.query.filter_by(organization_id=org_id, reviewer_id=r.id, status='REJECTED').count()
        changes = ReviewRequest.query.filter(
            ReviewRequest.organization_id == org_id,
            ReviewRequest.reviewer_id == r.id,
            ReviewRequest.status.in_(['CHANGES_REQUESTED', 'REVISION_REQUESTED'])
        ).count()
        total_actions = approved + rejected + changes
        reviewer_activity.append({
            'reviewer_id': r.id,
            'name': r.full_name,
            'role': r.role,
            'total_reviewed': total_actions,
            'approved': approved,
            'rejected': rejected,
            'changes_requested': changes
        })

    return jsonify({
        'total_uploads': total_uploads,
        'total_analyzed': total_analyzed,
        'approved_count': approved_count,
        'rejected_count': rejected_count,
        'changes_requested_count': changes_requested_count,
        'pending_count': pending_count,
        'approval_rate': approval_rate,
        'rejection_rate': rejection_rate,
        'changes_requested_rate': changes_requested_rate,
        'average_compliance_score': compliance_score,
        'severity_breakdown': sev_dict,
        'reviewer_activity': reviewer_activity
    })

@analytics_bp.route('/violations', methods=['GET'])
@login_required
def get_common_violations():
    org_id = g.organization_id

    top_issues = db.session.query(
        DetectedIssue.title,
        DetectedIssue.category,
        DetectedIssue.severity,
        func.count(DetectedIssue.id).label('occurrences')
    ).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id
    ).group_by(
        DetectedIssue.title, DetectedIssue.category, DetectedIssue.severity
    ).order_by(func.count(DetectedIssue.id).desc()).limit(8).all()

    cat_counts = db.session.query(
        DetectedIssue.category,
        func.count(DetectedIssue.id)
    ).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id
    ).group_by(DetectedIssue.category).all()

    return jsonify({
        'top_violations': [
            {
                'title': t,
                'category': c.capitalize(),
                'severity': s,
                'count': cnt
            } for t, c, s, cnt in top_issues
        ],
        'category_breakdown': [
            {'name': c.capitalize(), 'value': cnt}
            for c, cnt in cat_counts
        ]
    })

@analytics_bp.route('/trends', methods=['GET'])
@login_required
def get_trends():
    org_id = g.organization_id
    results = AnalysisResult.query.filter_by(
        organization_id=org_id
    ).order_by(AnalysisResult.created_at.asc()).limit(30).all()

    trend_points = [
        {
            'id': r.id,
            'date': r.created_at.strftime('%b %d') if r.created_at else 'N/A',
            'score': r.compliance_score,
            'issues': len(r.issues)
        } for r in results
    ]

    # Calculate monthly aggregated compliance trends
    from collections import defaultdict
    monthly = defaultdict(list)
    for r in results:
        if r.created_at:
            m_key = r.created_at.strftime('%Y-%m')
            monthly[m_key].append(r.compliance_score)

    monthly_trends = [
        {
            'month': m,
            'average_score': round(sum(scores) / len(scores), 1) if scores else 100.0,
            'volume': len(scores)
        }
        for m, scores in sorted(monthly.items())
    ]

    return jsonify({
        'trend_points': trend_points,
        'monthly_trends': monthly_trends
    })

@analytics_bp.route('/export', methods=['GET'])
@login_required
def export_csv_report():
    org_id = g.organization_id

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow([
        'Content ID', 'Title', 'File Type', 'Status',
        'Compliance Score', 'Issues Count', 'Created At'
    ])

    contents = UploadedContent.query.filter_by(organization_id=org_id).all()
    for c in contents:
        latest_analysis = c.analysis_results[-1] if c.analysis_results else None
        cw.writerow([
            c.id,
            c.title,
            c.file_type,
            c.status,
            latest_analysis.compliance_score if latest_analysis else 'N/A',
            len(latest_analysis.issues) if latest_analysis else 0,
            c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
        ])

    output = si.getvalue()
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=brandguard_governance_report.csv"}
    )
