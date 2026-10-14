import os
import sys
from urllib.parse import urlparse
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.engine import Engine
from typing import Generator
from app.core.config import settings

def validate_database_safety(url: str, env_name: str) -> None:
    """Fail-closed safety guard: Prohibits non-production environments (or local tests/dev)
    from connecting to the live production database host.
    """
    normalized = (url or "").strip()
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql://", 1)
    if not normalized.startswith("postgresql"):
        return

    try:
        parsed = urlparse(normalized)
        hostname = (parsed.hostname or "").lower()
    except Exception as e:
        raise RuntimeError(f"FATAL: Malformed database URL: {e}")

    # Known production database signatures
    PROD_HOST_PATTERNS = [
        "aws-0-ap-northeast-1.pooler.supabase.com",
        "supabase.co",
        "supabase.com",
        "rais-production"
    ]
    
    is_prod_target = any(p in hostname for p in PROD_HOST_PATTERNS)
    normalized_env = (env_name or "development").strip().lower()
    is_test_runner = "PYTEST_CURRENT_TEST" in os.environ or "pytest" in sys.modules
    is_render_prod = os.environ.get("RENDER") == "true" and normalized_env == "production"

    if is_prod_target:
        if normalized_env in ("development", "staging", "test") or is_test_runner:
            masked_host = hostname[:6] + "..." if len(hostname) > 6 else "***"
            raise RuntimeError(
                f"FATAL ENVIRONMENT SAFETY GUARD: Blocked connection to production database host "
                f"({masked_host}) while running in '{normalized_env}' environment / test runner."
            )
        if not is_render_prod and not os.environ.get("ALLOW_PRODUCTION_DB_LOCAL"):
            masked_host = hostname[:6] + "..." if len(hostname) > 6 else "***"
            raise RuntimeError(
                f"FATAL ENVIRONMENT SAFETY GUARD: Direct connection to production database host "
                f"({masked_host}) is prohibited from local environments without explicit authorization."
            )

# Engine configuration
database_url = (settings.DATABASE_URL or "").strip()
if not database_url:
    database_url = "sqlite:///./rais_agencies.db"

# Enforce fail-closed safety guard
validate_database_safety(database_url, settings.ENVIRONMENT)

connect_args = {}

# Normalize Supabase / Cloud postgresql connection strings
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        echo=False
    )
    
    # Enable SQLite foreign key constraints
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=30,
        pool_recycle=300,
        pool_timeout=20,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
