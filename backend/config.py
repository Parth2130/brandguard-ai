import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'brandguard-secret-enterprise-key-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{BASE_DIR / "brandguard.db"}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload settings
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB max limit
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'png', 'jpg', 'jpeg', 'txt'}
    
    # AI API settings
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    AI_PROVIDER = os.environ.get('AI_PROVIDER', 'gemini') # 'gemini', 'openai', or 'built-in'

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
