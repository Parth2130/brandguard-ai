import re
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, CorrectionSuggestion, DetectedIssue, UploadedContent,
    RevisionHistory, ActivityLog
)
from ..middleware.auth_middleware import login_required

corrections_bp = Blueprint('corrections', __name__)

@corrections_bp.route('/<int:suggestion_id>/accept', methods=['POST'])
@login_required
def accept_suggestion(suggestion_id):
    suggestion = CorrectionSuggestion.query.get(suggestion_id)
    if not suggestion:
        return jsonify({'error': 'Correction suggestion not found.'}), 404

    content = UploadedContent.query.filter_by(
        id=suggestion.content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Unauthorized or content not found.'}), 403

    # Apply replacement in content.current_content
    orig = suggestion.original_text
    sugg = suggestion.suggested_text

    current_text = content.current_content or content.extracted_text or ""
    # Safe replacement if found
    if orig and orig in current_text:
        updated_text = current_text.replace(orig, sugg)
    elif orig:
        # Case insensitive attempt
        pattern = re.compile(re.escape(orig), re.IGNORECASE)
        updated_text = pattern.sub(sugg, current_text)
    else:
        updated_text = current_text

    content.current_content = updated_text
    suggestion.status = 'accepted'
    
    # Mark associated issue resolved if present
    if suggestion.issue:
        suggestion.issue.is_resolved = True

    # Record revision history
    version_num = len(content.revisions) + 1
    rev = RevisionHistory(
        content_id=content.id,
        version_num=version_num,
        modified_by_id=g.current_user.id,
        revised_text=updated_text,
        change_summary=f"Accepted AI suggestion: '{orig}' -> '{sugg}'"
    )
    db.session.add(rev)
    db.session.commit()

    return jsonify({
        'message': 'Suggestion accepted and correction applied to content draft.',
        'suggestion': suggestion.to_dict(),
        'updated_content': content.current_content
    })

@corrections_bp.route('/<int:suggestion_id>/reject', methods=['POST'])
@login_required
def reject_suggestion(suggestion_id):
    suggestion = CorrectionSuggestion.query.get(suggestion_id)
    if not suggestion:
        return jsonify({'error': 'Suggestion not found.'}), 404

    content = UploadedContent.query.filter_by(
        id=suggestion.content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Unauthorized or content not found.'}), 403

    suggestion.status = 'rejected'
    db.session.commit()
    return jsonify({
        'message': 'Suggestion rejected.',
        'suggestion': suggestion.to_dict()
    })

@corrections_bp.route('/<int:suggestion_id>/edit', methods=['POST'])
@login_required
def edit_and_apply_suggestion(suggestion_id):
    suggestion = CorrectionSuggestion.query.get(suggestion_id)
    if not suggestion:
        return jsonify({'error': 'Suggestion not found.'}), 404

    content = UploadedContent.query.filter_by(
        id=suggestion.content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Unauthorized or content not found.'}), 403

    data = request.get_json(silent=True) or {}
    user_custom_text = data.get('custom_text', '').strip()

    if not user_custom_text:
        return jsonify({'error': 'Custom text cannot be empty.'}), 400

    orig = suggestion.original_text
    current_text = content.current_content or content.extracted_text or ""

    if orig and orig in current_text:
        updated_text = current_text.replace(orig, user_custom_text)
    else:
        updated_text = current_text + f"\n\n[Correction Note: {user_custom_text}]"

    content.current_content = updated_text
    suggestion.status = 'edited'
    suggestion.user_edited_text = user_custom_text
    if suggestion.issue:
        suggestion.issue.is_resolved = True

    version_num = len(content.revisions) + 1
    rev = RevisionHistory(
        content_id=content.id,
        version_num=version_num,
        modified_by_id=g.current_user.id,
        revised_text=updated_text,
        change_summary=f"Applied manual edit for '{orig}'"
    )
    db.session.add(rev)
    db.session.commit()

    return jsonify({
        'message': 'Manual correction saved and applied.',
        'suggestion': suggestion.to_dict(),
        'updated_content': content.current_content
    })

@corrections_bp.route('/content/<int:content_id>/apply-all', methods=['POST'])
@login_required
def apply_all_suggestions(content_id):
    content = UploadedContent.query.filter_by(
        id=content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    suggestions = CorrectionSuggestion.query.filter_by(
        content_id=content_id,
        status='pending'
    ).all()

    current_text = content.current_content or content.extracted_text or ""
    applied_count = 0

    for s in suggestions:
        if s.original_text and s.suggested_text:
            if s.original_text in current_text:
                current_text = current_text.replace(s.original_text, s.suggested_text)
                s.status = 'accepted'
                if s.issue:
                    s.issue.is_resolved = True
                applied_count += 1

    content.current_content = current_text
    version_num = len(content.revisions) + 1
    rev = RevisionHistory(
        content_id=content.id,
        version_num=version_num,
        modified_by_id=g.current_user.id,
        revised_text=current_text,
        change_summary=f"Batch applied {applied_count} AI suggestions"
    )
    db.session.add(rev)
    db.session.commit()

    return jsonify({
        'message': f"Applied {applied_count} suggestions.",
        'applied_count': applied_count,
        'updated_content': content.current_content
    })
