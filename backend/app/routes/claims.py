import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from ..models import (
    db, ProductInfo, UploadedContent, ClaimVerificationResult,
    AnalysisResult, ActivityLog
)
from ..middleware.auth_middleware import login_required, roles_required
from ..ai.brand_engine import BrandAnalysisEngine

claims_bp = Blueprint('claims', __name__)

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

@claims_bp.route('/products', methods=['GET'])
@login_required
def get_verified_products():
    products = ProductInfo.query.filter_by(
        organization_id=g.organization_id
    ).order_by(ProductInfo.created_at.desc()).all()
    return jsonify({'products': [p.to_dict() for p in products]})

@claims_bp.route('/verify', methods=['POST'])
@login_required
def verify_claim_text():
    data = request.get_json(silent=True) or {}
    content_id = data.get('content_id')
    raw_text = data.get('text', '')

    content = None
    if content_id:
        content = UploadedContent.query.filter_by(
            id=content_id,
            organization_id=g.organization_id
        ).first()
        if content and not raw_text:
            raw_text = content.current_content or content.extracted_text or ''

    if not raw_text.strip():
        return jsonify({'error': 'No text provided for claim verification.'}), 400

    products = ProductInfo.query.filter_by(organization_id=g.organization_id).all()
    classified_claims = BrandAnalysisEngine.classify_claims(raw_text, products)

    # Persist or update results if content_id is supplied
    persisted = []
    has_contradictions = False
    for c in classified_claims:
        if c.get('classification') == 'CONTRADICTED':
            has_contradictions = True
        if content:
            record = ClaimVerificationResult(
                organization_id=g.organization_id,
                content_id=content.id,
                claim_text=c.get('claim_text', ''),
                classification=c.get('classification', 'NEEDS_HUMAN_REVIEW'),
                product_name=c.get('product_name', ''),
                verified_benchmark=c.get('verified_benchmark', ''),
                explanation=c.get('explanation', ''),
                suggested_correction=c.get('suggested_correction', ''),
                source_reference=c.get('source_reference', ''),
                confidence=c.get('confidence', 0.95)
            )
            db.session.add(record)
            persisted.append(record)

    if content:
        log_hash_chained_activity(
            org_id=g.organization_id,
            user_id=g.current_user.id,
            action='VERIFY_CLAIMS',
            target_type='UploadedContent',
            target_id=content.id,
            details_dict={
                'claim_count': len(classified_claims),
                'has_contradictions': has_contradictions
            }
        )
        db.session.commit()

    return jsonify({
        'content_id': content_id,
        'claims': [p.to_dict() for p in persisted] if persisted else classified_claims,
        'has_contradictions': has_contradictions,
        'summary': {
            'total': len(classified_claims),
            'verified': sum(1 for c in classified_claims if c.get('classification') == 'VERIFIED'),
            'contradicted': sum(1 for c in classified_claims if c.get('classification') == 'CONTRADICTED'),
            'unsupported': sum(1 for c in classified_claims if c.get('classification') == 'UNSUPPORTED'),
            'needs_review': sum(1 for c in classified_claims if c.get('classification') == 'NEEDS_HUMAN_REVIEW')
        }
    })

@claims_bp.route('/content/<int:content_id>', methods=['GET'])
@login_required
def get_content_claims(content_id):
    content = UploadedContent.query.filter_by(
        id=content_id,
        organization_id=g.organization_id
    ).first()
    if not content:
        return jsonify({'error': 'Content not found.'}), 404

    results = ClaimVerificationResult.query.filter_by(
        content_id=content_id,
        organization_id=g.organization_id
    ).order_by(ClaimVerificationResult.id.asc()).all()

    return jsonify({
        'content_id': content_id,
        'claims': [r.to_dict() for r in results]
    })

@claims_bp.route('/<int:claim_id>/override', methods=['POST'])
@login_required
@roles_required('BRAND_REVIEWER', 'ADMIN')
def override_claim(claim_id):
    claim = ClaimVerificationResult.query.filter_by(
        id=claim_id,
        organization_id=g.organization_id
    ).first()
    if not claim:
        return jsonify({'error': 'Claim record not found.'}), 404

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', '').strip()
    if not reason:
        return jsonify({'error': 'A justified override reason is required.'}), 400

    claim.is_overridden = True
    claim.override_reason = reason
    claim.overridden_by_id = g.current_user.id

    log_hash_chained_activity(
        org_id=g.organization_id,
        user_id=g.current_user.id,
        action='OVERRIDE_CLAIM_CONTRADICTION',
        target_type='ClaimVerificationResult',
        target_id=claim.id,
        details_dict={
            'claim_text': claim.claim_text,
            'reason': reason,
            'reviewer': g.current_user.full_name
        }
    )
    db.session.commit()

    return jsonify({
        'message': 'Claim override recorded with justification.',
        'claim': claim.to_dict()
    })
