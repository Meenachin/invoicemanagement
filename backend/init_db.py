import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app import engine
from models import Base

print("Connecting to configured PostgreSQL database...")
Base.metadata.create_all(bind=engine)
print("Done. Existing tables/data were not dropped or replaced.")
