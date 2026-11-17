import os
import json
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, UploadedContent, VisualAuditResult, BrandRule, ActivityLog
)
from ..middleware.auth_middleware import login_required
from ..processors.document_processor import DocumentProcessor
try:
    from config import Config
except ImportError:
    from ..config import Config

visual_audit_bp = Blueprint('visual_audit', __name__)

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

@visual_audit_bp.route('/<int:content_id>', methods=['GET'])
@login_required
def get_visual_audit(content_id):
    content = UploadedContent.query.filter_by(
        id=content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    audit = VisualAuditResult.query.filter_by(
        content_id=content_id,
        organization_id=g.organization_id
    ).order_by(VisualAuditResult.id.desc()).first()

    if audit:
        return jsonify({'visual_audit': audit.to_dict()})

    # If no stored audit, compute on-the-fly for images/PDFs
    file_path = content.file_path
    if not os.path.exists(file_path):
        return jsonify({'error': 'Original file not found on disk.'}), 404

    ext = content.file_type.lower()
    color_rules = BrandRule.query.filter_by(
        organization_id=g.organization_id,
        rule_type='color',
        is_active=True
    ).all()
    approved_hexes = [r.rule_value.upper() for r in color_rules if r.rule_value.startswith('#')]

    extracted = DocumentProcessor.extract_dominant_colors_and_palette(file_path, ext, approved_hexes)
    
    # Also evaluate WCAG contrast against light and dark backgrounds
    contrast_eval = []
    for c in extracted.get('dominant_colors', []):
        hex_code = c.get('hex', '#FFFFFF')
        eval_res = DocumentProcessor.evaluate_contrast_wcag(hex_code, '#FFFFFF')
        if not eval_res.get('passes_normal'):
            contrast_eval.append({
                'foreground': hex_code,
                'background': '#FFFFFF',
                'ratio': eval_res.get('contrast_ratio'),
                'passes_aa': eval_res.get('passes_normal'),
                'passes_large': eval_res.get('passes_large'),
                'recommendation': 'Increase luminance contrast to achieve minimum 4.5:1 ratio for normal text under WCAG 2.1 AA.'
            })

    image_url = content.file_url or f"/uploads/{content.file_name}"
    
    # Store initial audit record
    new_audit = VisualAuditResult(
        organization_id=g.organization_id,
        content_id=content.id,
        image_url=image_url,
        dominant_colors_json=json.dumps(extracted.get('dominant_colors', [])),
        approved_palette_json=json.dumps(extracted.get('approved_palette', [])),
        unapproved_colors_json=json.dumps(extracted.get('unapproved_colors', [])),
        contrast_warnings_json=json.dumps(contrast_eval)
    )
    db.session.add(new_audit)
    db.session.commit()

    return jsonify({'visual_audit': new_audit.to_dict()})

@visual_audit_bp.route('/<int:content_id>/recolor', methods=['POST'])
@login_required
def recolor_content_image(content_id):
    content = UploadedContent.query.filter_by(
        id=content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    data = request.get_json(silent=True) or {}
    target_hex = data.get('target_hex')
    replacement_hex = data.get('replacement_hex')
    tolerance = int(data.get('tolerance', 45))

    if not target_hex or not replacement_hex:
        return jsonify({'error': 'Both target_hex and replacement_hex are required.'}), 400

    ext = content.file_type.lower()
    source_image_path = content.file_path

    # If PDF, render first page as image for recoloring
    if ext == 'pdf':
        rendered_path = DocumentProcessor.render_pdf_first_page_image(source_image_path, Config.UPLOAD_FOLDER)
        if not rendered_path or not os.path.exists(rendered_path):
            return jsonify({'error': 'Could not render PDF page for recoloring.'}), 400
        source_image_path = rendered_path

    if not os.path.exists(source_image_path):
        return jsonify({'error': 'Source file not found on disk.'}), 404

    # Generate output file name preserving original
    out_fname = f"recolored_{content.id}_{uuid.uuid4().hex[:6]}.png"
    out_path = os.path.join(Config.UPLOAD_FOLDER, out_fname)

    success = DocumentProcessor.recolor_image(
        input_image_path=source_image_path,
        output_image_path=out_path,
        target_hex=target_hex,
        replacement_hex=replacement_hex,
        tolerance=tolerance
    )

    if not success or not os.path.exists(out_path):
        return jsonify({'error': 'Smart recoloring failed during pixel processing.'}), 500

    corrected_url = f"/uploads/{out_fname}"

    # Update or create VisualAuditResult
    audit = VisualAuditResult.query.filter_by(
        content_id=content_id,
        organization_id=g.organization_id
    ).order_by(VisualAuditResult.id.desc()).first()

    history_item = {
        'timestamp': datetime.utcnow().isoformat(),
        'target_hex': target_hex,
        'replacement_hex': replacement_hex,
        'tolerance': tolerance,
        'output_url': corrected_url,
        'user_name': g.current_user.full_name
    }

    if audit:
        audit.corrected_image_url = corrected_url
        try:
            hist = json.loads(audit.recolor_history_json) if audit.recolor_history_json else []
        except Exception:
            hist = []
        hist.append(history_item)
        audit.recolor_history_json = json.dumps(hist)
    else:
        audit = VisualAuditResult(
            organization_id=g.organization_id,
            content_id=content.id,
            image_url=content.file_url or f"/uploads/{content.file_name}",
            corrected_image_url=corrected_url,
            recolor_history_json=json.dumps([history_item])
        )
        db.session.add(audit)

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='RECOLOR_VISUAL_ASSET',
        target_type='UploadedContent',
        target_id=content.id,
        details_dict={
            'target_hex': target_hex,
            'replacement_hex': replacement_hex,
            'tolerance': tolerance,
            'output_url': corrected_url
        }
    )
    db.session.commit()

    return jsonify({
        'message': f'Smart visual correction applied: replaced {target_hex} with {replacement_hex}.',
        'original_url': audit.image_url,
        'corrected_url': corrected_url,
        'visual_audit': audit.to_dict()
    })
