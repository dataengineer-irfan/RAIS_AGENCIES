import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from sqlalchemy import text, inspect
from app.core.database import SessionLocal, engine

def summarize_all():
    db = SessionLocal()
    inspector = inspect(engine)
    tables = sorted(inspector.get_table_names())
    
    print("=" * 80)
    print("ALL 22 DATABASE TABLES & EXACT RECORD COUNTS:")
    print("=" * 80)
    
    for t in tables:
        count = db.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
        print(f"  {t:<32} : {count:5d} records")
        
    db.close()

if __name__ == "__main__":
    summarize_all()
