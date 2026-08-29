import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from sqlalchemy import text, inspect
from app.core.database import SessionLocal, engine

def full_audit():
    db = SessionLocal()
    inspector = inspect(engine)
    table_names = sorted(inspector.get_table_names())
    
    print("=" * 80)
    print("RAIS AGENCIES DATABASE ARCHITECTURE & RECORD INVENTORY")
    print("=" * 80)

    for table in table_names:
        cols = inspector.get_columns(table)
        fks = inspector.get_foreign_keys(table)
        count = db.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
        
        print(f"\nTABLE: {table.upper()} (Total Records: {count})")
        print("  Columns:")
        for c in cols:
            nullable_str = "NULL" if c.get("nullable", True) else "NOT NULL"
            print(f"    - {c['name']:<25} : {str(c['type']):<20} {nullable_str}")
        if fks:
            print("  Foreign Keys:")
            for fk in fks:
                print(f"    - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

    db.close()

if __name__ == "__main__":
    full_audit()
