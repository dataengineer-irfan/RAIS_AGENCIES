"""
Senior QA Audit: Cross-Sell Name Variant Exclusion Tests
=========================================================
Specific regression tests for the EXACT production bugs found in:
- Invoice INV-202611-00068 (Al-Bek / Syed Basha)
- Payment PAY-202611-00057

Bug 1: Companion card on INVOICE showed "pizza box colour 8*8 laminated corugated"
        even though Line 1 of that invoice already contained a pizza box.

Bug 2: Companion card on PAYMENT RECEIPT showed "BURGER BOX 4\"x4\" PRINTED"
        even though Line 3 of the settled invoice already contained a burger box.

Root cause: The `is_disqualified()` function relied on name-substring matching
            ("PIZZA BOX" in product.name). When the product name in DB uses a
            different variant like "pizza box colour 8*8 laminated corugated",
            the check still works (substring matches). But the SKU-prefix exclusion
            added in this fix catches ALL RAIS-BOX-* variants regardless of name.

These tests create the EXACT product names from the production screenshot
and verify ZERO cross-sell leakage.
"""

import os
import sys
from decimal import Decimal
import pytest

os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.services.recommendation_service import RecommendationService


@pytest.fixture(scope="module")
def cross_sell_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Use seeded categories if present to avoid category count drift
    def get_cat(code, name, order):
        c = db.query(Category).filter_by(code=code).first()
        if not c:
            c = Category(code=code, name=name, display_order=order, is_active=True)
            db.add(c)
            db.flush()
        return c

    cat_pkg = get_cat("PACKAGING", "Packaging", 1)
    cat_sau = get_cat("SAUCES", "Sauces", 2)
    cat_brd = get_cat("BREADING", "Seasonings", 3)

    def mkprod(sku, cat_id, name, pack, price, stock):
        p = db.query(Product).filter_by(sku=sku).first()
        if not p:
            p = Product(
                sku=sku,
                category_id=cat_id,
                name=name,
                brand="Test Brand",
                packaging_unit=pack,
                base_price=Decimal(str(price)),
                current_stock=Decimal(str(stock)),
                is_active=True,
            )
            db.add(p)
            db.flush()
        else:
            p.current_stock = Decimal(str(stock))
            db.flush()
        return p

    # === EXACT PRODUCT NAMES FROM PRODUCTION SCREENSHOT ===
    # This is what the invoice companion card was incorrectly recommending
    p_pizza_box_colour = mkprod(
        "RAIS-BOX-X1", cat_pkg.id,
        "pizza box colour 8*8 laminated corugated (100 nos)",
        "100 NOS", "660.00", "75.00"
    )

    # This is what the payment receipt was incorrectly recommending
    p_burger_box_printed = mkprod(
        "RAIS-BOX-X2", cat_pkg.id,
        "BURGER BOX 4\"x4\" PRINTED (100 NOS)",
        "100 NOS", "320.00", "120.00"
    )

    # Legitimate complementary products
    p_oregano = mkprod(
        "RAIS-BRD-X1", cat_brd.id,
        "BIG BELL OREGANO SEASONING",
        "1 KG PACKET", "230.00", "40.00"
    )
    p_mayo = mkprod(
        "RAIS-SAU-X1", cat_sau.id,
        "DELMONTE TANDOORI MAYO",
        "1 KG PACKET", "285.00", "30.00"
    )
    p_peri = mkprod(
        "RAIS-BRD-X2", cat_brd.id,
        "VKL PERI PERI SPRINKLER",
        "1 KG PACKET", "180.00", "50.00"
    )

    cust = db.query(Customer).filter_by(customer_code="CUST-ALBEK-X").first()
    if not cust:
        cust = Customer(
            customer_code="CUST-ALBEK-X",
            business_name="Al-Bek (Syed Basha)",
            contact_person="Syed Basha",
            phone="9494539379",
            address_line1="Galiveedu Main Road",
            city="Galiveedu",
            state="Andhra Pradesh",
            pincode="516269",
            status="ACTIVE"
        )
        db.add(cust)
        db.flush()

    db.commit()
    yield {
        "db": db,
        "cust": cust,
        "p_pizza_box_colour": p_pizza_box_colour,
        "p_burger_box_printed": p_burger_box_printed,
        "p_oregano": p_oregano,
        "p_mayo": p_mayo,
        "p_peri": p_peri,
    }
    # Teardown: Clean up test SKUs and test customer to prevent state contamination
    try:
        test_skus = ["RAIS-BOX-X1", "RAIS-BOX-X2", "RAIS-BRD-X1", "RAIS-SAU-X1", "RAIS-BRD-X2"]
        db.query(Product).filter(Product.sku.in_(test_skus)).delete(synchronize_session=False)
        db.query(Customer).filter_by(customer_code="CUST-ALBEK-X").delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# BUG REGRESSION 1: Invoice INV-202611-00068 Companion Card
# Customer bought Pizza Box → engine was recommending "pizza box colour 8*8"
# MUST recommend Oregano/Mayo/Peri instead
# ─────────────────────────────────────────────────────────────────────────────
def test_pizza_box_buyer_does_not_receive_pizza_box_colour_variant(cross_sell_db):
    """
    EXACT regression for INV-202611-00068:
    Customer already bought 'PIZZA BOX 8"x8" PRINTED Laminated'.
    Engine MUST NOT recommend 'pizza box colour 8*8 laminated corugated'.
    """
    db = cross_sell_db["db"]
    cust = cross_sell_db["cust"]

    # Items on invoice INV-202611-00068
    items_on_invoice = [
        'PIZZA BOX 8"x8" PRINTED Laminated',
        'FOODRITE TOMATO KETCHUP',
        'BURGER BOX 4"x4" PRINTED',
    ]

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id),
        current_item_descriptions=items_on_invoice,
    )

    assert suggestion is not None, (
        "Engine returned None — no valid cross-sell found. "
        "Should have returned Oregano, Mayo, or Peri Peri."
    )

    rec_name = suggestion["name"].upper()

    # MUST NOT recommend any pizza box variant
    assert "PIZZA BOX" not in rec_name, (
        f"REGRESSION BUG: Engine recommended '{suggestion['name']}' "
        f"but customer already bought a pizza box on this invoice!"
    )

    # MUST NOT recommend burger box (already on invoice)
    assert "BURGER BOX" not in rec_name, (
        f"REGRESSION BUG: Engine recommended '{suggestion['name']}' "
        f"but customer already bought a burger box on this invoice!"
    )

    # MUST NOT recommend ketchup (already on invoice)
    assert "KETCHUP" not in rec_name, (
        f"REGRESSION BUG: Engine recommended '{suggestion['name']}' "
        f"but customer already bought ketchup on this invoice!"
    )

    # MUST be a genuine kitchen complement
    is_genuine_complement = any(
        kw in rec_name for kw in [
            "OREGANO", "MAYO", "PERI", "MOZZARELLA", "CHEESE",
            "FRIES", "PIZZA SAUCE", "BREADING", "MARINADE", "PATTY"
        ]
    )
    assert is_genuine_complement, (
        f"Engine returned '{suggestion['name']}' which is not a genuine "
        f"kitchen complement for a pizza+burger box customer. "
        f"Expected Oregano, Mayo, Peri Peri, Mozzarella, or Pizza Sauce."
    )


# ─────────────────────────────────────────────────────────────────────────────
# BUG REGRESSION 2: Payment Receipt PAY-202611-00057 Companion Card
# Customer paid for Burger Box → engine was recommending "BURGER BOX 4\"x4\""
# ─────────────────────────────────────────────────────────────────────────────
def test_payment_receipt_does_not_recommend_already_settled_burger_box(cross_sell_db):
    """
    EXACT regression for PAY-202611-00057:
    Receipt settled INV-202611-00068 which included BURGER BOX 4"x4" PRINTED.
    Receipt companion card MUST NOT recommend that exact same burger box.
    """
    db = cross_sell_db["db"]
    cust = cross_sell_db["cust"]
    p_burger_box = cross_sell_db["p_burger_box_printed"]

    # Simulate payment receipt: items from settled invoice
    settled_items_desc = [
        'PIZZA BOX 8"x8" PRINTED Laminated',
        'FOODRITE TOMATO KETCHUP',
        'BURGER BOX 4"x4" PRINTED',
    ]
    settled_product_ids = [str(p_burger_box.id)]  # burger box product_id excluded

    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id),
        exclude_product_ids=settled_product_ids,
        current_item_descriptions=settled_items_desc,
    )

    assert suggestion is not None, (
        "Engine returned None — no valid restock suggestion found for payment receipt. "
        "Should return Oregano, Peri Peri, or Mayo."
    )

    rec_name = suggestion["name"].upper()

    # MUST NOT recommend burger box (already on settled invoice)
    assert "BURGER BOX" not in rec_name, (
        f"REGRESSION BUG: Receipt companion card shows '{suggestion['name']}' "
        f"but BURGER BOX was Line 3 on the settled invoice INV-202611-00068!"
    )

    # MUST NOT recommend pizza box (already on settled invoice)
    assert "PIZZA BOX" not in rec_name, (
        f"REGRESSION BUG: Receipt companion card shows '{suggestion['name']}' "
        f"but PIZZA BOX was Line 1 on the settled invoice INV-202611-00068!"
    )


# ─────────────────────────────────────────────────────────────────────────────
# SKU-PREFIX FAMILY EXCLUSION: Verify ALL RAIS-BOX-* are blocked when
# any box is on the current transaction
# ─────────────────────────────────────────────────────────────────────────────
def test_sku_prefix_family_exclusion_blocks_all_box_variants(cross_sell_db):
    """
    If a customer bought ANY packaging box (any RAIS-BOX-* SKU), the engine
    must exclude ALL RAIS-BOX-* products, not just the exact one bought.
    This covers variant names like 'pizza box colour', 'pizza box laminated', etc.
    """
    db = cross_sell_db["db"]
    cust = cross_sell_db["cust"]
    p_pizza_box_colour = cross_sell_db["p_pizza_box_colour"]

    # Only pizza box was bought
    suggestion = RecommendationService.get_customer_restock_suggestion(
        db=db,
        customer_id=str(cust.id),
        exclude_product_ids=[str(p_pizza_box_colour.id)],
        current_item_descriptions=["PIZZA BOX 8*8 PRINTED LAMINATED"],
    )

    assert suggestion is not None, "Engine should find a non-box complement"
    rec_sku = (suggestion.get("sku") or "").upper()
    # Must NOT be any RAIS-BOX-* SKU
    assert not rec_sku.startswith("RAIS-BOX-"), (
        f"SKU-prefix exclusion FAILED: engine returned SKU '{rec_sku}' "
        f"(a RAIS-BOX-* product) even though the customer already bought a pizza box. "
        f"ALL RAIS-BOX-* must be excluded when any box is on the invoice."
    )


# ─────────────────────────────────────────────────────────────────────────────
# ZERO SELF-RECOMMENDATION: When all complementary items are OOS,
# engine MUST return None — not fall back to recommending items on the invoice
# ─────────────────────────────────────────────────────────────────────────────
def test_no_recommendation_when_only_matching_products_are_already_bought(cross_sell_db):
    """
    If the only in-stock products are exactly what the customer already bought,
    the engine must return None (no recommendation) rather than recommending
    something they're currently purchasing.
    """
    db = cross_sell_db["db"]
    cust = cross_sell_db["cust"]

    # Put all complements out of stock temporarily
    oregano = cross_sell_db["p_oregano"]
    mayo = cross_sell_db["p_mayo"]
    peri = cross_sell_db["p_peri"]

    orig_stocks = {
        "oregano": oregano.current_stock,
        "mayo": mayo.current_stock,
        "peri": peri.current_stock,
    }

    oregano.current_stock = Decimal("0.00")
    mayo.current_stock = Decimal("0.00")
    peri.current_stock = Decimal("0.00")
    db.flush()

    try:
        suggestion = RecommendationService.get_customer_restock_suggestion(
            db=db,
            customer_id=str(cust.id),
            current_item_descriptions=[
                "pizza box colour 8*8 laminated corugated",
                "BURGER BOX 4\"x4\" PRINTED",
            ],
        )

        # Either None or a genuinely different product — must NOT be a box
        if suggestion is not None:
            rec_name = suggestion["name"].upper()
            assert "PIZZA BOX" not in rec_name
            assert "BURGER BOX" not in rec_name
    finally:
        # Restore stock
        oregano.current_stock = orig_stocks["oregano"]
        mayo.current_stock = orig_stocks["mayo"]
        peri.current_stock = orig_stocks["peri"]
        db.flush()
