import os
import sys
import threading
import time
from decimal import Decimal
from datetime import date, datetime
import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

# Explicitly target isolated PostgreSQL 18 staging cluster on port 5433
POSTGRES_STAGING_URL = "postgresql://rais_staging_admin@127.0.0.1:5433/rais_staging"

# Safety assertion: Must never contain production Supabase host
assert "supabase" not in POSTGRES_STAGING_URL.lower()

# Configure SQLAlchemy engine targeting isolated PostgreSQL 18
pg_engine = create_engine(
    POSTGRES_STAGING_URL,
    pool_size=15,
    max_overflow=20,
    pool_timeout=30,
    echo=False
)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

import app.models  # Register all models
from app.core.database import Base
from app.models.user import User
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.invoice import Invoice, InvoiceItem
from app.models.order import Order, OrderItem
from app.models.inventory import StockMovement
from app.domain.enums import UserRole, InvoiceStatus, OrderStatus
from app.services.billing_service import BillingService
from app.services.inventory_service import InventoryService
from app.services.order_service import OrderService
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.order import OrderCreate, OrderItemCreate
from app.core.exceptions import InvalidFinancialOperationException

@pytest.fixture(scope="module", autouse=True)
def setup_pg_database():
    """Initializes tables in isolated PostgreSQL 18 database."""
    Base.metadata.create_all(bind=pg_engine)
    
    # Ensure opening_balance column on customers
    with pg_engine.connect() as conn:
        conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00;"))
        conn.commit()

    yield

@pytest.fixture
def pg_db():
    """Yields an isolated PostgreSQL session."""
    db = PgSessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_test_seed(db, initial_stock=Decimal("10.00")):
    """Helper to seed disposable customer and product in PostgreSQL."""
    ts = int(time.time() * 1000)
    
    # Category
    cat = db.query(Category).filter_by(name="Test Frozen Category").first()
    if not cat:
        cat = Category(code=f"CAT-TEST-{ts}", name="Test Frozen Category", description="For PostgreSQL Concurrency Tests")
        db.add(cat)
        db.flush()

    # Customer
    cust = Customer(
        customer_code=f"CPG{ts % 100000000}",
        business_name=f"PG Test Store {ts}",
        contact_person="Tester",
        phone="9999999999",
        address_line1="Main Road, Rayachoty",
        city="Rayachoty"
    )
    db.add(cust)

    # Product with specific stock
    prod = Product(
        sku=f"SKU-PG-{ts}",
        name=f"PG Frozen Nuggets {ts}",
        category_id=cat.id,
        brand="TestBrand",
        packaging_unit="1 KG",
        base_price=Decimal("350.00"),
        current_stock=initial_stock,
        min_stock_alert=Decimal("2.00")
    )
    db.add(prod)
    db.commit()
    db.refresh(cust)
    db.refresh(prod)
    return cust, prod

def test_two_concurrent_orders_competing_for_final_stock():
    """Test 1: Two concurrent threads submit orders competing for final available stock (5 units).
    Expected: Exactly one succeeds; second thread fails hard with InsufficientStockError.
    Zero negative inventory; final stock is exactly 0.00.
    """
    db_init = PgSessionLocal()
    cust, prod = create_test_seed(db_init, initial_stock=Decimal("5.00"))
    prod_id = prod.id
    cust_id = cust.id
    db_init.close()

    results = []
    errors = []

    def worker_submit_order(worker_id):
        worker_db = PgSessionLocal()
        try:
            payload = OrderCreate(
                customer_id=cust_id,
                items=[
                    OrderItemCreate(
                        product_id=prod_id,
                        quantity=Decimal("5.00"),
                        unit_price=Decimal("350.00")
                    )
                ]
            )
            created = OrderService.create_order(worker_db, payload)
            results.append((worker_id, "SUCCESS", created.id))
        except Exception as e:
            worker_db.rollback()
            errors.append((worker_id, "REJECTED", str(e)))
        finally:
            worker_db.close()

    t1 = threading.Thread(target=worker_submit_order, args=(1,))
    t2 = threading.Thread(target=worker_submit_order, args=(2,))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Assertions
    assert len(results) == 1, f"Expected exactly 1 order to succeed, got {len(results)}"
    assert len(errors) == 1, f"Expected exactly 1 order to be rejected, got {len(errors)}"
    assert "insufficient stock" in errors[0][2].lower()

    # Verify final stock in PostgreSQL
    db_check = PgSessionLocal()
    updated_prod = db_check.query(Product).filter_by(id=prod_id).one()
    assert updated_prod.current_stock == Decimal("0.00"), f"Expected stock 0.00, got {updated_prod.current_stock}"
    db_check.close()

def test_concurrent_invoices_competing_for_same_sku():
    """Test 2: 4 concurrent threads each requesting 3 units of an SKU with initial stock = 8 units.
    Total requested: 12 units.
    Expected: Exactly 2 succeed (6 units deducted), 2 fail (remaining 2 < 3).
    Final stock is exactly 2.00 (No clamping, no negative overselling).
    """
    db_init = PgSessionLocal()
    cust, prod = create_test_seed(db_init, initial_stock=Decimal("8.00"))
    prod_id = prod.id
    cust_id = cust.id
    db_init.close()

    successes = []
    rejections = []

    def worker_create_invoice(worker_id):
        worker_db = PgSessionLocal()
        try:
            inv_in = InvoiceCreate(
                customer_id=cust_id,
                items=[
                    InvoiceItemCreate(
                        product_id=prod_id,
                        quantity=Decimal("3.00"),
                        unit_price=Decimal("350.00")
                    )
                ]
            )
            inv = BillingService.create_invoice(worker_db, inv_in, user_id=None)
            successes.append((worker_id, inv.invoice_number))
        except Exception as e:
            worker_db.rollback()
            rejections.append((worker_id, str(e)))
        finally:
            worker_db.close()

    threads = [threading.Thread(target=worker_create_invoice, args=(i,)) for i in range(4)]
    for t in threads: t.start()
    for t in threads: t.join()

    assert len(successes) == 2, f"Expected 2 successful invoices, got {len(successes)}"
    assert len(rejections) == 2, f"Expected 2 rejected invoices, got {len(rejections)}"

    db_check = PgSessionLocal()
    updated_prod = db_check.query(Product).filter_by(id=prod_id).one()
    assert updated_prod.current_stock == Decimal("2.00"), f"Expected stock 2.00, got {updated_prod.current_stock}"
    db_check.close()

def test_duplicate_requests_same_idempotency_key():
    """Test 3: Re-submitting the same idempotency key in PostgreSQL returns existing invoice
    without duplicate stock deduction.
    """
    db = PgSessionLocal()
    cust, prod = create_test_seed(db, initial_stock=Decimal("20.00"))

    idemp_key = f"IDEMP-PG-{int(time.time()*1000)}"

    inv_in = InvoiceCreate(
        customer_id=cust.id,
        idempotency_key=idemp_key,
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("4.00"),
                unit_price=Decimal("350.00")
            )
        ]
    )

    # First submission
    inv1 = BillingService.create_invoice(db, inv_in, user_id=None)
    assert inv1.idempotency_key == idemp_key

    # Check stock decremented by 4 (20 -> 16)
    db.refresh(prod)
    assert prod.current_stock == Decimal("16.00")

    # Second submission with same idempotency key
    inv2 = BillingService.create_invoice(db, inv_in, user_id=None)
    assert inv2.id == inv1.id
    assert inv2.invoice_number == inv1.invoice_number

    # Check stock NOT decremented again (remains 16.00)
    db.refresh(prod)
    assert prod.current_stock == Decimal("16.00")
    db.close()

def test_duplicate_cancellation_and_inventory_restoration():
    """Test 4: Cancelling an invoice restores stock once; repeated cancellation fails."""
    db = PgSessionLocal()
    cust, prod = create_test_seed(db, initial_stock=Decimal("15.00"))

    inv_in = InvoiceCreate(
        customer_id=cust.id,
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("5.00"),
                unit_price=Decimal("350.00")
            )
        ]
    )
    inv = BillingService.create_invoice(db, inv_in, user_id=None)
    db.refresh(prod)
    assert prod.current_stock == Decimal("10.00")

    # First cancellation
    cancelled_inv = BillingService.cancel_or_void_invoice(db, inv.id, InvoiceStatus.CANCELLED.value, reason="Customer cancelled")
    assert cancelled_inv.status == InvoiceStatus.CANCELLED.value
    db.refresh(prod)
    assert prod.current_stock == Decimal("15.00")  # Restored

    # Second cancellation attempt
    with pytest.raises(InvalidFinancialOperationException) as exc:
        BillingService.cancel_or_void_invoice(db, inv.id, InvoiceStatus.CANCELLED.value, reason="Repeated cancellation")
    assert "already cancelled" in str(exc.value).lower()

    # Stock must remain exactly 15.00 (NOT 20.00)
    db.refresh(prod)
    assert prod.current_stock == Decimal("15.00")
    db.close()

def test_multi_item_transaction_rollback_after_injected_failure():
    """Test 5: Multi-item invoice where 2nd item fails due to insufficient stock.
    Verifies that 1st item stock deduction is atomically rolled back in PostgreSQL.
    """
    db = PgSessionLocal()
    cust, prod1 = create_test_seed(db, initial_stock=Decimal("10.00"))
    _, prod2 = create_test_seed(db, initial_stock=Decimal("2.00"))  # Low stock

    inv_in = InvoiceCreate(
        customer_id=cust.id,
        items=[
            InvoiceItemCreate(product_id=prod1.id, quantity=Decimal("4.00"), unit_price=Decimal("100.00")),
            InvoiceItemCreate(product_id=prod2.id, quantity=Decimal("5.00"), unit_price=Decimal("200.00")) # Fails: 5 > 2
        ]
    )

    with pytest.raises(InvalidFinancialOperationException) as exc:
        BillingService.create_invoice(db, inv_in, user_id=None)
    assert "Insufficient stock" in str(exc.value)

    # Rollback verification
    db.refresh(prod1)
    db.refresh(prod2)
    assert prod1.current_stock == Decimal("10.00"), "Prod1 stock deduction was NOT rolled back!"
    assert prod2.current_stock == Decimal("2.00")

    # Check zero StockMovement records created
    movements = db.query(StockMovement).filter(StockMovement.product_id.in_([prod1.id, prod2.id])).all()
    assert len(movements) == 0, f"Expected 0 stock movements after rollback, found {len(movements)}"
    db.close()

def test_insufficient_stock_rejection_no_zero_clamping():
    """Test 6: Order requesting 20 units when stock is 5.
    Must reject with InsufficientStockError and never clamp to zero.
    """
    db = PgSessionLocal()
    cust, prod = create_test_seed(db, initial_stock=Decimal("5.00"))

    payload = OrderCreate(
        customer_id=cust.id,
        items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("20.00"), unit_price=Decimal("100.00"))]
    )

    with pytest.raises(InvalidFinancialOperationException) as exc:
        OrderService.create_order(db, payload)
    assert "Insufficient stock" in str(exc.value)

    db.refresh(prod)
    assert prod.current_stock == Decimal("5.00"), "Stock was clamped or altered on failure!"
    db.close()

def test_price_quantity_discount_validation():
    """Test 7: Net discount cannot exceed subtotal in PostgreSQL."""
    db = PgSessionLocal()
    cust, prod = create_test_seed(db, initial_stock=Decimal("50.00"))

    # Subtotal: 10 * 100 = 1000. Discount = 1500 (excessive)
    inv_in = InvoiceCreate(
        customer_id=cust.id,
        discount_amount=Decimal("1500.00"),
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("10.00"), unit_price=Decimal("100.00"))]
    )

    with pytest.raises(InvalidFinancialOperationException) as exc:
        BillingService.create_invoice(db, inv_in, user_id=None)
    assert "exceed" in str(exc.value).lower()
    db.close()

def test_audit_records_and_stock_movement_consistency():
    """Test 8: Authorized price override and stock movement audit consistency."""
    db = PgSessionLocal()
    cust, prod = create_test_seed(db, initial_stock=Decimal("25.00"))
    prod.base_price = Decimal("300.00")
    db.commit()

    # Negotiated rate 280 (base 300)
    inv_in = InvoiceCreate(
        customer_id=cust.id,
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("5.00"),
                unit_price=Decimal("280.00")
            )
        ]
    )
    inv = BillingService.create_invoice(db, inv_in, user_id=None)

    # Check InvoiceItem
    item = inv.items[0]
    assert item.unit_price == Decimal("280.00")
    assert prod.base_price == Decimal("300.00")

    # Check StockMovement
    movement = db.query(StockMovement).filter_by(reference_number=inv.invoice_number, movement_type="INVOICE_DEDUCTION").one()
    assert movement.quantity_change == Decimal("-5.00")
    assert movement.product_id == prod.id

    db.refresh(prod)
    assert prod.current_stock == Decimal("20.00")
    db.close()
