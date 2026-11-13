from flask import Blueprint, request, jsonify, g
from ..models import db, User
from ..middleware.auth_middleware import login_required, roles_required

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@login_required
def list_users():
    users = User.query.filter_by(
        organization_id=g.organization_id
    ).order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]})

@users_bp.route('', methods=['POST'])
@login_required
@roles_required('ADMIN')
def create_user():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', 'password123')
    role = data.get('role', 'CONTENT_CREATOR').upper()
    job_title = data.get('job_title', '')

    if not email or not full_name:
        return jsonify({'error': 'Email and full name are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'User with this email already exists.'}), 400

    if role not in ['ADMIN', 'CONTENT_CREATOR', 'BRAND_REVIEWER', 'MARKETING_MANAGER']:
        return jsonify({'error': 'Invalid role.'}), 400

    new_user = User(
        organization_id=g.organization_id,
        email=email,
        full_name=full_name,
        role=role,
        job_title=job_title,
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        'message': f"User '{full_name}' created successfully with role {role}.",
        'user': new_user.to_dict()
    }), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@login_required
@roles_required('ADMIN')
def update_user(user_id):
    user = User.query.filter_by(id=user_id, organization_id=g.organization_id).first()
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    data = request.get_json(silent=True) or {}
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'role' in data and data['role'] in ['ADMIN', 'CONTENT_CREATOR', 'BRAND_REVIEWER', 'MARKETING_MANAGER']:
        user.role = data['role']
    if 'job_title' in data:
        user.job_title = data['job_title']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'User updated successfully.', 'user': user.to_dict()})

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@login_required
@roles_required('ADMIN')
def delete_user(user_id):
    if user_id == g.current_user.id:
        return jsonify({'error': 'You cannot delete your own account.'}), 400

    user = User.query.filter_by(id=user_id, organization_id=g.organization_id).first()
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User removed from organization.'})
