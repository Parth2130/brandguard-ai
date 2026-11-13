import os
import uuid
import json
from pathlib import Path
from flask import Blueprint, request, jsonify, g, send_from_directory
from werkzeug.utils import secure_filename
from ..models import (
    db, UploadedContent, AnalysisResult, ReviewRequest,
    RevisionHistory, ActivityLog
)
from ..middleware.auth_middleware import login_required
from ..processors.document_processor import DocumentProcessor
try:
    from config import Config
except ImportError:
    from ..config import Config


content_bp = Blueprint('content', __name__)

@content_bp.route('/upload', methods=['POST'])
@login_required
def upload_content():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename.'}), 400

    title = request.form.get('title', '').strip()
    if not title:
        title = file.filename.rsplit('.', 1)[0]

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else ''

    if ext not in Config.ALLOWED_EXTENSIONS:
        return jsonify({'error': f"Unsupported file type '.{ext}'. Supported formats: PDF, DOCX, PNG, JPG, JPEG, TXT."}), 400

    unique_filename = f"{uuid.uuid4().hex[:12]}_{original_name}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
    file.save(save_path)
    file_size = os.path.getsize(save_path)

    # 1. Extract text from document or describe visual
    extracted_text = DocumentProcessor.extract_text(save_path, ext)

    # 2. Extract dominant colors if image
    dominant_colors = []
    if ext in ['png', 'jpg', 'jpeg']:
        dominant_colors = DocumentProcessor.extract_dominant_colors(save_path, max_colors=5)

    content = UploadedContent(
        organization_id=g.organization_id,
        creator_id=g.current_user.id,
        title=title,
        file_name=unique_filename,
        original_name=original_name,
        file_type=ext,
        file_size=file_size,
        file_path=save_path,
        file_url=f"/uploads/{unique_filename}",
        extracted_text=extracted_text,
        current_content=extracted_text,
        dominant_colors_json=json.dumps(dominant_colors),
        status='UPLOADED'
    )
    db.session.add(content)
    db.session.flush()

    # Log initial revision
    rev = RevisionHistory(
        content_id=content.id,
        version_num=1,
        modified_by_id=g.current_user.id,
        revised_text=extracted_text,
        change_summary='Original upload'
    )
    db.session.add(rev)

    # Activity log
    log = ActivityLog(
        organization_id=g.organization_id,
        user_id=g.current_user.id,
        action='UPLOAD_CONTENT',
        target_type='Content',
        target_id=content.id,
        details_json=json.dumps({'title': title, 'filename': original_name, 'size': file_size})
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'File uploaded and pre-processed successfully.',
        'content': content.to_dict()
    }), 201

@content_bp.route('', methods=['GET'])
@login_required
def list_content():
    status_filter = request.args.get('status')
    query = UploadedContent.query.filter_by(organization_id=g.organization_id)
    if status_filter:
        query = query.filter_by(status=status_filter.upper())

    contents = query.order_by(UploadedContent.created_at.desc()).all()
    return jsonify({'contents': [c.to_dict() for c in contents]})

@content_bp.route('/<int:content_id>', methods=['GET'])
@login_required
def get_content_details(content_id):
    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content record not found.'}), 404

    data = content.to_dict()
    data['revisions'] = [r.to_dict() for r in content.revisions]
    return jsonify({'content': data})

@content_bp.route('/<int:content_id>', methods=['DELETE'])
@login_required
def delete_content(content_id):
    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content record not found.'}), 404

    # Remove physical file if exists
    try:
        if os.path.exists(content.file_path):
            os.remove(content.file_path)
    except Exception:
        pass

    db.session.delete(content)
    db.session.commit()
    return jsonify({'message': 'Content and associated analysis records deleted.'})

@content_bp.route('/<int:content_id>/update-text', methods=['PUT'])
@login_required
def update_content_text(content_id):
    content = UploadedContent.query.filter_by(id=content_id, organization_id=g.organization_id).first()
    if not content:
        return jsonify({'error': 'Content record not found.'}), 404

    data = request.get_json(silent=True) or {}
    new_text = data.get('text', '')
    summary = data.get('change_summary', 'Manual text revision')

    content.current_content = new_text
    version_num = len(content.revisions) + 1
    rev = RevisionHistory(
        content_id=content.id,
        version_num=version_num,
        modified_by_id=g.current_user.id,
        revised_text=new_text,
        change_summary=summary
    )
    db.session.add(rev)
    db.session.commit()

    return jsonify({'message': 'Content text updated.', 'content': content.to_dict()})
