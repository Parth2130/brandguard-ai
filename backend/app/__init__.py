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
from .services.seed_data import seed_technova_demo

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


    # Create tables and auto-seed demo data if clean database
    with app.app_context():
        db.create_all()
        # Seed TechNova demo data if empty
        seed_technova_demo()

    return app
