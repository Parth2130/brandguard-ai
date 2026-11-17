import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
try:
    from config import Config
except ImportError:
    from ..config import Config

from .models import db
from .routes.auth import auth_bp
from .routes.dashboard import dashboard_bp
from .routes.brands import brands_bp
from .routes.content import content_bp
from .routes.analysis import analysis_bp
from .routes.corrections import corrections_bp
from .routes.reviews import reviews_bp
from .routes.analytics import analytics_bp
from .routes.users import users_bp
from .routes.settings import settings_bp
from .routes.claims import claims_bp
from .routes.visual_audit import visual_audit_bp
from .services.seed_data import seed_technova_demo

def apply_schema_migrations(app):
    """Safely apply schema migrations for existing SQLite databases without destroying data."""
    with app.app_context():
        db.create_all()
        from sqlalchemy import text
        try:
            with db.engine.connect() as conn:
                # 1. product_information
                res = conn.execute(text("PRAGMA table_info(product_information)")).fetchall()
                cols = [r[1] for r in res]
                if 'verified_benchmarks' not in cols:
                    conn.execute(text("ALTER TABLE product_information ADD COLUMN verified_benchmarks TEXT DEFAULT ''"))
                if 'official_sla' not in cols:
                    conn.execute(text("ALTER TABLE product_information ADD COLUMN official_sla TEXT DEFAULT ''"))
                if 'prohibited_claims' not in cols:
                    conn.execute(text("ALTER TABLE product_information ADD COLUMN prohibited_claims TEXT DEFAULT ''"))
                if 'updated_at' not in cols:
                    conn.execute(text("ALTER TABLE product_information ADD COLUMN updated_at DATETIME"))

                # 2. review_comments
                res = conn.execute(text("PRAGMA table_info(review_comments)")).fetchall()
                cols = [r[1] for r in res]
                if 'parent_comment_id' not in cols:
                    conn.execute(text("ALTER TABLE review_comments ADD COLUMN parent_comment_id INTEGER"))
                if 'updated_at' not in cols:
                    conn.execute(text("ALTER TABLE review_comments ADD COLUMN updated_at DATETIME"))

                # 3. activity_logs
                res = conn.execute(text("PRAGMA table_info(activity_logs)")).fetchall()
                cols = [r[1] for r in res]
                if 'previous_hash' not in cols:
                    conn.execute(text("ALTER TABLE activity_logs ADD COLUMN previous_hash VARCHAR(64) DEFAULT ''"))
                if 'event_hash' not in cols:
                    conn.execute(text("ALTER TABLE activity_logs ADD COLUMN event_hash VARCHAR(64) DEFAULT ''"))

                # 4. claim_verification_results
                res = conn.execute(text("PRAGMA table_info(claim_verification_results)")).fetchall()
                cols = [r[1] for r in res]
                if 'is_overridden' not in cols:
                    conn.execute(text("ALTER TABLE claim_verification_results ADD COLUMN is_overridden BOOLEAN DEFAULT 0"))
                if 'override_reason' not in cols:
                    conn.execute(text("ALTER TABLE claim_verification_results ADD COLUMN override_reason TEXT DEFAULT ''"))
                if 'overridden_by_id' not in cols:
                    conn.execute(text("ALTER TABLE claim_verification_results ADD COLUMN overridden_by_id INTEGER"))

                conn.commit()
        except Exception as e:
            app.logger.warning(f"Schema migration notice: {e}")

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all frontend routes
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize SQLAlchemy database
    db.init_app(app)

    # Register Blueprints with /api prefix
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(brands_bp, url_prefix='/api/brands')
    app.register_blueprint(content_bp, url_prefix='/api/content')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(corrections_bp, url_prefix='/api/suggestions')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(claims_bp, url_prefix='/api/claims')
    app.register_blueprint(visual_audit_bp, url_prefix='/api/visual-audit')

    # Serve static uploaded files safely
    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'product': 'BrandGuard AI',
            'version': '1.0.0',
            'database': 'connected'
        })

    # Serve compiled React frontend in production
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path.startswith('api/') or path == 'api':
            return jsonify({'error': 'Endpoint not found'}), 404
        if path.startswith('uploads/'):
            return send_from_directory(Config.UPLOAD_FOLDER, path[8:])
        file_path = os.path.join(frontend_dist, path)
        if path != "" and os.path.exists(file_path):
            return send_from_directory(frontend_dist, path)
        if os.path.exists(os.path.join(frontend_dist, 'index.html')):
            return send_from_directory(frontend_dist, 'index.html')
        return jsonify({
            'status': 'healthy',
            'product': 'BrandGuard AI API',
            'message': 'API is running. Build frontend with `npm run build` in /frontend for unified view.'
        })

    # Apply database migrations and seed TechNova demo data
    apply_schema_migrations(app)
    with app.app_context():
        seed_technova_demo()

    return app
