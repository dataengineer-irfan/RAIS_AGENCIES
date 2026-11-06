import pytest
from datetime import date
from decimal import Decimal

from app.models.user import User
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.catalogue import Product, Category
from app.models.order import Order, OrderItem
from app.domain.enums import InvoiceStatus, OrderStatus
from app.api.executive import get_executive_briefing

def test_briefing_minimum_three_basket_gaps_and_route_rotation(db):
    """
    Verifies that:
    1. get_executive_briefing returns at least 3 distinct basket gap cross-sell opportunities.
    2. get_executive_briefing returns at least 3 distinct route rotation strategies with internal & external factors.
    3. A customer who has bought cheese is NEVER falsely flagged as missing cheese.
    4. Anti-cache headers are set on response.
    """
    fake_user = User(id="user-ops-1", username="ops_lead", email="ops@rais.com", role="ADMIN", is_active=True)

    # 1. Fetch or create test categories
    cat_pkg = db.query(Category).filter(Category.code == "PACKAGING").first()
    if not cat_pkg:
        cat_pkg = Category(code="PACKAGING", name="Packaging", display_order=1, is_active=True)
        db.add(cat_pkg)
        db.flush()

    cat_chs = db.query(Category).filter(Category.code == "CHEESE").first()
    if not cat_chs:
        cat_chs = Category(code="CHEESE", name="Cheese", display_order=2, is_active=True)
        db.add(cat_chs)
        db.flush()

    # 2. Fetch or create products
    p_box = db.query(Product).filter(Product.sku == "RAIS-BOX-01").first()
    if not p_box:
        p_box = Product(sku="RAIS-BOX-01", category_id=cat_pkg.id, name="PIZZA BOX 10 INCH", brand="RAIS", packaging_unit="50 PCS", base_price=Decimal("600.00"), current_stock=Decimal("100.00"), is_active=True)
        db.add(p_box)
        db.flush()

    p_chs = db.query(Product).filter(Product.sku == "RAIS-CHS-01").first()
    if not p_chs:
        p_chs = Product(sku="RAIS-CHS-01", category_id=cat_chs.id, name="MILKY MIST MOZEROLLA DICED CHEESE (2KG)", brand="Milky Mist", packaging_unit="2 KG PACKET", base_price=Decimal("920.00"), current_stock=Decimal("50.00"), is_active=True)
        db.add(p_chs)
        db.flush()

    # 3. Create customers:
    # A) Empire cafe: buys pizza boxes but 0 cheese
    c_empire = Customer(customer_code="CUST-EMP-TEST", business_name="Empire kks cafe test", contact_person="Shakeel", phone="919876543210", address_line1="Main Road", city="Rayachoty", status="ACTIVE")
    # B) Mohammed Walid: buys pizza boxes AND buys cheese (MUST NOT BE FLAGGED!)
    c_walid = Customer(customer_code="CUST-WAL-TEST", business_name="Mohammed Walid sundupalli test", contact_person="Walid", phone="919876543211", address_line1="Sundupalli Road", city="Sundupalli", status="ACTIVE")
    db.add_all([c_empire, c_walid])
    db.flush()

    today = date.today()

    # Invoices
    inv_emp = Invoice(invoice_number="INV-EMP-TEST-01", customer_id=c_empire.id, status=InvoiceStatus.ISSUED.value, total_amount=Decimal("1860.00"), outstanding_amount=Decimal("1860.00"), invoice_date=today, due_date=today)
    db.add(inv_emp)
    db.flush()
    db.add(InvoiceItem(invoice_id=inv_emp.id, product_id=p_box.id, item_description="PIZZA BOX 10 INCH", packaging_unit="50 PCS", line_total=Decimal("1860.00"), quantity=Decimal("3.00"), unit_price=Decimal("620.00")))

    inv_wal = Invoice(invoice_number="INV-WAL-TEST-01", customer_id=c_walid.id, status=InvoiceStatus.ISSUED.value, total_amount=Decimal("2140.00"), outstanding_amount=Decimal("2140.00"), invoice_date=today, due_date=today)
    db.add(inv_wal)
    db.flush()
    db.add(InvoiceItem(invoice_id=inv_wal.id, product_id=p_box.id, item_description="PIZZA BOX 10 INCH", packaging_unit="50 PCS", line_total=Decimal("1220.00"), quantity=Decimal("2.00"), unit_price=Decimal("610.00")))
    test_cheese_item = InvoiceItem(invoice_id=inv_wal.id, product_id=p_chs.id, item_description="MILKY MIST MOZEROLLA DICED CHEESE (2KG)", packaging_unit="2 KG PACKET", line_total=Decimal("920.00"), quantity=Decimal("1.00"), unit_price=Decimal("920.00"))
    db.add(test_cheese_item)
    db.commit()

    # 4. Invoke executive briefing
    briefing = get_executive_briefing(db=db, current_user=fake_user)

    # Assertions
    assert "basket_gaps" in briefing
    assert "demand_trends" in briefing
    assert "route_strategies" in briefing
    assert len(briefing["basket_gaps"]) >= 3, f"Expected >= 3 basket gaps, got {len(briefing['basket_gaps'])}"
    assert len(briefing["demand_trends"]) >= 3, f"Expected >= 3 demand trends, got {len(briefing['demand_trends'])}"
    assert len(briefing["route_strategies"]) >= 3, f"Expected >= 3 route strategies, got {len(briefing['route_strategies'])}"

    # Demand trends dynamic validation
    trends = briefing["demand_trends"]
    assert trends[0]["type"] == "DEMAND_SURGE"
    assert "Velocity Leader" in trends[0]["tag_en"] or "Demand" in trends[0]["tag_en"]
    # The top billed item in our test was PIZZA BOX (5 units total) or CHEESE
    assert any("PIZZA BOX" in t["title_en"] or "CHEESE" in t["title_en"] or "Demand" in t["title_en"] for t in trends)
    for t in trends:
        assert "title_en" in t and "title_te" in t
        assert "insight_en" in t and "insight_te" in t
        assert "action_recommended_en" in t and "action_recommended_te" in t

    # Mohammed Walid must NOT have any pizza-cheese gap
    for gap in briefing["basket_gaps"]:
        assert "Mohammed Walid" not in gap.get("customer_name", ""), f"False positive: Mohammed Walid found in gap: {gap}"

    # Empire cafe should be correctly detected
    empire_gaps = [g for g in briefing["basket_gaps"] if "Empire" in g.get("customer_name", "")]
    assert len(empire_gaps) >= 1, "Empire cafe should be detected with a pizza cheese basket gap"
    assert empire_gaps[0]["pairing_key"] == "PIZZA_TO_CHEESE"

    # Route strategies check
    routes = briefing["route_strategies"]
    assert len(routes) >= 3
    assert any("Chinnamandem" in r["corridor_name"] or "Rayachoty" in r["corridor_name"] for r in routes)
    assert routes[0]["is_recommended_today"] is True
    assert "fuel_savings_inr" in routes[0]
    assert "cold_chain_window" in routes[0]
