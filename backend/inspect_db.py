import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import inspect
from app import engine

inspector = inspect(engine)
print("DATABASE CONNECTION: OK")
print("TABLES:", inspector.get_table_names())
for table in ("invoices", "trips"):
    print(f"\n[{table}]")
    if table not in inspector.get_table_names():
        print("MISSING")
        continue
    for col in inspector.get_columns(table):
        print(f"- {col['name']} | {col['type']} | nullable={col['nullable']}")
    print("Indexes:")
    for idx in inspector.get_indexes(table):
        print(f"- {idx['name']} | unique={idx['unique']} | columns={idx['column_names']}")
    print("Foreign keys:")
    for fk in inspector.get_foreign_keys(table):
        print(f"- {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
