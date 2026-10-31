import os
import sys
from decimal import Decimal
import pytest
from datetime import date, timedelta

os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.domain.enums import InvoiceStatus
from app.services.product_performance_service import ProductPerformanceService
from app.core.datetime_utils import get_ist_today

@pytest.fixture(scope="module")
def setup_matrix_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Category
    cat = Category(code="SNACKS", name="Snacks & Appetizers", display_order=1, is_active=True)
    db.add(cat)
    db.flush()

    # Product
    p1 = Product(
        sku="TEST-SKU-01",
        category_id=cat.id,
        name="CRISPY POPCORN CHICKEN",
        brand="RAIS",
        packaging_unit="1 KG PACKET",
        base_price=Decimal("300.00"),
        current_stock=Decimal("100.00"),
        is_active=True
    )
    p2 = Product(
        sku="TEST-SKU-02",
        category_id=cat.id,
        name="CRISPY FRENCH FRIES",
        brand="RAIS",
        packaging_unit="2.5 KG PACKET",
        base_price=Decimal("250.00"),
        current_stock=Decimal("50.00"),
        is_active=True
    )
    db.add_all([p1, p2])
    db.flush()

    # Customer
    cust = Customer(
        customer_code="CUST-TEST-01",
        business_name="Fast Bites Rayachoty",
        contact_person="Rafi",
        phone="9876543210",
        address_line1="Main Road",
        city="Rayachoty",
        state="Andhra Pradesh",
        pincode="516269"
    )
    db.add(cust)
    db.flush()

    today = get_ist_today()
    yesterday = today - timedelta(days=1)
    two_weeks_ago = today - timedelta(days=14)

    # Today invoice
    inv_today = Invoice(
        invoice_number="INV-DATE-TODAY",
        customer_id=cust.id,
        status=InvoiceStatus.PAID.value,
        invoice_date=today,
        due_date=today,
        total_amount=Decimal("600.00"),
        paid_amount=Decimal("600.00"),
        outstanding_amount=Decimal("0.00")
    )
    db.add(inv_today)
    db.flush()

    item_today = InvoiceItem(
        invoice_id=inv_today.id,
        product_id=p1.id,
        item_description="CRISPY POPCORN CHICKEN",
        packaging_unit="1 KG PACKET",
        quantity=Decimal("2.00"),
        unit_price=Decimal("300.00"),
        line_total=Decimal("600.00")
    )
    db.add(item_today)

    # Yesterday invoice
    inv_yday = Invoice(
        invoice_number="INV-DATE-YESTERDAY",
        customer_id=cust.id,
        status=InvoiceStatus.PAID.value,
        invoice_date=yesterday,
        due_date=yesterday,
        total_amount=Decimal("500.00"),
        paid_amount=Decimal("500.00"),
        outstanding_amount=Decimal("0.00")
    )
    db.add(inv_yday)
    db.flush()

    item_yday = InvoiceItem(
        invoice_id=inv_yday.id,
        product_id=p2.id,
        item_description="CRISPY FRENCH FRIES",
        packaging_unit="2.5 KG PACKET",
        quantity=Decimal("2.00"),
        unit_price=Decimal("250.00"),
        line_total=Decimal("500.00")
    )
    db.add(item_yday)

    db.commit()
    yield db
    db.close()

def test_product_matrix_today_filter(setup_matrix_db):
    """When filtering by 'today', only today's product sales must be counted."""
    db = setup_matrix_db
    res = ProductPerformanceService.get_product_matrix(db, force_refresh=True, period="today")
    assert res["period"] == "today"
    assert res["period_label"] == "Today"

    today_str = str(get_ist_today())
    assert res["start_date"] == today_str
    assert res["end_date"] == today_str

    item1 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-01"), None)
    item2 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-02"), None)
    assert item1 is not None
    assert item1["units_sold"] == 2.0
    assert item1["revenue"] == 600.0

    # item2 was sold yesterday, so today's units sold must be 0
    assert item2 is not None
    assert item2["units_sold"] == 0.0
    assert item2["revenue"] == 0.0

def test_product_matrix_yesterday_filter(setup_matrix_db):
    """When filtering by 'yesterday', only yesterday's product sales must be counted."""
    db = setup_matrix_db
    res = ProductPerformanceService.get_product_matrix(db, force_refresh=True, period="yesterday")
    assert res["period"] == "yesterday"
    assert res["period_label"] == "Yesterday"

    item1 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-01"), None)
    item2 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-02"), None)
    assert item1["units_sold"] == 0.0
    assert item2["units_sold"] == 2.0
    assert item2["revenue"] == 500.0

def test_product_matrix_custom_date_range(setup_matrix_db):
    """Custom start and end dates must accurately filter within the window."""
    db = setup_matrix_db
    today = get_ist_today()
    yesterday = today - timedelta(days=1)

    # Window including both yesterday and today
    res = ProductPerformanceService.get_product_matrix(
        db, 
        force_refresh=True, 
        period="custom", 
        start_date=yesterday, 
        end_date=today
    )
    assert res["period"] == "custom"
    assert res["start_date"] == str(yesterday)
    assert res["end_date"] == str(today)

    item1 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-01"), None)
    item2 = next((i for i in res["items"] if i["sku"] == "TEST-SKU-02"), None)
    assert item1["units_sold"] == 2.0
    assert item2["units_sold"] == 2.0
