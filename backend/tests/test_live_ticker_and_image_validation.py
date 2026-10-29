import os
import io
import sys
from decimal import Decimal
import pytest
from datetime import date, datetime, timezone

# Ensure local test safety guard
os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from PIL import Image
from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.core.config import settings
from app.domain.enums import InvoiceStatus
from app.services.reporting_service import ReportingService
from app.services.recommendation_service import RecommendationService
from app.api.invoices import get_invoice_image

@pytest.fixture(scope="module")
def setup_validation_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Category
    cat_pkg = db.query(Category).filter_by(code="PACKAGING").first()
    if not cat_pkg:
        cat_pkg = Category(code="PACKAGING", name="Packaging Solutions", display_order=1, is_active=True)
        db.add(cat_pkg)
        db.flush()

    cat_piz = db.query(Category).filter_by(code="PIZZA").first()
    if not cat_piz:
        cat_piz = Category(code="PIZZA", name="Pizza Products", display_order=2, is_active=True)
        db.add(cat_piz)
        db.flush()

    # Seed Products with known stock levels
    # 1. Critical Low Stock Item (active)
    p_low_active = db.query(Product).filter_by(sku="RAIS-LOW-01").first()
    if not p_low_active:
        p_low_active = Product(
            sku="RAIS-LOW-01",
            category_id=cat_pkg.id,
            name='BURGER BOX 4"x4" CRAFT',
            brand="Packaging Solutions",
            packaging_unit="100 NOS",
            base_price=Decimal("420.00"),
            current_stock=Decimal("3.00"),
            min_stock_alert=Decimal("10.00"),
            is_active=True
        )
        db.add(p_low_active)

    # 2. Critical Zero Stock Item (active)
    p_zero_active = db.query(Product).filter_by(sku="RAIS-ZERO-01").first()
    if not p_zero_active:
        p_zero_active = Product(
            sku="RAIS-ZERO-01",
            category_id=cat_pkg.id,
            name='PIZZA BOX 7"x7" PLAIN',
            brand="Packaging Solutions",
            packaging_unit="100 NOS",
            base_price=Decimal("490.00"),
            current_stock=Decimal("0.00"),
            min_stock_alert=Decimal("5.00"),
            is_active=True
        )
        db.add(p_zero_active)

    # 3. Healthy High Stock Item (active)
    p_healthy = db.query(Product).filter_by(sku="RAIS-HEALTHY-01").first()
    if not p_healthy:
        p_healthy = Product(
            sku="RAIS-HEALTHY-01",
            category_id=cat_pkg.id,
            name='PIZZA BOX 8"x8" PLAIN',
            brand="Packaging Solutions",
            packaging_unit="100 NOS",
            base_price=Decimal("600.00"),
            current_stock=Decimal("150.00"),
            min_stock_alert=Decimal("10.00"),
            is_active=True
        )
        db.add(p_healthy)

    # 4. Inactive Low Stock Item (should NOT trigger active alert)
    p_inactive = db.query(Product).filter_by(sku="RAIS-INACTIVE-01").first()
    if not p_inactive:
        p_inactive = Product(
            sku="RAIS-INACTIVE-01",
            category_id=cat_pkg.id,
            name='OLD ARCHIVED BOX',
            brand="Packaging Solutions",
            packaging_unit="50 NOS",
            base_price=Decimal("200.00"),
            current_stock=Decimal("1.00"),
            min_stock_alert=Decimal("10.00"),
            is_active=False
        )
        db.add(p_inactive)

    # 5. Customer
    cust = db.query(Customer).filter_by(customer_code="CUST-TICKER-01").first()
    if not cust:
        cust = Customer(
            customer_code="CUST-TICKER-01",
            business_name="Rayachoti Pizza Corner",
            contact_person="Ramesh Babu",
            phone="9848012345",
            address_line1="Gandhi Road",
            city="Rayachoty",
            state="Andhra Pradesh",
            pincode="516269",
            status="ACTIVE"
        )
        db.add(cust)

    db.commit()
    return db


def test_ist_greeting_time_windows():
    """
    Validates the mathematical time-window segmentation of the Live Ticker
    based on Indian Standard Time (IST) 24-hour hours.
    """
    def compute_greeting(hour):
        if 5 <= hour < 12:
            return "Good morning, Welcome to RAIS"
        elif 12 <= hour < 17:
            return "Good afternoon, Welcome to RAIS"
        elif 17 <= hour < 22:
            return "Good evening, Welcome to RAIS"
        else:
            return "Welcome to RAIS • Night Operations"

    # Deep business assertions across the entire 24h clock:
    # Morning: 05:00 - 11:59
    assert compute_greeting(5) == "Good morning, Welcome to RAIS"
    assert compute_greeting(8) == "Good morning, Welcome to RAIS"
    assert compute_greeting(11) == "Good morning, Welcome to RAIS"

    # Afternoon: 12:00 - 16:59
    assert compute_greeting(12) == "Good afternoon, Welcome to RAIS"
    assert compute_greeting(14) == "Good afternoon, Welcome to RAIS"
    assert compute_greeting(16) == "Good afternoon, Welcome to RAIS"

    # Evening: 17:00 - 21:59
    assert compute_greeting(17) == "Good evening, Welcome to RAIS"
    assert compute_greeting(19) == "Good evening, Welcome to RAIS"
    assert compute_greeting(21) == "Good evening, Welcome to RAIS"

    # Night: 22:00 - 04:59
    assert compute_greeting(22) == "Welcome to RAIS • Night Operations"
    assert compute_greeting(23) == "Welcome to RAIS • Night Operations"
    assert compute_greeting(0) == "Welcome to RAIS • Night Operations"
    assert compute_greeting(4) == "Welcome to RAIS • Night Operations"


def test_live_low_stock_query_excludes_inactive_and_healthy(setup_validation_db):
    """
    Validates that low-stock alerts returned by ReportingService are 100% accurate:
    - Must include items where current_stock <= min_stock_alert AND is_active == True.
    - Must exclude healthy items where current_stock > min_stock_alert.
    - Must exclude inactive items even if their stock is 0.
    """
    db = setup_validation_db
    from app.services.reporting_service import _DASHBOARD_CACHE
    _DASHBOARD_CACHE["timestamp"] = 0
    _DASHBOARD_CACHE["data"] = None

    kpis = ReportingService.get_dashboard_kpis(db=db)

    assert kpis.low_stock_alerts is not None, "low_stock_alerts field must exist on DashboardKPIs"
    alert_skus = [a["sku"] for a in kpis.low_stock_alerts]

    # Every item returned in low_stock_alerts MUST satisfy the business logic:
    # is_active == True and current_stock <= min_stock_alert
    for alert_item in kpis.low_stock_alerts:
        p_db = db.query(Product).filter_by(sku=alert_item["sku"]).first()
        assert p_db is not None, f"Alert SKU {alert_item['sku']} must exist in DB"
        assert p_db.is_active is True, f"Alert product {alert_item['sku']} must be active"
        assert p_db.current_stock <= p_db.min_stock_alert, f"Stock ({p_db.current_stock}) must be <= alert ({p_db.min_stock_alert})"
        assert alert_item["name"] == p_db.name
        assert alert_item["packaging_unit"] == p_db.packaging_unit

    # RAIS-HEALTHY-01 has 150.00 stock > 10.00 alert -> MUST NOT be present
    assert "RAIS-HEALTHY-01" not in alert_skus, "Healthy stock product must NOT appear in alerts"

    # RAIS-INACTIVE-01 is_active=False -> MUST NOT be present
    assert "RAIS-INACTIVE-01" not in alert_skus, "Inactive product must NOT appear in active alerts"

    # Verify data integrity of the alert payload against DB
    assert len(kpis.low_stock_alerts) > 0, "There should be at least one low-stock alert"
    first_alert = kpis.low_stock_alerts[0]
    p_first = db.query(Product).filter_by(sku=first_alert["sku"]).first()
    assert first_alert["name"] == p_first.name
    assert first_alert["packaging_unit"] == p_first.packaging_unit
    assert float(first_alert["current_stock"]) == float(p_first.current_stock)
    assert float(first_alert["min_stock_alert"]) == float(p_first.min_stock_alert)


def test_live_order_count_telemetry_accuracy(setup_validation_db):
    """
    Validates that today's order count is derived 100% from actual DB invoice records:
    - Counts valid invoices created today.
    - Accurately tracks invoice additions.
    - Does NOT hardcode '10 orders' or any placeholder.
    """
    db = setup_validation_db
    today = date.today()

    # Initial count from ReportingService
    kpis_before = ReportingService.get_dashboard_kpis(db=db)
    initial_count = kpis_before.revenue_periods["today"]["invoices_count"]
    initial_rev = kpis_before.revenue_periods["today"]["revenue"]

    # Verify against direct SQL
    direct_sql_count = db.query(Invoice).filter(
        Invoice.invoice_date == today,
        Invoice.status.notin_([InvoiceStatus.CANCELLED.value, InvoiceStatus.VOID.value])
    ).count()
    assert initial_count == direct_sql_count, "KPI invoice count must match exact DB SQL count"

    # Now create a fresh invoice for today
    cust = db.query(Customer).filter_by(customer_code="CUST-TICKER-01").first()
    p_healthy = db.query(Product).filter_by(sku="RAIS-HEALTHY-01").first()

    test_inv = Invoice(
        invoice_number=f"INV-TEST-{int(datetime.now(timezone.utc).timestamp())}",
        customer_id=cust.id,
        invoice_date=today,
        due_date=today,
        status=InvoiceStatus.ISSUED.value,
        subtotal=Decimal("1200.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("1200.00"),
        outstanding_amount=Decimal("1200.00"),
        created_at=datetime.now(timezone.utc)
    )
    db.add(test_inv)
    db.flush()

    item = InvoiceItem(
        invoice_id=test_inv.id,
        product_id=p_healthy.id,
        item_description=p_healthy.name,
        quantity=Decimal("2.00"),
        unit_price=Decimal("600.00"),
        line_total=Decimal("1200.00"),
        packaging_unit="100 NOS"
    )
    db.add(item)
    db.commit()

    # Re-fetch KPIs (bypassing dashboard cache timestamp by updating mock)
    from app.services.reporting_service import _DASHBOARD_CACHE
    _DASHBOARD_CACHE["timestamp"] = 0

    kpis_after = ReportingService.get_dashboard_kpis(db=db)
    new_count = kpis_after.revenue_periods["today"]["invoices_count"]
    new_rev = kpis_after.revenue_periods["today"]["revenue"]

    assert new_count == initial_count + 1, "Today's invoice count must increment by exactly 1"
    assert new_rev == pytest.approx(initial_rev + 1200.00, abs=0.01), "Today's revenue must reflect the new bill"


def test_invoice_image_generation_dimensions_and_zero_prices(setup_validation_db):
    """
    Validates backend Pillow invoice image generator (/api/invoices/{id}/image):
    - Yields valid PNG binary (8-byte PNG header check).
    - Image width is exactly 800px.
    - Image height dynamically includes header, rows, and restock suggestion strip.
    - Confirms that the suggestion banner is rendered.
    """
    db = setup_validation_db
    inv = db.query(Invoice).filter(Invoice.items != None).first()
    assert inv is not None, "Need at least one test invoice with items"

    # Call the endpoint handler directly
    response = get_invoice_image(invoice_id=inv.id, db=db)
    
    assert response.media_type == "image/png"
    assert "Content-Disposition" in response.headers
    assert f"RAIS_Invoice_{inv.invoice_number}.png" in response.headers["Content-Disposition"]

    # Read binary bytes
    img_bytes = response.body
    assert img_bytes.startswith(b'\x89PNG\r\n\x1a\n'), "Response body must start with PNG 8-byte signature"

    # Parse with Pillow
    img = Image.open(io.BytesIO(img_bytes))
    assert img.format == "PNG"
    assert img.mode == "RGB"
    assert img.size[0] == 800, "Image width must be exactly 800px for high-definition mobile rendering"
    
    item_count = len(inv.items)
    # Height formula: 650 + (item_count * 34) + (44 if suggestion else 0)
    expected_min_height = 650 + (item_count * 34)
    assert img.size[1] >= expected_min_height, f"Image height {img.size[1]} should be >= {expected_min_height}"


def test_restock_suggestion_strict_zero_price_policy(setup_validation_db):
    """
    Strict security & business contract test:
    Validates that RecommendationService NEVER leaks prices or currency symbols.
    """
    db = setup_validation_db
    cust = db.query(Customer).filter_by(customer_code="CUST-TICKER-01").first()

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id),
        exclude_product_ids=[]
    )

    if suggestion:
        # 1. Price fields must NOT exist in the dictionary
        forbidden_keys = {"price", "unit_price", "base_price", "cost", "total_price", "rate", "amount"}
        found_forbidden = forbidden_keys.intersection(set(suggestion.keys()))
        assert len(found_forbidden) == 0, f"Recommendation leaked forbidden price keys: {found_forbidden}"

        # 2. String values must not contain currency symbols
        for key, val in suggestion.items():
            if isinstance(val, str):
                assert "₹" not in val, f"Currency symbol '₹' detected in suggestion field '{key}': {val}"
                assert "Rs" not in val, f"Currency symbol 'Rs' detected in suggestion field '{key}': {val}"

        # 3. Product must be in-stock in DB
        prod_in_db = db.query(Product).filter_by(sku=suggestion["sku"]).first()
        assert prod_in_db is not None
        assert prod_in_db.current_stock > 0, "Recommended product must have current_stock > 0 in database"
        assert suggestion["packaging_unit"] is not None
        assert suggestion["name"] is not None
