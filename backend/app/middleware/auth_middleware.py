from functools import wraps
import json
import base64
import hmac
import hashlib
import time
from flask import request, jsonify, g
try:
    from config import Config
except ImportError:
    from ..config import Config

from ..models import User

def generate_token(user_id, role, organization_id):
    """Generate a tamper-proof signed auth token."""
    payload = {
        'sub': user_id,
        'role': role,
        'org_id': organization_id,
        'iat': int(time.time()),
        'exp': int(time.time()) + (7 * 24 * 3600) # 7 days
    }
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
    signature = hmac.new(
        Config.SECRET_KEY.encode('utf-8'),
        encoded_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"{encoded_payload}.{signature}"

def verify_token(token_str):
    """Verify signature and expiration of token."""
    try:
        parts = token_str.split('.')
        if len(parts) != 2:
            return None
        encoded_payload, signature = parts
        expected_sig = hmac.new(
            Config.SECRET_KEY.encode('utf-8'),
            encoded_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded_payload.encode('utf-8')).decode('utf-8'))
        if payload.get('exp', 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = ''
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        elif auth_header:
            token = auth_header.strip()

        if not token:
            return jsonify({'error': 'Authentication required. Missing token.'}), 401

        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired authentication token.'}), 401

        user = User.query.get(payload['sub'])
        if not user or not user.is_active:
            return jsonify({'error': 'User account not found or deactivated.'}), 401

        # Store in flask g
        g.current_user = user
        g.organization_id = user.organization_id
        return f(*args, **kwargs)
    return decorated_function

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            if user.role not in allowed_roles:
                return jsonify({
                    'error': f"Access forbidden. Requires one of roles: {', '.join(allowed_roles)}.",
                    'your_role': user.role
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
