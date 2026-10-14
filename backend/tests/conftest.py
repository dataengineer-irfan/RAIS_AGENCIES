import os
import pytest
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

# Ensure tests run strictly against an isolated in-memory test database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "test"

import app.core.config as core_config
core_config.get_settings.cache_clear()

import app.core.database as core_db
from app.core.database import Base
from app.models.user import User
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.models.inventory import StockMovement
from app.domain.enums import UserRole, InvoiceStatus

from sqlalchemy.pool import StaticPool

# Safety Guard: Ensure test engine never touches live database
TEST_DB_URL = "sqlite://"
test_engine = create_engine(
    TEST_DB_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch core_db engine and SessionLocal so any direct imports use isolated test db
core_db.engine = test_engine
core_db.SessionLocal = TestSessionLocal

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes tables for test session and seeds reference catalogue."""
    Base.metadata.create_all(bind=test_engine)
    try:
        from seed_data import seed_database
        seed_database()
    except Exception as e:
        print(f"Test seed note: {e}")
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def db():
    """Function-scoped isolated database session with transaction rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
