from datetime import datetime
import json
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Organization(db.Model):
    __tablename__ = 'organizations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    description = db.Column(db.Text, default='')
    industry = db.Column(db.String(80), default='Technology')
    website = db.Column(db.String(150), default='')
    contact_email = db.Column(db.String(120), default='')
    is_demo = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', backref='organization', lazy=True, cascade='all, delete-orphan')
    guidelines = db.relationship('BrandGuideline', backref='organization', lazy=True, cascade='all, delete-orphan')
    assets = db.relationship('BrandAsset', backref='organization', lazy=True, cascade='all, delete-orphan')
    rules = db.relationship('BrandRule', backref='organization', lazy=True, cascade='all, delete-orphan')
    products = db.relationship('ProductInfo', backref='organization', lazy=True, cascade='all, delete-orphan')
    contents = db.relationship('UploadedContent', backref='organization', lazy=True, cascade='all, delete-orphan')
    activity_logs = db.relationship('ActivityLog', backref='organization', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'industry': self.industry,
            'website': self.website,
            'contact_email': self.contact_email,
            'is_demo': self.is_demo,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(30), default='CONTENT_CREATOR') # ADMIN, CONTENT_CREATOR, BRAND_REVIEWER, MARKETING_MANAGER
    job_title = db.Column(db.String(100), default='')
    avatar_url = db.Column(db.String(255), default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'organization_name': self.organization.name if self.organization else None,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'job_title': self.job_title,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class BrandGuideline(db.Model):
    __tablename__ = 'brand_guidelines'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), default='General') # Visual, Editorial, Legal, Voice
    version = db.Column(db.String(20), default='1.0')
    status = db.Column(db.String(30), default='Active') # Active, Draft, Archived
    raw_text = db.Column(db.Text, default='')
    document_path = db.Column(db.String(255), default='')
    document_name = db.Column(db.String(150), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'title': self.title,
            'category': self.category,
            'version': self.version,
            'status': self.status,
            'raw_text': self.raw_text,
            'document_path': self.document_path,
            'document_name': self.document_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BrandAsset(db.Model):
    __tablename__ = 'brand_assets'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    asset_type = db.Column(db.String(40), default='logo') # logo, icon, badge, banner
    name = db.Column(db.String(120), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(255), default='')
    version = db.Column(db.String(20), default='v1.0')
    is_active = db.Column(db.Boolean, default=True)
    metadata_json = db.Column(db.Text, default='{}') # colors, dimensions, format
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            meta = json.loads(self.metadata_json) if self.metadata_json else {}
        except Exception:
            meta = {}
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'asset_type': self.asset_type,
            'name': self.name,
            'file_path': self.file_path,
            'file_url': self.file_url,
            'version': self.version,
            'is_active': self.is_active,
            'metadata': meta,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class BrandRule(db.Model):
    __tablename__ = 'brand_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    rule_type = db.Column(db.String(40), nullable=False) # color, typography, tone, terminology
    rule_key = db.Column(db.String(100), nullable=False) # e.g., primary_hex, approved_tone, forbidden_term
    rule_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, default='')
    severity = db.Column(db.String(20), default='high') # critical, high, medium, low
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'rule_type': self.rule_type,
            'rule_key': self.rule_key,
            'rule_value': self.rule_value,
            'description': self.description,
            'severity': self.severity,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ProductInfo(db.Model):
    __tablename__ = 'product_information'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    product_name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), default='Core Product')
    specifications = db.Column(db.Text, default='')
    approved_claims = db.Column(db.Text, default='') # verified marketing claim statements
    source_doc = db.Column(db.String(150), default='')
    effective_date = db.Column(db.String(50), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'product_name': self.product_name,
            'category': self.category,
            'specifications': self.specifications,
            'approved_claims': self.approved_claims,
            'source_doc': self.source_doc,
            'effective_date': self.effective_date,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UploadedContent(db.Model):
    __tablename__ = 'uploaded_content'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(180), default='Untitled Content')
    file_name = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False) # pdf, docx, png, jpg, jpeg, txt
    file_size = db.Column(db.Integer, default=0) # in bytes
    file_path = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(255), default='')
    extracted_text = db.Column(db.Text, default='')
    current_content = db.Column(db.Text, default='') # revised or edited text
    dominant_colors_json = db.Column(db.Text, default='[]')
    status = db.Column(db.String(40), default='UPLOADED')
    # UPLOADED, ANALYZING, ANALYZED, PENDING_REVIEW, APPROVED, REJECTED, REVISION_REQUESTED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship('User', backref='uploaded_contents')
    analysis_results = db.relationship('AnalysisResult', backref='content', lazy=True, cascade='all, delete-orphan')
    review_requests = db.relationship('ReviewRequest', backref='content', lazy=True, cascade='all, delete-orphan')
    revisions = db.relationship('RevisionHistory', backref='content', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        try:
            colors = json.loads(self.dominant_colors_json) if self.dominant_colors_json else []
        except Exception:
            colors = []
        latest_analysis = self.analysis_results[-1].to_dict() if self.analysis_results else None
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'creator_id': self.creator_id,
            'creator_name': self.creator.full_name if self.creator else None,
            'title': self.title,
            'file_name': self.file_name,
            'original_name': self.original_name,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'file_url': self.file_url,
            'extracted_text': self.extracted_text,
            'current_content': self.current_content or self.extracted_text,
            'dominant_colors': colors,
            'status': self.status,
            'latest_analysis': latest_analysis,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class AnalysisResult(db.Model):
    __tablename__ = 'analysis_results'
    
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('uploaded_content.id'), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    summary = db.Column(db.Text, default='')
    compliance_score = db.Column(db.Integer, default=100) # 0 to 100
    overall_status = db.Column(db.String(40), default='needs_review') # compliant, needs_review, high_risk
    analysis_categories_json = db.Column(db.Text, default='{}')
    recommendations_json = db.Column(db.Text, default='[]')
    raw_response_json = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    issues = db.relationship('DetectedIssue', backref='analysis', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        try:
            cats = json.loads(self.analysis_categories_json) if self.analysis_categories_json else {}
        except Exception:
            cats = {}
        try:
            recs = json.loads(self.recommendations_json) if self.recommendations_json else []
        except Exception:
            recs = []
        return {
            'id': self.id,
            'content_id': self.content_id,
            'organization_id': self.organization_id,
            'summary': self.summary,
            'compliance_score': self.compliance_score,
            'overall_status': self.overall_status,
            'analysis_categories': cats,
            'recommendations': recs,
            'issues': [issue.to_dict() for issue in self.issues],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class DetectedIssue(db.Model):
    __tablename__ = 'detected_issues'
    
    id = db.Column(db.Integer, primary_key=True)
    analysis_id = db.Column(db.Integer, db.ForeignKey('analysis_results.id'), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    category = db.Column(db.String(50), nullable=False) # visual, color, claim, tone, terminology, accessibility
    severity = db.Column(db.String(30), nullable=False) # critical, high, medium, low
    description = db.Column(db.Text, nullable=False)
    evidence = db.Column(db.Text, default='')
    guideline_reference = db.Column(db.String(255), default='')
    suggestion = db.Column(db.Text, default='')
    confidence = db.Column(db.Float, default=0.9)
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    suggestions = db.relationship('CorrectionSuggestion', backref='issue', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'analysis_id': self.analysis_id,
            'title': self.title,
            'category': self.category,
            'severity': self.severity,
            'description': self.description,
            'evidence': self.evidence,
            'guideline_reference': self.guideline_reference,
            'suggestion': self.suggestion,
            'confidence': round(self.confidence, 2) if self.confidence else 0.9,
            'is_resolved': self.is_resolved,
            'correction_suggestion': self.suggestions[0].to_dict() if self.suggestions else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CorrectionSuggestion(db.Model):
    __tablename__ = 'correction_suggestions'
    
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('detected_issues.id'), nullable=True)
    content_id = db.Column(db.Integer, db.ForeignKey('uploaded_content.id'), nullable=False)
    original_text = db.Column(db.Text, default='')
    suggested_text = db.Column(db.Text, default='')
    category = db.Column(db.String(50), default='content')
    status = db.Column(db.String(30), default='pending') # pending, accepted, rejected, edited
    user_edited_text = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'content_id': self.content_id,
            'original_text': self.original_text,
            'suggested_text': self.suggested_text,
            'category': self.category,
            'status': self.status,
            'user_edited_text': self.user_edited_text,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ReviewRequest(db.Model):
    __tablename__ = 'review_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('uploaded_content.id'), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(40), default='PENDING_REVIEW') # PENDING_REVIEW, APPROVED, REJECTED, REVISION_REQUESTED
    decision = db.Column(db.String(40), default='PENDING')
    reviewer_notes = db.Column(db.Text, default='')
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    requester = db.relationship('User', foreign_keys=[requester_id], backref='submitted_reviews')
    reviewer = db.relationship('User', foreign_keys=[reviewer_id], backref='conducted_reviews')
    comments = db.relationship('ReviewComment', backref='review', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'content_id': self.content_id,
            'content_title': self.content.title if self.content else '',
            'content_file_type': self.content.file_type if self.content else '',
            'organization_id': self.organization_id,
            'requester_id': self.requester_id,
            'requester_name': self.requester.full_name if self.requester else 'Creator',
            'reviewer_id': self.reviewer_id,
            'reviewer_name': self.reviewer.full_name if self.reviewer else None,
            'status': self.status,
            'decision': self.decision,
            'reviewer_notes': self.reviewer_notes,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'comments': [c.to_dict() for c in self.comments]
        }


class ReviewComment(db.Model):
    __tablename__ = 'review_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('review_requests.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('uploaded_content.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship('User', backref='comments')

    def to_dict(self):
        return {
            'id': self.id,
            'review_id': self.review_id,
            'content_id': self.content_id,
            'user_id': self.user_id,
            'user_name': self.author.full_name if self.author else 'User',
            'user_role': self.author.role if self.author else '',
            'comment_text': self.comment_text,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class RevisionHistory(db.Model):
    __tablename__ = 'revision_history'
    
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('uploaded_content.id'), nullable=False)
    version_num = db.Column(db.Integer, default=1)
    modified_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    revised_text = db.Column(db.Text, default='')
    change_summary = db.Column(db.String(255), default='Applied smart corrections')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    modifier = db.relationship('User', backref='revisions')

    def to_dict(self):
        return {
            'id': self.id,
            'content_id': self.content_id,
            'version_num': self.version_num,
            'modified_by_id': self.modified_by_id,
            'modifier_name': self.modifier.full_name if self.modifier else 'User',
            'revised_text': self.revised_text,
            'change_summary': self.change_summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(80), nullable=False) # e.g. UPLOAD_CONTENT, RUN_ANALYSIS, APPROVE_CONTENT
    target_type = db.Column(db.String(50), default='')
    target_id = db.Column(db.Integer, nullable=True)
    details_json = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='activities')

    def to_dict(self):
        try:
            details = json.loads(self.details_json) if self.details_json else {}
        except Exception:
            details = {}
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'System',
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
