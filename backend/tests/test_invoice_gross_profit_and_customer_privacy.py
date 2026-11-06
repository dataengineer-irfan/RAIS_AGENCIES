import pytest
from decimal import Decimal
from datetime import date
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.invoice import Invoice, InvoiceItem
from app.models.inventory import StockMovement
from app.services.billing_service import BillingService
from app.services.thermal_print_service import ThermalPrintService
from app.api.invoices import get_printable_invoice
import uuid

def test_invoice_gross_profit_calculation(db):
    """
    Validates that BillingService accurately calculates COGS, Gross Profit (₹),
    and Gross Margin % on both itemized lines and overall invoice for admin reporting.
    """
    cust_id = str(uuid.uuid4())
    customer = Customer(
        id=cust_id,
        customer_code="CUST-TEST-PROFIT",
        business_name="Profit Test Kitchen",
        contact_person="Chef Test",
        phone="9888877777",
        address_line1="Test Bazaar",
        city="Rayachoty",
        pincode="516269"
    )
    db.add(customer)

    cat_id = str(uuid.uuid4())
    category = Category(id=cat_id, name="Test Dairy", code=f"CAT_{uuid.uuid4().hex[:6]}")
    db.add(category)

    prod_id = str(uuid.uuid4())
    product = Product(
        id=prod_id,
        category_id=cat_id,
        sku="TEST-MOZZARELLA-2KG",
        name="Mozzarella Diced Cheese (2KG)",
        brand="Milky Mist",
        packaging_unit="2 KG PACKET",
        base_price=Decimal("900.00"),
        current_stock=Decimal("50.00")
    )
    db.add(product)

    # Record purchase cost of 720.00 (wholesale procurement cost = 80% landed)
    movement = StockMovement(
        id=str(uuid.uuid4()),
        product_id=prod_id,
        movement_type="RECEIPT",
        quantity_change=Decimal("50.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("50.00"),
        unit="2 KG PACKET",
        purchase_cost=Decimal("720.00")
    )
    db.add(movement)
    db.commit()

    inv_id = str(uuid.uuid4())
    invoice = Invoice(
        id=inv_id,
        invoice_number="INV-202611-PROFIT-01",
        customer_id=cust_id,
        status="ISSUED",
        invoice_date=date.today(),
        due_date=date.today(),
        subtotal=Decimal("9000.00"),
        discount_amount=Decimal("0.00"),
        taxable_amount=Decimal("9000.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("9000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("9000.00")
    )
    db.add(invoice)

    item = InvoiceItem(
        id=str(uuid.uuid4()),
        invoice_id=inv_id,
        product_id=prod_id,
        item_description="Mozzarella Diced Cheese (2KG)",
        packaging_unit="2 KG PACKET",
        quantity=Decimal("10.00"),
        unit_price=Decimal("900.00"),
        line_total=Decimal("9000.00"),
        taxable_amount=Decimal("9000.00"),
        tax_amount=Decimal("0.00")
    )
    db.add(item)
    db.commit()

    # 1. Test get_invoice_by_id detail calculation
    inv_resp = BillingService.get_invoice_by_id(db, inv_id)
    assert inv_resp is not None
    # 10 units * 720.00 = 7200.00 COGS
    assert inv_resp.cogs == Decimal("7200.00")
    # 9000.00 revenue - 7200.00 COGS = 1800.00 Gross Profit
    assert inv_resp.gross_profit == Decimal("1800.00")
    # 1800.00 / 9000.00 * 100 = 20.0% Margin
    assert inv_resp.gross_margin_pct == Decimal("20.0")

    # Item level assertions
    assert len(inv_resp.items) == 1
    assert inv_resp.items[0].unit_cost == Decimal("720.00")
    assert inv_resp.items[0].cogs == Decimal("7200.00")
    assert inv_resp.items[0].gross_profit == Decimal("1800.00")
    assert inv_resp.items[0].gross_margin_pct == Decimal("20.0")

    # 2. Test list_invoices pre-fetched batch calculation
    list_res = BillingService.list_invoices(db, customer_id=cust_id)
    assert len(list_res) >= 1
    matched = next((i for i in list_res if i.id == inv_id), None)
    assert matched is not None
    assert matched.cogs == Decimal("7200.00")
    assert matched.gross_profit == Decimal("1800.00")
    assert matched.gross_margin_pct == Decimal("20.0")


def test_strict_customer_invoice_privacy_guard(db):
    """
    MANDATORY SECURITY VALIDATION:
    Asserts that customer-facing printable tax invoices (print-html),
    thermal print slips, and public views NEVER leak or print Gross Profit,
    COGS, procurement costs, or wholesale profit margins.
    """
    cust_id = str(uuid.uuid4())
    customer = Customer(
        id=cust_id,
        customer_code="CUST-PRIVACY-01",
        business_name="Confidential Outlet",
        contact_person="Manager",
        phone="9999911111",
        address_line1="Main Road",
        city="Rayachoty",
        pincode="516269"
    )
    db.add(customer)

    cat_id = str(uuid.uuid4())
    category = Category(id=cat_id, name="Test Packaging", code=f"PKG_{uuid.uuid4().hex[:6]}")
    db.add(category)

    prod_id = str(uuid.uuid4())
    product = Product(
        id=prod_id,
        category_id=cat_id,
        sku="TEST-CHICKEN-BOX",
        name="Chicken Box 4x5x8",
        brand="Prestige",
        packaging_unit="100 NOS",
        base_price=Decimal("540.00"),
        current_stock=Decimal("100.00")
    )
    db.add(product)

    movement = StockMovement(
        id=str(uuid.uuid4()),
        product_id=prod_id,
        movement_type="RECEIPT",
        quantity_change=Decimal("100.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("100.00"),
        unit="100 NOS",
        purchase_cost=Decimal("432.00") # 80% cost
    )
    db.add(movement)
    db.commit()

    inv_id = str(uuid.uuid4())
    invoice = Invoice(
        id=inv_id,
        invoice_number="INV-202611-PRIVACY-01",
        customer_id=cust_id,
        status="ISSUED",
        invoice_date=date.today(),
        due_date=date.today(),
        subtotal=Decimal("540.00"),
        discount_amount=Decimal("0.00"),
        taxable_amount=Decimal("540.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("540.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("540.00")
    )
    db.add(invoice)

    item = InvoiceItem(
        id=str(uuid.uuid4()),
        invoice_id=inv_id,
        product_id=prod_id,
        item_description="Chicken Box 4x5x8",
        packaging_unit="100 NOS",
        quantity=Decimal("1.00"),
        unit_price=Decimal("540.00"),
        line_total=Decimal("540.00"),
        taxable_amount=Decimal("540.00"),
        tax_amount=Decimal("0.00")
    )
    db.add(item)
    db.commit()

    # 1. Audit printable customer invoice HTML
    html_resp = get_printable_invoice(inv_id, db)
    html_content = html_resp.body.decode("utf-8") if hasattr(html_resp, 'body') else str(html_resp)
    html_lower = html_content.lower()

    # Mandatory Assertions: Strictly forbidden terms on customer invoice
    forbidden_terms = [
        "gross profit",
        "net profit",
        "cogs",
        "procurement cost",
        "purchase cost",
        "unit cost",
        "landed cost",
        "margin rate",
        "profit %",
        "margin %"
    ]

    for term in forbidden_terms:
        assert term not in html_lower, f"CRITICAL LEAK: '{term}' found in customer printable invoice HTML!"

    # 2. Audit 58mm Thermal Print Receipt payload
    thermal_payload = ThermalPrintService.build_thermal_receipt_payload(invoice, paper_width=58)
    thermal_str = str(thermal_payload).lower()

    for term in forbidden_terms:
        assert term not in thermal_str, f"CRITICAL LEAK: '{term}' found in thermal receipt payload!"
