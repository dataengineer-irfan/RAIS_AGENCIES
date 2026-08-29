import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import engine, Base
import app.models # Register all models

def init_tables():
    print("[DB] Creating v2 Analytics, Intelligence & Hardware tables in Supabase...")
    Base.metadata.create_all(bind=engine)
    print("[DB] SUCCESS: All v2 tables created and synchronized successfully!")

if __name__ == "__main__":
    init_tables()
