import os
import uuid
import json
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from ..models import (
    db, Organization, BrandGuideline, BrandAsset, BrandRule,
    ProductInfo, ActivityLog
)
from ..middleware.auth_middleware import login_required, roles_required
from ..processors.document_processor import DocumentProcessor
try:
    from config import Config
except ImportError:
    from ..config import Config


brands_bp = Blueprint('brands', __name__)

# ==================== COMPANY INFORMATION ====================

@brands_bp.route('', methods=['GET'])
@login_required
def get_brand_overview():
    org = Organization.query.get(g.organization_id)
    if not org:
        return jsonify({'error': 'Organization not found'}), 404

    guidelines = [g.to_dict() for g in org.guidelines]
    assets = [a.to_dict() for a in org.assets]
    rules = [r.to_dict() for r in org.rules]
    products = [p.to_dict() for p in org.products]

    return jsonify({
        'organization': org.to_dict(),
        'guidelines': guidelines,
        'assets': assets,
        'rules': rules,
        'products': products
    })

@brands_bp.route('/company', methods=['PUT'])
@login_required
@roles_required('ADMIN')
def update_company_info():
    org = Organization.query.get(g.organization_id)
    data = request.get_json(silent=True) or {}

    org.name = data.get('name', org.name)
    org.description = data.get('description', org.description)
    org.industry = data.get('industry', org.industry)
    org.website = data.get('website', org.website)
    org.contact_email = data.get('contact_email', org.contact_email)

    db.session.commit()
    return jsonify({'message': 'Company information updated successfully.', 'organization': org.to_dict()})

# ==================== BRAND RULES (COLOR, TYPOGRAPHY, TONE, TERMINOLOGY) ====================

@brands_bp.route('/rules', methods=['GET'])
@login_required
def get_rules():
    rule_type = request.args.get('type')
    query = BrandRule.query.filter_by(organization_id=g.organization_id)
    if rule_type:
        query = query.filter_by(rule_type=rule_type)
    rules = query.order_by(BrandRule.created_at.desc()).all()
    return jsonify({'rules': [r.to_dict() for r in rules]})

@brands_bp.route('/rules', methods=['POST'])
@login_required
@roles_required('ADMIN')
def create_rule():
    data = request.get_json(silent=True) or {}
    rule_type = data.get('rule_type')
    rule_key = data.get('rule_key')
    rule_value = data.get('rule_value')

    if not rule_type or not rule_key or not rule_value:
        return jsonify({'error': 'rule_type, rule_key, and rule_value are required.'}), 400

    rule = BrandRule(
        organization_id=g.organization_id,
        rule_type=rule_type,
        rule_key=rule_key,
        rule_value=rule_value,
        description=data.get('description', ''),
        severity=data.get('severity', 'high'),
        is_active=data.get('is_active', True)
    )
    db.session.add(rule)
    db.session.commit()
    return jsonify({'message': 'Brand rule created successfully.', 'rule': rule.to_dict()}), 201

@brands_bp.route('/rules/<int:rule_id>', methods=['PUT', 'DELETE'])
@login_required
@roles_required('ADMIN')
def manage_rule(rule_id):
    rule = BrandRule.query.filter_by(id=rule_id, organization_id=g.organization_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404

    if request.method == 'DELETE':
        db.session.delete(rule)
        db.session.commit()
        return jsonify({'message': 'Rule deleted successfully.'})

    data = request.get_json(silent=True) or {}
    rule.rule_key = data.get('rule_key', rule.rule_key)
    rule.rule_value = data.get('rule_value', rule.rule_value)
    rule.description = data.get('description', rule.description)
    rule.severity = data.get('severity', rule.severity)
    if 'is_active' in data:
        rule.is_active = data['is_active']

    db.session.commit()
    return jsonify({'message': 'Rule updated.', 'rule': rule.to_dict()})

# ==================== BRAND ASSETS (LOGOS, BADGES) ====================

@brands_bp.route('/assets', methods=['GET'])
@login_required
def get_assets():
    assets = BrandAsset.query.filter_by(
        organization_id=g.organization_id
    ).order_by(BrandAsset.created_at.desc()).all()
    return jsonify({'assets': [a.to_dict() for a in assets]})

@brands_bp.route('/assets', methods=['POST'])
@login_required
@roles_required('ADMIN')
def upload_asset():
    name = request.form.get('name', 'Brand Logo')
    asset_type = request.form.get('asset_type', 'logo')
    version = request.form.get('version', 'v1.0')
    is_active = request.form.get('is_active', 'true').lower() == 'true'

    if 'file' not in request.files:
        return jsonify({'error': 'No asset file provided.'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No selected file.'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ['png', 'jpg', 'jpeg', 'svg']:
        return jsonify({'error': 'Unsupported file format for brand asset. Use PNG, JPG, or SVG.'}), 400

    unique_fname = f"asset_{uuid.uuid4().hex[:8]}_{secure_filename(file.filename)}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_fname)
    file.save(save_path)

    # Extract dominant colors from logo asset
    dominant_colors = DocumentProcessor.extract_dominant_colors(save_path, max_colors=3)
    meta = {'colors': dominant_colors, 'extension': ext}

    # If this asset is set to active and is a logo, optionally set others of same name to inactive
    asset = BrandAsset(
        organization_id=g.organization_id,
        asset_type=asset_type,
        name=name,
        file_path=save_path,
        file_url=f"/uploads/{unique_fname}",
        version=version,
        is_active=is_active,
        metadata_json=json.dumps(meta)
    )
    db.session.add(asset)
    db.session.commit()

    return jsonify({'message': 'Brand asset uploaded successfully.', 'asset': asset.to_dict()}), 201

@brands_bp.route('/assets/<int:asset_id>/toggle-active', methods=['POST'])
@login_required
@roles_required('ADMIN')
def toggle_asset_active(asset_id):
    asset = BrandAsset.query.filter_by(id=asset_id, organization_id=g.organization_id).first()
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404

    asset.is_active = not asset.is_active
    db.session.commit()
    return jsonify({'message': f"Asset marked as {'active' if asset.is_active else 'inactive'}.", 'asset': asset.to_dict()})

@brands_bp.route('/assets/<int:asset_id>', methods=['DELETE'])
@login_required
@roles_required('ADMIN')
def delete_asset(asset_id):
    asset = BrandAsset.query.filter_by(id=asset_id, organization_id=g.organization_id).first()
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404

    db.session.delete(asset)
    db.session.commit()
    return jsonify({'message': 'Brand asset removed.'})

# ==================== PRODUCT INFORMATION ====================

@brands_bp.route('/products', methods=['GET'])
@login_required
def get_products():
    products = ProductInfo.query.filter_by(
        organization_id=g.organization_id
    ).order_by(ProductInfo.created_at.desc()).all()
    return jsonify({'products': [p.to_dict() for p in products]})

@brands_bp.route('/products', methods=['POST'])
@login_required
@roles_required('ADMIN')
def create_product():
    data = request.get_json(silent=True) or {}
    pname = data.get('product_name')
    if not pname:
        return jsonify({'error': 'Product name is required.'}), 400

    product = ProductInfo(
        organization_id=g.organization_id,
        product_name=pname,
        category=data.get('category', 'Core Solution'),
        specifications=data.get('specifications', ''),
        approved_claims=data.get('approved_claims', ''),
        verified_benchmarks=data.get('verified_benchmarks', ''),
        official_sla=data.get('official_sla', ''),
        prohibited_claims=data.get('prohibited_claims', ''),
        source_doc=data.get('source_doc', ''),
        effective_date=data.get('effective_date', '')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'message': 'Product information created.', 'product': product.to_dict()}), 201

@brands_bp.route('/products/<int:product_id>', methods=['PUT', 'DELETE'])
@login_required
@roles_required('ADMIN')
def manage_product(product_id):
    product = ProductInfo.query.filter_by(id=product_id, organization_id=g.organization_id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product information deleted.'})

    data = request.get_json(silent=True) or {}
    from datetime import datetime
    product.product_name = data.get('product_name', product.product_name)
    product.category = data.get('category', product.category)
    product.specifications = data.get('specifications', product.specifications)
    product.approved_claims = data.get('approved_claims', product.approved_claims)
    product.verified_benchmarks = data.get('verified_benchmarks', product.verified_benchmarks)
    product.official_sla = data.get('official_sla', product.official_sla)
    product.prohibited_claims = data.get('prohibited_claims', product.prohibited_claims)
    product.source_doc = data.get('source_doc', product.source_doc)
    product.effective_date = data.get('effective_date', product.effective_date)
    product.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({'message': 'Product updated.', 'product': product.to_dict()})

# ==================== GUIDELINE DOCUMENTS ====================

@brands_bp.route('/guidelines', methods=['GET'])
@login_required
def get_guidelines():
    guidelines = BrandGuideline.query.filter_by(
        organization_id=g.organization_id
    ).order_by(BrandGuideline.created_at.desc()).all()
    return jsonify({'guidelines': [g.to_dict() for g in guidelines]})

@brands_bp.route('/guidelines', methods=['POST'])
@login_required
@roles_required('ADMIN')
def create_guideline():
    title = request.form.get('title')
    category = request.form.get('category', 'General')
    version = request.form.get('version', '1.0')
    raw_text = request.form.get('raw_text', '')

    if not title:
        return jsonify({'error': 'Title is required for brand guideline.'}), 400

    doc_path = ''
    doc_name = ''
    if 'file' in request.files and request.files['file'].filename:
        file = request.files['file']
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext in ['pdf', 'docx', 'txt']:
            doc_name = secure_filename(file.filename)
            unique_fname = f"guide_{uuid.uuid4().hex[:8]}_{doc_name}"
            doc_path = os.path.join(Config.UPLOAD_FOLDER, unique_fname)
            file.save(doc_path)
            
            # Extract text automatically if raw_text wasn't manually typed
            extracted = DocumentProcessor.extract_text(doc_path, ext)
            if extracted and not raw_text:
                raw_text = extracted

    guide = BrandGuideline(
        organization_id=g.organization_id,
        title=title,
        category=category,
        version=version,
        raw_text=raw_text,
        document_path=doc_path,
        document_name=doc_name
    )
    db.session.add(guide)
    db.session.commit()
    return jsonify({'message': 'Brand guideline created successfully.', 'guideline': guide.to_dict()}), 201

@brands_bp.route('/guidelines/<int:guide_id>', methods=['DELETE'])
@login_required
@roles_required('ADMIN')
def delete_guideline(guide_id):
    guide = BrandGuideline.query.filter_by(id=guide_id, organization_id=g.organization_id).first()
    if not guide:
        return jsonify({'error': 'Guideline not found'}), 404

    db.session.delete(guide)
    db.session.commit()
    return jsonify({'message': 'Guideline removed.'})
