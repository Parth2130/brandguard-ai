import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, ReviewRequest, ReviewComment, UploadedContent,
    ActivityLog, User, ClaimVerificationResult
)
from ..middleware.auth_middleware import login_required, roles_required

reviews_bp = Blueprint('reviews', __name__)

def log_hash_chained_activity(org_id, user_id, action, target_type, target_id, details_dict):
    last_log = ActivityLog.query.filter_by(organization_id=org_id).order_by(ActivityLog.id.desc()).first()
    prev_hash = last_log.event_hash if (last_log and last_log.event_hash) else "0" * 64
    log = ActivityLog(
        organization_id=org_id,
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=json.dumps(details_dict),
        previous_hash=prev_hash
    )
    log.event_hash = log.calculate_hash(prev_hash)
    db.session.add(log)
    return log

@reviews_bp.route('', methods=['GET'])
@login_required
def list_reviews():
    status_filter = request.args.get('status')
    query = ReviewRequest.query.filter_by(organization_id=g.organization_id)
    if status_filter:
        s = status_filter.upper()
        if s == 'CHANGES_REQUESTED':
            query = query.filter(ReviewRequest.status.in_(['CHANGES_REQUESTED', 'REVISION_REQUESTED']))
        else:
            query = query.filter_by(status=s)

    reviews = query.order_by(ReviewRequest.submitted_at.desc()).all()
    return jsonify({'reviews': [r.to_dict() for r in reviews]})

@reviews_bp.route('/reviewers', methods=['GET'])
@login_required
def list_available_reviewers():
    reviewers = User.query.filter(
        User.organization_id == g.organization_id,
        User.role.in_(['BRAND_REVIEWER', 'ADMIN']),
        User.is_active == True
    ).all()
    return jsonify({
        'reviewers': [{
            'id': u.id,
            'full_name': u.full_name,
            'email': u.email,
            'role': u.role
        } for u in reviewers]
    })

@reviews_bp.route('/<int:review_id>', methods=['GET'])
@login_required
def get_review_detail(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = review.to_dict()
    if review.content:
        data['content'] = review.content.to_dict()
    return jsonify({'review': data})

@reviews_bp.route('/submit', methods=['POST'])
@login_required
def submit_for_review():
    data = request.get_json(silent=True) or {}
    content_id = data.get('content_id')
    notes = data.get('notes', 'Submitted for brand governance review.')
    reviewer_id = data.get('reviewer_id')

    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    # Validate assigned reviewer if provided
    assigned_reviewer_id = None
    if reviewer_id:
        rev_user = User.query.filter_by(id=reviewer_id, organization_id=g.organization_id).first()
        if rev_user and rev_user.role in ['BRAND_REVIEWER', 'ADMIN']:
            assigned_reviewer_id = rev_user.id

    review = ReviewRequest.query.filter_by(
        content_id=content_id,
        status='PENDING_REVIEW'
    ).first()

    if not review:
        review = ReviewRequest(
            content_id=content_id,
            organization_id=g.organization_id,
            requester_id=g.current_user.id,
            reviewer_id=assigned_reviewer_id,
            status='PENDING_REVIEW',
            decision='PENDING',
            reviewer_notes=notes,
            submitted_at=datetime.utcnow()
        )
        db.session.add(review)
    else:
        review.reviewer_notes = notes
        if assigned_reviewer_id:
            review.reviewer_id = assigned_reviewer_id
        review.submitted_at = datetime.utcnow()

    content.status = 'PENDING_REVIEW'

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='SUBMIT_FOR_REVIEW',
        target_type='UploadedContent',
        target_id=content.id,
        details_dict={
            'title': content.title,
            'notes': notes,
            'reviewer_id': assigned_reviewer_id
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Content submitted for human review.',
        'review': review.to_dict()
    }), 201

@reviews_bp.route('/<int:review_id>/approve', methods=['POST'])
@login_required
@roles_required('BRAND_REVIEWER', 'ADMIN')
def approve_review(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Approved. Content complies with brand governance standards.')

    # Check for un-overridden CONTRADICTED claims (False claim blocking)
    unresolved_claims = ClaimVerificationResult.query.filter_by(
        content_id=review.content_id,
        classification='CONTRADICTED',
        is_overridden=False
    ).all()

    if unresolved_claims:
        return jsonify({
            'error': 'Publication clearance blocked: Content contains contradicted promotional claims that violate verified product benchmarks. Reviewer must override or creator must revise.',
            'contradicted_claims': [c.to_dict() for c in unresolved_claims]
        }), 400

    review.status = 'APPROVED'
    review.decision = 'APPROVED'
    review.reviewer_id = g.current_user.id
    review.reviewer_notes = notes
    review.reviewed_at = datetime.utcnow()

    if review.content:
        review.content.status = 'APPROVED'

    if notes:
        comment = ReviewComment(
            review_id=review.id,
            content_id=review.content_id,
            user_id=g.current_user.id,
            comment_text=f"Decision: APPROVED. {notes}"
        )
        db.session.add(comment)

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='APPROVE_CONTENT',
        target_type='ReviewRequest',
        target_id=review.id,
        details_dict={
            'content_id': review.content_id,
            'reviewer': g.current_user.full_name,
            'decision': 'APPROVED',
            'notes': notes
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Content successfully approved for publication clearance.',
        'review': review.to_dict()
    })

@reviews_bp.route('/<int:review_id>/reject', methods=['POST'])
@login_required
@roles_required('BRAND_REVIEWER', 'ADMIN')
def reject_review(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Rejected due to unresolved critical brand inconsistencies.')

    review.status = 'REJECTED'
    review.decision = 'REJECTED'
    review.reviewer_id = g.current_user.id
    review.reviewer_notes = notes
    review.reviewed_at = datetime.utcnow()

    if review.content:
        review.content.status = 'REJECTED'

    comment = ReviewComment(
        review_id=review.id,
        content_id=review.content_id,
        user_id=g.current_user.id,
        comment_text=f"Decision: REJECTED. Reason: {notes}"
    )
    db.session.add(comment)

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='REJECT_CONTENT',
        target_type='ReviewRequest',
        target_id=review.id,
        details_dict={
            'content_id': review.content_id,
            'reason': notes,
            'reviewer': g.current_user.full_name
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Content review marked as REJECTED.',
        'review': review.to_dict()
    })

@reviews_bp.route('/<int:review_id>/request-changes', methods=['POST'])
@login_required
@roles_required('BRAND_REVIEWER', 'ADMIN')
def request_changes(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Revision requested. Please address highlighted suggestions.')

    review.status = 'CHANGES_REQUESTED'
    review.decision = 'REQUEST_CHANGES'
    review.reviewer_id = g.current_user.id
    review.reviewer_notes = notes
    review.reviewed_at = datetime.utcnow()

    if review.content:
        review.content.status = 'CHANGES_REQUESTED'

    comment = ReviewComment(
        review_id=review.id,
        content_id=review.content_id,
        user_id=g.current_user.id,
        comment_text=f"Changes Requested: {notes}"
    )
    db.session.add(comment)

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='REQUEST_CHANGES',
        target_type='ReviewRequest',
        target_id=review.id,
        details_dict={
            'content_id': review.content_id,
            'feedback': notes,
            'reviewer': g.current_user.full_name
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Changes requested from creator.',
        'review': review.to_dict()
    })

@reviews_bp.route('/<int:review_id>/comments', methods=['GET'])
@login_required
def get_review_comments(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    # Top-level comments (parent_comment_id is None)
    top_comments = ReviewComment.query.filter_by(
        review_id=review.id,
        parent_comment_id=None
    ).order_by(ReviewComment.created_at.asc()).all()

    return jsonify({
        'review_id': review_id,
        'comments': [c.to_dict(include_replies=True) for c in top_comments]
    })

@reviews_bp.route('/<int:review_id>/comments', methods=['POST'])
@login_required
def add_review_comment(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = request.get_json(silent=True) or {}
    comment_text = data.get('comment', '').strip()
    parent_comment_id = data.get('parent_comment_id')

    if not comment_text:
        return jsonify({'error': 'Comment text cannot be empty.'}), 400

    if parent_comment_id:
        parent = ReviewComment.query.filter_by(id=parent_comment_id, review_id=review.id).first()
        if not parent:
            return jsonify({'error': 'Parent comment not found.'}), 404

    comment = ReviewComment(
        review_id=review.id,
        content_id=review.content_id,
        user_id=g.current_user.id,
        parent_comment_id=parent_comment_id,
        comment_text=comment_text
    )
    db.session.add(comment)

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='ADD_THREADED_COMMENT',
        target_type='ReviewComment',
        target_id=review.id,
        details_dict={
            'author': g.current_user.full_name,
            'is_reply': bool(parent_comment_id),
            'parent_id': parent_comment_id
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Comment added successfully.',
        'comment': comment.to_dict(include_replies=True)
    }), 201
