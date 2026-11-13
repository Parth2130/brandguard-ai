from flask import Blueprint, request, jsonify, g
from ..models import db, User, Organization, ActivityLog
from ..middleware.auth_middleware import login_required, generate_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    org_name = data.get('organization_name', '').strip()
    role = data.get('role', 'ADMIN').upper()

    if not email or not password or not full_name:
        return jsonify({'error': 'Email, password, and full name are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 400

    # Find or create organization
    if not org_name:
        org_name = f"{full_name}'s Organization"

    org = Organization.query.filter_by(name=org_name).first()
    if not org:
        org = Organization(name=org_name)
        db.session.add(org)
        db.session.flush()

    user = User(
        organization_id=org.id,
        email=email,
        full_name=full_name,
        role=role if role in ['ADMIN', 'CONTENT_CREATOR', 'BRAND_REVIEWER', 'MARKETING_MANAGER'] else 'ADMIN',
        job_title=data.get('job_title', 'Brand Guardian')
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id, user.role, org.id)
    return jsonify({
        'message': 'Registration successful.',
        'token': token,
        'user': user.to_dict(),
        'organization': org.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Please provide both email and password.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email address or password.'}), 401

    if not user.is_active:
        return jsonify({'error': 'Your account has been deactivated. Please contact your administrator.'}), 403

    token = generate_token(user.id, user.role, user.organization_id)
    return jsonify({
        'message': 'Login successful.',
        'token': token,
        'user': user.to_dict(),
        'organization': user.organization.to_dict() if user.organization else None
    })

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        'user': g.current_user.to_dict(),
        'organization': g.current_user.organization.to_dict() if g.current_user.organization else None
    })

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    return jsonify({'message': 'Logged out successfully.'})
