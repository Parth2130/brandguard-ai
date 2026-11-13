import os
import sys

# Ensure current directory and venv site-packages are in sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
venv_site = os.path.join(backend_dir, 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.insert(0, venv_site)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f" BRANDGUARD AI BACKEND STARTING ON PORT {port}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
