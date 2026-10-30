import os
import sys
from decimal import Decimal
import pytest
from datetime import date, timedelta

# Ensure local test safety guard
os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.domain.enums import InvoiceStatus
from app.services.recommendation_service import RecommendationService

@pytest.fixture(scope="module")
def setup_radar_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Categories
    def get_or_create_cat(code, name, order):
        c = db.query(Category).filter_by(code=code).first()
        if not c:
            c = Category(code=code, name=name, display_order=order, is_active=True)
            db.add(c)
            db.flush()
        return c

    cat_pkg = get_or_create_cat("PACKAGING", "Pizza & Burger Boxes", 1)
    cat_sau = get_or_create_cat("SAUCES", "Sauces & Dips", 2)
    cat_brd = get_or_create_cat("BREADING", "Seasonings & Powders", 3)
    cat_veg = get_or_create_cat("VEG", "Veg Items", 4)
    cat_chk = get_or_create_cat("CHICKEN", "Chicken Items", 5)
    cat_chs = get_or_create_cat("CHEESE", "Cheese & Slices", 6)
    cat_moj = get_or_create_cat("MOJITOS", "Mojitos & Syrups", 7)

    # Create Core Trigger Products
    def create_prod(sku, cat_id, name, brand, pack, price, stock=50):
        p = db.query(Product).filter_by(sku=sku).first()
        if not p:
            p = Product(
                sku=sku,
                category_id=cat_id,
                name=name,
                brand=brand,
                packaging_unit=pack,
                base_price=Decimal(str(price)),
                current_stock=Decimal(str(stock)),
                is_active=True
            )
            db.add(p)
            db.flush()
        return p

    p_brd = create_prod("RAIS-BRD-01", cat_brd.id, "VKL EXTRA H & S MARINADE", "VKL", "1 KG PACKET", 370)
    p_pop = create_prod("RAIS-CHK-03", cat_chk.id, "NUTRICH CHICKEN POPCORN BALL", "Nutrich", "1 KG PACKET", 330)
    p_tor = create_prod("RAIS-CHK-01", cat_chk.id, "SIGNATURE TORTILLAH 8 INCHES FROZEN", "Signature", "1 PACKET", 85)
    p_mayo = create_prod("RAIS-SAU-04", cat_sau.id, "DELMONT TANDOORI MAYO", "Del Monte", "1 KG PACKET", 285)
    p_moj = create_prod("RAIS-MOJ-01", cat_moj.id, "LIME AND MINT", "RAIS Beverages", "1 BOTTLE", 360)
    p_patty = create_prod("RAIS-CHK-06", cat_chk.id, "NUTRICH CHICKEN BURGER PATTY", "Nutrich", "1 KG PACKET", 325)
    p_moz = create_prod("RAIS-CHS-01", cat_chs.id, "MILKY MIST MOZEROLLA DICED CHEESE (2KG)", "Milky Mist", "2 KG PACKET", 920)

    # Customers in Rayalaseema Corridor
    cust_afc = Customer(
        customer_code="CUST-AFC-01",
        business_name="AFC Rayachoty Express",
        contact_person="Rafi",
        phone="9876543210",
        address_line1="Madina Masjid Road",
        city="Rayachoty",
        state="Andhra Pradesh",
        pincode="516269"
    )
    cust_mandi = Customer(
        customer_code="CUST-MND-01",
        business_name="Bait Al Arabian Mandi",
        contact_person="Imran",
        phone="9876543211",
        address_line1="Kadapa Bypass Road",
        city="Rayachoty",
        state="Andhra Pradesh",
        pincode="516269"
    )
    cust_cafe = Customer(
        customer_code="CUST-CAF-01",
        business_name="Madanapalle Coffee & Mojito Bar",
        contact_person="Kiran",
        phone="9876543212",
        address_line1="Bypass Junction",
        city="Madanapalle",
        state="Andhra Pradesh",
        pincode="517325"
    )
    db.add_all([cust_afc, cust_mandi, cust_cafe])
    db.flush()

    # Trailing 60 days Invoices with line items
    today = date.today()
    inv1 = Invoice(
        invoice_number="INV-RADAR-001",
        customer_id=cust_afc.id,
        status=InvoiceStatus.PAID.value,
        invoice_date=today - timedelta(days=10),
        due_date=today + timedelta(days=5),
        total_amount=Decimal("7000.00"),
        paid_amount=Decimal("7000.00"),
        outstanding_amount=Decimal("0.00")
    )
    db.add(inv1)
    db.flush()

    item1 = InvoiceItem(
        invoice_id=inv1.id,
        product_id=p_brd.id,
        item_description="VKL EXTRA H & S MARINADE",
        packaging_unit="1 KG PACKET",
        quantity=Decimal("15.00"),
        unit_price=Decimal("370.00"),
        line_total=Decimal("5550.00")
    )
    item2 = InvoiceItem(
        invoice_id=inv1.id,
        product_id=p_pop.id,
        item_description="NUTRICH CHICKEN POPCORN BALL",
        packaging_unit="1 KG PACKET",
        quantity=Decimal("10.00"),
        unit_price=Decimal("330.00"),
        line_total=Decimal("3300.00")
    )
    db.add_all([item1, item2])

    inv2 = Invoice(
        invoice_number="INV-RADAR-002",
        customer_id=cust_mandi.id,
        status=InvoiceStatus.ISSUED.value,
        invoice_date=today - timedelta(days=15),
        due_date=today + timedelta(days=5),
        total_amount=Decimal("4500.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("4500.00")
    )
    db.add(inv2)
    db.flush()

    item3 = InvoiceItem(
        invoice_id=inv2.id,
        product_id=p_tor.id,
        item_description="SIGNATURE TORTILLAH 8 INCHES FROZEN",
        packaging_unit="1 PACKET",
        quantity=Decimal("30.00"),
        unit_price=Decimal("85.00"),
        line_total=Decimal("2550.00")
    )
    item4 = InvoiceItem(
        invoice_id=inv2.id,
        product_id=p_mayo.id,
        item_description="DELMONT TANDOORI MAYO",
        packaging_unit="1 KG PACKET",
        quantity=Decimal("8.00"),
        unit_price=Decimal("285.00"),
        line_total=Decimal("2280.00")
    )
    db.add_all([item3, item4])

    inv3 = Invoice(
        invoice_number="INV-RADAR-003",
        customer_id=cust_cafe.id,
        status=InvoiceStatus.PAID.value,
        invoice_date=today - timedelta(days=20),
        due_date=today + timedelta(days=5),
        total_amount=Decimal("5400.00"),
        paid_amount=Decimal("5400.00"),
        outstanding_amount=Decimal("0.00")
    )
    db.add(inv3)
    db.flush()

    item5 = InvoiceItem(
        invoice_id=inv3.id,
        product_id=p_moj.id,
        item_description="LIME AND MINT",
        packaging_unit="1 BOTTLE",
        quantity=Decimal("12.00"),
        unit_price=Decimal("360.00"),
        line_total=Decimal("4320.00")
    )
    db.add(item5)

    db.commit()
    yield db
    db.close()

def test_demand_radar_returns_5_formats_with_exact_territory(setup_radar_db):
    """Regional Demand Radar must analyze all 5 Rayalaseema food formats."""
    db = setup_radar_db
    radar = RecommendationService.get_regional_demand_radar(db, force_refresh=True)

    assert "summary" in radar
    assert "formats" in radar
    assert radar["summary"]["pin_code"] == "516269"
    assert "Rayachoty" in radar["summary"]["territory"]
    assert radar["summary"]["analysis_period_days"] == 60
    assert len(radar["formats"]) == 5

    format_ids = [f["format_id"] for f in radar["formats"]]
    expected_ids = ["broasted_chicken", "shawarma_mandi", "cafe_mojito", "burger_fast_food", "pizza_cloud_kitchen"]
    assert format_ids == expected_ids

def test_demand_radar_detects_live_accounts_and_derived_units(setup_radar_db):
    """Broasted chicken, shawarma, and cafe mojito formats must detect live invoice data."""
    db = setup_radar_db
    radar = RecommendationService.get_regional_demand_radar(db, force_refresh=True)

    format_map = {f["format_id"]: f for f in radar["formats"]}
    
    # Broasted Chicken
    afc = format_map["broasted_chicken"]
    assert afc["active_accounts_count"] >= 1
    assert "AFC Rayachoty Express" in afc["sample_customers"]
    assert "Rayachoty" in afc["cities_served"]
    assert "Bucket Servings" in afc["derived_packaging_demand"]
    assert afc["is_in_catalog"] is False
    assert afc["recommended_sku"]["sku"] == "RAIS-BOX-08"
    assert afc["recommended_sku"]["base_price"] == 850.00
    assert afc["recommended_sku"]["packaging_unit"] == "100 NOS"

    # Shawarma Mandi
    shw = format_map["shawarma_mandi"]
    assert shw["active_accounts_count"] >= 1
    assert "Bait Al Arabian Mandi" in shw["sample_customers"]
    assert "Wrapped Servings" in shw["derived_packaging_demand"]
    assert shw["is_in_catalog"] is False
    assert shw["recommended_sku"]["sku"] == "RAIS-PKG-01"

    # Cafe Mojito
    caf = format_map["cafe_mojito"]
    assert caf["active_accounts_count"] >= 1
    assert "Madanapalle" in caf["cities_served"]
    assert "Cold Beverage Servings" in caf["derived_packaging_demand"]
    assert caf["is_in_catalog"] is False
    assert caf["recommended_sku"]["sku"] == "RAIS-PKG-02"

def test_demand_radar_updates_when_sku_is_added_to_catalogue(setup_radar_db):
    """When a recommended SKU is added to Product table, radar immediately flags is_in_catalog=True."""
    db = setup_radar_db

    # Initially RAIS-BOX-08 is not in catalog
    radar1 = RecommendationService.get_regional_demand_radar(db, force_refresh=True)
    afc1 = next(f for f in radar1["formats"] if f["format_id"] == "broasted_chicken")
    assert afc1["is_in_catalog"] is False
    assert afc1["recommended_sku"]["current_stock"] == 0.0

    # Simulate 1-click addition of RAIS-BOX-08 to catalogue
    pkg_cat = db.query(Category).filter_by(code="PACKAGING").first()
    new_box = Product(
        sku="RAIS-BOX-08",
        name="BROASTED CHICKEN BUCKET 1000ML WITH LID (100 NOS)",
        brand="Packaging Solutions",
        category_id=pkg_cat.id,
        packaging_unit="100 NOS",
        base_price=Decimal("850.00"),
        current_stock=Decimal("120.00"),
        is_active=True
    )
    db.add(new_box)
    db.commit()

    # Re-run demand radar with force_refresh
    radar2 = RecommendationService.get_regional_demand_radar(db, force_refresh=True)
    afc2 = next(f for f in radar2["formats"] if f["format_id"] == "broasted_chicken")
    assert afc2["is_in_catalog"] is True
    assert afc2["recommended_sku"]["is_in_catalog"] is True
    assert afc2["recommended_sku"]["current_stock"] == 120.0
    assert afc2["recommended_sku"]["existing_product_id"] == str(new_box.id)

def test_demand_radar_in_memory_cache(setup_radar_db):
    """Successive calls within 60s should return cached copy instantly without DB hits."""
    db = setup_radar_db
    res1 = RecommendationService.get_regional_demand_radar(db, force_refresh=True)
    res2 = RecommendationService.get_regional_demand_radar(db, force_refresh=False)
    assert res1["cached_at"] == res2["cached_at"]
