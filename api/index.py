import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1] / "backend"
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from app import app

# Vercel's Python runtime imports `app` as the WSGI application.
