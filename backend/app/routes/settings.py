import os
from flask import Blueprint, request, jsonify, g
from ..models import db, Organization
from ..middleware.auth_middleware import login_required, roles_required
from ..services.seed_data import seed_technova_demo
try:
    from config import Config
except ImportError:
    from ..config import Config


settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@login_required
def get_settings():
    org = g.current_user.organization
    return jsonify({
        'organization': org.to_dict() if org else None,
        'ai_configuration': {
            'provider': Config.AI_PROVIDER,
            'model': Config.GEMINI_MODEL,
            'has_gemini_key': bool(Config.GEMINI_API_KEY),
            'has_openai_key': bool(Config.OPENAI_API_KEY)
        }
    })

@settings_bp.route('/ai-config', methods=['POST'])
@login_required
@roles_required('ADMIN')
def update_ai_config():
    data = request.get_json(silent=True) or {}
    gemini_key = data.get('gemini_api_key')
    model = data.get('gemini_model')
    provider = data.get('provider')

    if gemini_key is not None:
        Config.GEMINI_API_KEY = gemini_key.strip()
    if model:
        Config.GEMINI_MODEL = model.strip()
    if provider:
        Config.AI_PROVIDER = provider.strip()

    return jsonify({
        'message': 'AI governance configuration updated.',
        'has_gemini_key': bool(Config.GEMINI_API_KEY),
        'provider': Config.AI_PROVIDER,
        'model': Config.GEMINI_MODEL
    })

@settings_bp.route('/seed-demo', methods=['POST'])
@login_required
@roles_required('ADMIN')
def trigger_seed_demo():
    org = seed_technova_demo()
    return jsonify({
        'message': f"Demo dataset seeded for '{org.name}'.",
        'organization': org.to_dict()
    })

@settings_bp.route('/reset-demo', methods=['POST'])
@login_required
@roles_required('ADMIN')
def reset_demo_data():
    org = Organization.query.filter_by(name='TechNova Solutions').first()
    if org:
        # Delete org and cascade deletes
        db.session.delete(org)
        db.session.commit()

    # Re-seed
    new_org = seed_technova_demo()
    return jsonify({
        'message': 'TechNova demonstration data reset to pristine state.',
        'organization': new_org.to_dict()
    })
