import os
import sys
from decimal import Decimal
import pytest

# Ensure local test safety guard
os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.core.config import settings
from app.services.recommendation_service import RecommendationService
from app.domain.enums import InvoiceStatus
from datetime import date, datetime, timezone

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

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

    def get_or_create_prod(sku, cat_id, name, brand, pack, price, stock):
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
        else:
            p.current_stock = Decimal(str(stock))
            db.flush()
        return p

    p_box8 = get_or_create_prod("RAIS-BOX-01", cat_pkg.id, 'PIZZA BOX 8"x8" PLAIN', "Packaging Solutions", "100 NOS", "600.00", "50.00")
    p_box_burger = get_or_create_prod("RAIS-BOX-02", cat_pkg.id, 'BURGER BOX 4"x4"', "Packaging Solutions", "100 NOS", "400.00", "80.00")
    p_oregano = get_or_create_prod("RAIS-BRD-04", cat_brd.id, "OREGANO", "RAIS Select", "1 KG PACKET", "230.00", "30.00")
    p_tandoori_mayo = get_or_create_prod("RAIS-SAU-04", cat_sau.id, "DELMONT TANDOORI MAYO", "Del Monte", "1 KG PACKET", "285.00", "25.00")
    p_oos_pizza_box = get_or_create_prod("RAIS-BOX-03", cat_pkg.id, 'PIZZA BOX 8"x8" PRINTED', "Packaging Solutions", "100 NOS", "650.00", "0.00")
    p_pizza_sauce = get_or_create_prod("RAIS-SAU-06", cat_sau.id, "DELMONTE PIZZA PASTA SAUCE", "Del Monte", "1 KG PACKET", "155.00", "40.00")
    p_paneer_patty = get_or_create_prod("RAIS-VEG-05", cat_veg.id, "ITC PANEER PATTY", "ITC", "1.02KG PACKET", "530.00", "15.00")

    def get_or_create_cust(code, name, person, phone):
        c = db.query(Customer).filter_by(customer_code=code).first()
        if not c:
            c = Customer(
                customer_code=code,
                business_name=name,
                contact_person=person,
                phone=phone,
                address_line1="Rayachoti Main Road",
                city="Rayachoty",
                state="Andhra Pradesh",
                pincode="516269",
                status="ACTIVE"
            )
            db.add(c)
            db.flush()
        return c

    cust_pizza = get_or_create_cust("CUST-PIZZA", "Pizza Time Express", "Tayassar", "9182248206")
    cust_burger = get_or_create_cust("CUST-BURGER", "Burger King Rayachoty", "Mohammad", "9573261696")
    cust_new = get_or_create_cust("CUST-NEW", "Brand New Fast Food", "Syed", "9988776655")

    # Historical Invoices to build purchase affinity profiles
    inv1 = db.query(Invoice).filter_by(invoice_number="INV-202610-P001").first()
    if not inv1:
        inv1 = Invoice(
            invoice_number="INV-202610-P001",
            customer_id=cust_pizza.id,
            status=InvoiceStatus.PAID.value,
            invoice_date=date(2026, 10, 25),
            due_date=date(2026, 10, 25),
            total_amount=Decimal("155.00")
        )
        db.add(inv1)
        db.flush()
        inv1_item = InvoiceItem(
            invoice_id=inv1.id,
            product_id=p_pizza_sauce.id,
            item_description="DELMONTE PIZZA PASTA SAUCE (1 KG)",
            packaging_unit="1 KG PACKET",
            quantity=Decimal("1.00"),
            unit_price=Decimal("155.00"),
            line_total=Decimal("155.00")
        )
        db.add(inv1_item)

    inv2 = db.query(Invoice).filter_by(invoice_number="INV-202610-B001").first()
    if not inv2:
        inv2 = Invoice(
            invoice_number="INV-202610-B001",
            customer_id=cust_burger.id,
            status=InvoiceStatus.PAID.value,
            invoice_date=date(2026, 10, 25),
            due_date=date(2026, 10, 25),
            total_amount=Decimal("530.00")
        )
        db.add(inv2)
        db.flush()
        inv2_item = InvoiceItem(
            invoice_id=inv2.id,
            product_id=p_paneer_patty.id,
            item_description="ITC PANEER PATTY (1.02KG PACKET)",
            packaging_unit="1.02KG PACKET",
            quantity=Decimal("1.00"),
            unit_price=Decimal("530.00"),
            line_total=Decimal("530.00")
        )
        db.add(inv2_item)

    db.commit()

    yield {
        "db": db,
        "cust_pizza": cust_pizza,
        "cust_burger": cust_burger,
        "cust_new": cust_new,
        "p_box8": p_box8,
        "p_box_burger": p_box_burger,
        "p_oregano": p_oregano,
        "p_tandoori_mayo": p_tandoori_mayo,
        "p_oos_pizza_box": p_oos_pizza_box
    }

    db.close()


def test_pizza_customer_receives_in_stock_pizza_packaging_without_prices(setup_db):
    """
    QA Test 1: Verify customer with pizza purchase profile receives
    relevant in-stock pizza packaging suggestion with ZERO prices printed.
    """
    db = setup_db["db"]
    cust = setup_db["cust_pizza"]

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )

    assert suggestion is not None
    assert "PIZZA BOX" in suggestion["name"]
    assert suggestion["sku"] == "RAIS-BOX-01"
    assert suggestion["packaging_unit"] == "100 NOS"
    assert "In Stock for your Pizzas" in suggestion["context_note"]

    # Senior QA Verification: ZERO prices printed!
    assert "₹" not in suggestion["display_text"]
    assert "600" not in suggestion["display_text"]
    assert "price" not in suggestion


def test_burger_customer_receives_in_stock_burger_packaging_without_prices(setup_db):
    """
    QA Test 2: Verify customer with burger purchase profile receives
    relevant in-stock burger packaging suggestion with ZERO prices printed.
    """
    db = setup_db["db"]
    cust = setup_db["cust_burger"]

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )

    assert suggestion is not None
    assert "BURGER BOX" in suggestion["name"]
    assert suggestion["sku"] == "RAIS-BOX-02"
    assert "In Stock for your Burgers" in suggestion["context_note"]

    # Senior QA Verification: ZERO prices printed!
    assert "₹" not in suggestion["display_text"]
    assert "400" not in suggestion["display_text"]


def test_out_of_stock_products_are_never_recommended(setup_db):
    """
    QA Test 3: Product RAIS-BOX-03 has current_stock == 0.00.
    Verify that out-of-stock items are NEVER returned as the recommendation.
    """
    db = setup_db["db"]
    oos_product = setup_db["p_oos_pizza_box"]
    assert oos_product.current_stock == Decimal("0.00")

    cust = setup_db["cust_pizza"]
    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )

    assert suggestion is not None
    assert suggestion["sku"] != oos_product.sku
    assert suggestion["name"] != oos_product.name


def test_current_bill_items_are_excluded_from_recommendation(setup_db):
    """
    QA Test 4: If customer is currently buying RAIS-BOX-01 on this bill,
    it must NOT recommend RAIS-BOX-01 again. It must recommend alternative (e.g. OREGANO).
    """
    db = setup_db["db"]
    cust = setup_db["cust_pizza"]
    p_box8 = setup_db["p_box8"]

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id),
        exclude_product_ids=[str(p_box8.id)]
    )

    assert suggestion is not None
    # Cannot be RAIS-BOX-01 because it was excluded
    assert suggestion["sku"] != "RAIS-BOX-01"
    # Fallback to OREGANO (in-stock seasoning for pizza)
    assert suggestion["sku"] == "RAIS-BRD-04"
    assert "₹" not in suggestion["display_text"]


def test_kill_switch_instantly_disables_all_recommendations(setup_db):
    """
    QA Test 5: Verify the kill-switch (settings.ENABLE_RESTOCK_SUGGESTIONS = False)
    instantly disables all recommendations and returns None safely.
    """
    db = setup_db["db"]
    cust = setup_db["cust_pizza"]

    # Disable feature flag
    settings.ENABLE_RESTOCK_SUGGESTIONS = False

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )

    assert suggestion is None

    # Re-enable feature flag
    settings.ENABLE_RESTOCK_SUGGESTIONS = True

    suggestion_after = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )
    assert suggestion_after is not None


def test_new_customer_with_no_purchase_history_gets_safe_in_stock_depot_fallback(setup_db):
    """
    QA Test 6: Brand new customer with zero previous purchase history
    receives safe in-stock depot packaging/essential without throwing errors.
    """
    db = setup_db["db"]
    cust = setup_db["cust_new"]

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id)
    )

    assert suggestion is not None
    assert "In Stock" in suggestion["context_note"]
    assert "₹" not in suggestion["display_text"]
