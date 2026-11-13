from datetime import datetime
import json
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, ReviewRequest, ReviewComment, UploadedContent,
    ActivityLog
)
from ..middleware.auth_middleware import login_required, roles_required

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('', methods=['GET'])
@login_required
def list_reviews():
    status_filter = request.args.get('status')
    query = ReviewRequest.query.filter_by(organization_id=g.organization_id)
    if status_filter:
        query = query.filter_by(status=status_filter.upper())

    reviews = query.order_by(ReviewRequest.submitted_at.desc()).all()
    return jsonify({'reviews': [r.to_dict() for r in reviews]})

@reviews_bp.route('/<int:review_id>', methods=['GET'])
@login_required
def get_review_detail(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = review.to_dict()
    # Attach content info with latest analysis
    if review.content:
        data['content'] = review.content.to_dict()
    return jsonify({'review': data})

@reviews_bp.route('/submit', methods=['POST'])
@login_required
def submit_for_review():
    data = request.get_json(silent=True) or {}
    content_id = data.get('content_id')
    notes = data.get('notes', 'Submitted for brand governance review.')

    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    # Create new or update pending review request
    review = ReviewRequest.query.filter_by(
        content_id=content_id,
        status='PENDING_REVIEW'
    ).first()

    if not review:
        review = ReviewRequest(
            content_id=content_id,
            organization_id=g.organization_id,
            requester_id=g.current_user.id,
            status='PENDING_REVIEW',
            decision='PENDING',
            reviewer_notes=notes,
            submitted_at=datetime.utcnow()
        )
        db.session.add(review)
    else:
        review.reviewer_notes = notes
        review.submitted_at = datetime.utcnow()

    content.status = 'PENDING_REVIEW'

    # Activity log
    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='SUBMIT_FOR_REVIEW',
        target_type='Content',
        target_id=content.id,
        details_json=json.dumps({'title': content.title, 'notes': notes})
    )
    db.session.add(log)
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

    review.status = 'APPROVED'
    review.decision = 'APPROVED'
    review.reviewer_id = g.current_user.id
    review.reviewer_notes = notes
    review.reviewed_at = datetime.utcnow()

    if review.content:
        review.content.status = 'APPROVED'

    # Optional approval comment
    if notes:
        comment = ReviewComment(
            review_id=review.id,
            content_id=review.content_id,
            user_id=g.current_user.id,
            comment_text=f"Decision: APPROVED. {notes}"
        )
        db.session.add(comment)

    # Activity log
    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='APPROVE_CONTENT',
        target_type='ReviewRequest',
        target_id=review.id,
        details_json=json.dumps({'content_id': review.content_id, 'reviewer': g.current_user.full_name})
    )
    db.session.add(log)
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

    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='REJECT_CONTENT',
        target_type='ReviewRequest',
        target_id=review.id,
        details_json=json.dumps({'content_id': review.content_id, 'reason': notes})
    )
    db.session.add(log)
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

    review.status = 'REVISION_REQUESTED'
    review.decision = 'REVISION_REQUESTED'
    review.reviewer_id = g.current_user.id
    review.reviewer_notes = notes
    review.reviewed_at = datetime.utcnow()

    if review.content:
        review.content.status = 'REVISION_REQUESTED'

    comment = ReviewComment(
        review_id=review.id,
        content_id=review.content_id,
        user_id=g.current_user.id,
        comment_text=f"Revision Requested: {notes}"
    )
    db.session.add(comment)

    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='REQUEST_REVISION',
        target_type='ReviewRequest',
        target_id=review.id,
        details_json=json.dumps({'content_id': review.content_id, 'feedback': notes})
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Changes requested from creator.',
        'review': review.to_dict()
    })

@reviews_bp.route('/<int:review_id>/comments', methods=['POST'])
@login_required
def add_review_comment(review_id):
    review = ReviewRequest.query.filter_by(id=review_id, organization_id=g.organization_id).first()
    if not review:
        return jsonify({'error': 'Review request not found.'}), 404

    data = request.get_json(silent=True) or {}
    comment_text = data.get('comment', '').strip()
    if not comment_text:
        return jsonify({'error': 'Comment text cannot be empty.'}), 400

    comment = ReviewComment(
        review_id=review.id,
        content_id=review.content_id,
        user_id=g.current_user.id,
        comment_text=comment_text
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify({
        'message': 'Comment added successfully.',
        'comment': comment.to_dict()
    }), 201
