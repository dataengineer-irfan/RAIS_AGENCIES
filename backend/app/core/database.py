import os
import sys
from urllib.parse import urlparse
from sqlalchemy import create_engine, event
from sqlalchemy.pool import NullPool
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

    # If executing on Render cloud infrastructure (not a local test runner)
    is_on_render = os.environ.get("RENDER") in ("true", "1") or bool(os.environ.get("RENDER_SERVICE_ID"))
    if is_on_render and not is_test_runner and normalized_env != "staging":
        normalized_env = "production"

    is_render_prod = is_on_render and normalized_env == "production"

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

# If connecting to Supabase pooler on port 5432 (session mode with 15 client limit) or default port,
# automatically route to port 6543 (transaction mode pooler) to completely eliminate EMAXCONNSESSION
if "pooler.supabase.com" in database_url:
    try:
        from urllib.parse import urlsplit, urlunsplit
        _parts = urlsplit(database_url)
        if _parts.hostname and "pooler.supabase.com" in _parts.hostname:
            if _parts.port == 5432 or _parts.port is None:
                _netloc = _parts.netloc
                if f":{_parts.port}" in _netloc:
                    _netloc = _netloc.replace(f":{_parts.port}", ":6543")
                else:
                    _netloc = f"{_netloc}:6543"
                database_url = urlunsplit((_parts.scheme, _netloc, _parts.path, _parts.query, _parts.fragment))
    except Exception:
        if "pooler.supabase.com:5432" in database_url:
            database_url = database_url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

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
    # Disable psycopg3 prepared statements for Supabase transaction pooler (PgBouncer/Supavisor)
    connect_args = {"prepare_threshold": None}

    # Use NullPool for Supabase pooler: connections are released back to Supavisor immediately on query completion
    # Zero idle connections held, eliminating any risk of hitting the 15-session client limit
    engine = create_engine(
        database_url,
        poolclass=NullPool,
        connect_args=connect_args,
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
