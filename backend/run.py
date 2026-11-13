import os
import sys

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f" BRANDGUARD AI BACKEND STARTING ON PORT {port}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
