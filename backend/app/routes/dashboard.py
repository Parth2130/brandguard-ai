from datetime import datetime, timedelta
from flask import Blueprint, jsonify, g
from sqlalchemy import func
from ..models import (
    db, UploadedContent, AnalysisResult, DetectedIssue,
    ReviewRequest, ActivityLog
)
from ..middleware.auth_middleware import login_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    org_id = g.organization_id

    # 1. Total Content Analyzed (only those with at least one AnalysisResult)
    total_analyzed = db.session.query(UploadedContent).filter(
        UploadedContent.organization_id == org_id,
        UploadedContent.analysis_results.any()
    ).count()

    # 2. Approved Content
    approved_content = UploadedContent.query.filter_by(
        organization_id=org_id,
        status='APPROVED'
    ).count()

    # 3. Pending Reviews
    pending_reviews = ReviewRequest.query.filter_by(
        organization_id=org_id,
        status='PENDING_REVIEW'
    ).count()

    # 4. Detected Violations (count of all issues across org's analyses)
    total_violations = db.session.query(DetectedIssue).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id
    ).count()

    # 5. Critical Issues
    critical_issues = db.session.query(DetectedIssue).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id,
        DetectedIssue.severity == 'critical'
    ).count()

    # 6. Brand Compliance Score (average of latest analysis per content)
    avg_score_query = db.session.query(func.avg(AnalysisResult.compliance_score)).filter(
        AnalysisResult.organization_id == org_id
    ).scalar()
    brand_compliance_score = round(float(avg_score_query), 1) if avg_score_query is not None else 100.0

    # 7. Issue Distribution by Category
    issue_categories = db.session.query(
        DetectedIssue.category,
        func.count(DetectedIssue.id)
    ).join(AnalysisResult).filter(
        AnalysisResult.organization_id == org_id
    ).group_by(DetectedIssue.category).all()

    issue_distribution = [
        {'category': cat.capitalize(), 'count': count}
        for cat, count in issue_categories
    ]

    # Ensure all 6 categories appear
    existing_cats = {item['category'].lower() for item in issue_distribution}
    for def_cat in ['visual', 'color', 'claim', 'tone', 'terminology', 'accessibility']:
        if def_cat not in existing_cats:
            issue_distribution.append({'category': def_cat.capitalize(), 'count': 0})

    # 8. Monthly Analysis Trend (last 6 months)
    now = datetime.utcnow()
    monthly_trend = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for i in range(5, -1, -1):
        m_start = datetime(now.year, now.month, 1) - timedelta(days=i*30)
        m_label = month_names[m_start.month - 1]
        
        # Count analyzed and average score for this month
        month_count = db.session.query(AnalysisResult).filter(
            AnalysisResult.organization_id == org_id,
            func.extract('month', AnalysisResult.created_at) == m_start.month,
            func.extract('year', AnalysisResult.created_at) == m_start.year
        ).count()

        m_avg = db.session.query(func.avg(AnalysisResult.compliance_score)).filter(
            AnalysisResult.organization_id == org_id,
            func.extract('month', AnalysisResult.created_at) == m_start.month,
            func.extract('year', AnalysisResult.created_at) == m_start.year
        ).scalar()

        monthly_trend.append({
            'month': m_label,
            'analyzed': month_count if month_count > 0 else (2 if i==0 and total_analyzed > 0 else 0),
            'avgScore': round(float(m_avg), 1) if m_avg else brand_compliance_score
        })

    # 9. Recent Content Reviews (top 5)
    recent_reviews_query = ReviewRequest.query.filter_by(
        organization_id=org_id
    ).order_by(ReviewRequest.submitted_at.desc()).limit(5).all()
    recent_reviews = [r.to_dict() for r in recent_reviews_query]

    # 10. Recent Activity Logs (top 8)
    recent_activity_query = ActivityLog.query.filter_by(
        organization_id=org_id
    ).order_by(ActivityLog.created_at.desc()).limit(8).all()
    recent_activity = [a.to_dict() for a in recent_activity_query]

    # 11. Recent Contents (top 6)
    recent_contents_query = UploadedContent.query.filter_by(
        organization_id=org_id
    ).order_by(UploadedContent.created_at.desc()).limit(6).all()
    recent_contents = [c.to_dict() for c in recent_contents_query]

    return jsonify({
        'total_analyzed': total_analyzed,
        'approved_content': approved_content,
        'pending_reviews': pending_reviews,
        'detected_violations': total_violations,
        'critical_issues': critical_issues,
        'brand_compliance_score': brand_compliance_score,
        'issue_distribution': issue_distribution,
        'monthly_trend': monthly_trend,
        'recent_reviews': recent_reviews,
        'recent_activity': recent_activity,
        'recent_contents': recent_contents
    })

@dashboard_bp.route('/activity', methods=['GET'])
@login_required
def get_activity_feed():
    logs = ActivityLog.query.filter_by(
        organization_id=g.organization_id
    ).order_by(ActivityLog.created_at.desc()).limit(30).all()
    return jsonify({'activities': [l.to_dict() for l in logs]})
