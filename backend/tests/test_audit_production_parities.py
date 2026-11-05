import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.invoice import Invoice
from app.models.order import Order
from app.domain.enums import CustomerStatus, InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.payment import PaymentCreate
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.services.order_service import OrderService
from app.services.thermal_print_service import ThermalPrintService

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Seed minimal entities
    cat = Category(code="FROZEN", name="Frozen Goods", display_order=1)
    db.add(cat)
    db.flush()

    prod = Product(
        sku="TEST-CHICKEN-POPCORN",
        category_id=cat.id,
        name="Chicken Popcorn 1KG",
        brand="RAIS Quality",
        packaging_unit="1 KG",
        base_price=Decimal("250.00"),
        tax_rate=Decimal("5.00"),
        current_stock=Decimal("100.00")
    )
    db.add(prod)

    cust = Customer(
        customer_code="CUST-AUDIT1",
        business_name="Audit Auto-FIFO Cafe",
        contact_person="Owner",
        phone="9988776655",
        address_line1="Reddies Colony, Rayachoty",
        city="Rayachoty",
        opening_balance=Decimal("0.00"),
        status=CustomerStatus.ACTIVE.value
    )
    db.add(cust)
    db.commit()

    yield db
    db.close()

def test_payment_fifo_auto_allocation_without_allocations(test_db):
    """Verifies that recording an unallocated payment automatically settles open invoices chronologically."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # 1. Create Invoice of ₹500 (2 units @ 250)
    inv = BillingService.create_invoice(test_db, InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"), unit_price=Decimal("250.00"))],
        auto_issue=True
    ))
    assert inv.status == InvoiceStatus.ISSUED.value
    assert inv.outstanding_amount == Decimal("500.00")

    # 2. Record payment of ₹500 with NO explicit allocations (general collection)
    pay = PaymentService.record_payment(test_db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("500.00"),
        payment_method="UPI",
        allocations=[]
    ))

    test_db.refresh(inv)
    assert inv.status == InvoiceStatus.PAID.value
    assert inv.paid_amount == Decimal("500.00")
    assert inv.outstanding_amount == Decimal("0.00")

def test_payment_advance_auto_allocation_to_subsequent_invoice(test_db):
    """Verifies that when a customer has an unallocated advance payment, a new invoice automatically settles against it."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # 1. Record Advance Payment of ₹1,000 (No open invoices exist yet)
    pay = PaymentService.record_payment(test_db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("1000.00"),
        payment_method="CASH",
        allocations=[]
    ))
    test_db.refresh(pay)
    assert pay.unallocated_amount == Decimal("1000.00")

    # 2. Issue a subsequent Invoice of ₹400
    inv = BillingService.create_invoice(test_db, InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("1.00"), unit_price=Decimal("400.00"))],
        auto_issue=True
    ))

    test_db.refresh(inv)
    test_db.refresh(pay)
    # The invoice must be automatically PAID from the customer's advance
    assert inv.status == InvoiceStatus.PAID.value
    assert inv.paid_amount == Decimal("400.00")
    assert inv.outstanding_amount == Decimal("0.00")
    # Remaining unallocated advance on payment must be ₹600
    assert pay.allocated_amount == Decimal("400.00")
    assert pay.unallocated_amount == Decimal("600.00")

def test_order_cancellation_restores_stock(test_db):
    """Verifies that cancelling an order safely restores deducted inventory to warehouse."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()
    initial_stock = prod.current_stock

    # 1. Create Order for 3 units
    order = OrderService.create_order(test_db, OrderCreate(
        customer_id=cust.id,
        items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("3.00"), unit_price=Decimal("250.00"))]
    ))
    test_db.refresh(prod)
    assert prod.current_stock == initial_stock - Decimal("3.00")

    # 2. Cancel the Order
    cancelled_order = OrderService.cancel_order(test_db, order.id, reason="Customer cancelled by phone")
    assert cancelled_order.status == "CANCELLED"

    test_db.refresh(prod)
    assert prod.current_stock == initial_stock

def test_converted_invoice_cancellation_restores_order_stock(test_db):
    """Verifies that cancelling an invoice converted from an order restores original warehouse stock."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()
    initial_stock = prod.current_stock

    # 1. Create Order
    order = OrderService.create_order(test_db, OrderCreate(
        customer_id=cust.id,
        items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("4.00"), unit_price=Decimal("250.00"))]
    ))
    test_db.refresh(prod)
    assert prod.current_stock == initial_stock - Decimal("4.00")

    # 2. Convert to Invoice
    inv = OrderService.convert_order_to_invoice(test_db, order.id)
    test_db.refresh(prod)
    # Stock must not be double deducted
    assert prod.current_stock == initial_stock - Decimal("4.00")

    # 3. Cancel the Invoice
    BillingService.cancel_or_void_invoice(test_db, inv.id, "CANCELLED", reason="Order rejected at delivery")
    test_db.refresh(prod)
    # Stock must be safely restored to original
    assert prod.current_stock == initial_stock

def test_thermal_receipt_zero_tax_policy(test_db):
    """Verifies that thermal print payload strictly keeps GST/tax at 0.0 for RAIS wholesale customers."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    inv = BillingService.create_invoice(test_db, InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"), unit_price=Decimal("250.00"))],
        auto_issue=True
    ))

    receipt = ThermalPrintService.build_thermal_receipt_payload(inv, paper_width=58)
    financials = receipt["financials"]
    assert financials["tax_total"] == 0.0
    assert financials["cgst"] == 0.0
    assert financials["sgst"] == 0.0

def test_customer_contact_person_in_invoice_and_thermal_receipt(test_db):
    """Verifies that customer person/contact name is accurately populated and displayed on invoices and receipts."""
    cust = test_db.query(Customer).first()
    cust.business_name = "AFC Sundupalli Outlet"
    cust.contact_person = "Mohammad Shafi"
    test_db.commit()

    prod = test_db.query(Product).first()

    inv = BillingService.create_invoice(test_db, InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("1.00"), unit_price=Decimal("250.00"))],
        auto_issue=True
    ))

    inv_resp = BillingService.get_invoice_by_id(test_db, inv.id)
    assert inv_resp.customer_name == "AFC Sundupalli Outlet"
    assert inv_resp.customer_contact == "Mohammad Shafi"

    receipt = ThermalPrintService.build_thermal_receipt_payload(inv, paper_width=58)
    assert receipt["invoice_meta"]["customer_contact"] == "Mohammad Shafi"
    assert "Mohammad Shafi" in receipt["invoice_meta"]["customer_name"]
    assert "AFC Sundupalli Outlet" in receipt["invoice_meta"]["customer_name"]

def test_payment_receipt_fields_and_print_html(test_db):
    """Verifies that PaymentResponse includes customer_phone, customer_outstanding_balance, and print-html renders cleanly."""
    cust = test_db.query(Customer).first()
    cust.business_name = "Golden Fry Point"
    cust.contact_person = "Imran Khan"
    cust.phone = "9876543210"
    test_db.commit()

    # Record payment
    payment = PaymentService.record_payment(
        test_db,
        PaymentCreate(
            customer_id=cust.id,
            amount=Decimal("1500.00"),
            payment_date=date.today(),
            payment_method="UPI",
            reference_number="UPI-9876543210"
        ),
        user_id="user-1",
        username="admin"
    )

    resp = PaymentService.get_payment_by_id(test_db, payment.id)
    assert resp.customer_name == "Golden Fry Point"
    assert resp.customer_contact == "Imran Khan"
    assert resp.customer_phone == "9876543210"
    assert resp.customer_outstanding_balance is not None

    from app.api.payments import get_printable_payment
    html_resp = get_printable_payment(payment.id, test_db)
    html_content = html_resp.body.decode("utf-8")
    assert "Golden Fry Point" in html_content
    assert "Imran Khan" in html_content
    assert "9876543210" in html_content
    assert "₹1,500.00" in html_content
    assert "OFFICIAL PAYMENT RECEIPT" in html_content

def test_order_print_html(test_db):
    """Verifies that Order print-html renders customer details, item table, and amounts accurately."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    order = OrderService.create_order(
        test_db,
        OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("5.00"), unit_price=Decimal("250.00"))]
        )
    )

    from app.api.orders import get_printable_order
    html_resp = get_printable_order(order.id, test_db)
    html_content = html_resp.body.decode("utf-8")
    assert order.order_number in html_content
    assert cust.business_name in html_content
    assert "WHOLESALE ORDER BOOKING" in html_content
    assert "₹1,250.00" in html_content

def test_customer_statement_print_html(test_db):
    """Verifies that Customer Account Statement print-html renders ledger history and outstanding balance."""
    cust = test_db.query(Customer).first()

    from app.api.customers import get_printable_statement
    html_resp = get_printable_statement(cust.id, test_db)
    html_content = html_resp.body.decode("utf-8")
    assert cust.business_name in html_content
    assert cust.customer_code in html_content
    assert "CUSTOMER ACCOUNT STATEMENT" in html_content

def test_margin_leakage_endpoint(test_db):
    """Verifies that get_margin_leakage accurately detects items sold below purchase cost."""
    from app.models.inventory import StockMovement
    from app.api.audit import get_margin_leakage

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # 1. Record an inward procurement movement with true landed cost = Rs. 280.00
    sm = StockMovement(
        product_id=prod.id,
        movement_type="RECEIPT",
        quantity_change=Decimal("100.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("100.00"),
        unit="1 KG",
        purchase_cost=Decimal("280.00"),
        reference_number="PO-TEST-001"
    )
    test_db.add(sm)
    test_db.flush()

    # 2. Bill the item below landed cost: unit_price = Rs. 200.00 (loss = Rs. 80.00 / unit)
    invoice = BillingService.create_invoice(
        test_db,
        InvoiceCreate(
            customer_id=cust.id,
            items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"), unit_price=Decimal("200.00"))]
        )
    )
    BillingService.issue_invoice(test_db, invoice.id)

    # 3. Call the margin leakage audit API
    result = get_margin_leakage(db=test_db)

    assert result["summary"]["total_items"] == 1
    assert result["summary"]["total_loss"] == 160.00
    assert result["summary"]["worst_sku"] == prod.sku
    assert len(result["items"]) == 1
    item = result["items"][0]
    assert item["sku"] == prod.sku
    assert item["unit_price"] == 200.00
    assert item["landed_cost"] == 280.00
    assert item["unit_loss"] == 80.00
    assert item["total_loss"] == 160.00
    assert item["classification"] == "BELOW_COST_DISCOUNT"

def test_customer_pricing_history_endpoint(test_db):
    """Verifies that get_customer_pricing_history retrieves the most recent billed price per product for a customer."""
    from app.api.customers import get_customer_pricing_history

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # Bill the customer at a special negotiated rate: Rs. 280.00
    inv = BillingService.create_invoice(
        test_db,
        InvoiceCreate(
            customer_id=cust.id,
            items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("1.00"), unit_price=Decimal("280.00"))]
        )
    )
    BillingService.issue_invoice(test_db, inv.id)

    # Call customer pricing history API
    history = get_customer_pricing_history(customer_id=cust.id, db=test_db)
    assert prod.id in history
    assert history[prod.id]["last_price"] == 280.00
    assert history[prod.id]["invoice_number"] == inv.invoice_number

def test_executive_briefing_and_dynamic_stockout(test_db):
    """Verifies that GET /api/executive/briefing returns 100% dynamic metrics, bilingual text, and handles dynamic stockouts."""
    from app.api.executive import get_executive_briefing
    from app.models.user import User

    fake_user = User(id="user-vp-1", username="vp_owner", email="vp@rais.com", role="ADMIN", is_active=True)

    # 1. Create a out-of-stock product (e.g. Delmonte Ketchup)
    cat = test_db.query(Category).first()
    delmonte = Product(
        sku="RAIS-SAU-03",
        category_id=cat.id,
        name="DELMONTE KETCHUP (8 GRAM PKT)",
        brand="Delmonte",
        packaging_unit="1 PACKET",
        base_price=Decimal("150.00"),
        tax_rate=Decimal("12.00"),
        current_stock=Decimal("0.00"),  # Out of stock!
        min_stock_alert=Decimal("10.00"),
        is_active=True
    )
    test_db.add(delmonte)
    test_db.flush()

    # Call briefing when Delmonte is out of stock
    briefing1 = get_executive_briefing(db=test_db, current_user=fake_user)
    assert "vital_signs" in briefing1
    assert "traffic_lights" in briefing1
    assert "priorities" in briefing1
    assert "market_intelligence" in briefing1
    assert len(briefing1["priorities"]) == 3

    # Priority 2 must be depot_stockouts and include Delmonte
    p2 = briefing1["priorities"][1]
    assert p2["id"] == "depot_stockouts"
    assert p2["stockouts_count"] >= 1
    assert p2["top_product_name"] == "DELMONTE KETCHUP (8 GRAM PKT)"
    assert "summary_en" in p2 and "summary_te" in p2
    assert "తెలుగు" not in p2["summary_te"] # authentic Telugu content
    assert "డెల్‌మోంటే" in p2["summary_te"] or "సరుకు" in p2["summary_te"]

    # 2. Now user inwards stock for Delmonte (e.g. current_stock becomes 50)
    delmonte.current_stock = Decimal("50.00")
    test_db.flush()

    # Call briefing again - Delmonte should NOT show up as stockout!
    briefing2 = get_executive_briefing(db=test_db, current_user=fake_user)
    p2_updated = briefing2["priorities"][1]
    if p2_updated["stockouts_count"] > 0:
        assert p2_updated["top_product_sku"] != "RAIS-SAU-03"
    else:
        assert p2_updated["stockouts_count"] == 0
        assert p2_updated["urgency"] == "HEALTHY"

def test_executive_handover_memo(test_db):
    """Verifies brother collaborative handover memo GET and POST."""
    from app.api.executive import get_executive_memo, update_executive_memo
    from app.models.user import User

    fake_user = User(id="user-vp-1", username="vp_owner", full_name="Brother 1", role="ADMIN", is_active=True)

    # Initial memo
    memo1 = get_executive_memo(db=test_db, current_user=fake_user)
    assert "memo" in memo1

    # Update memo
    updated = update_executive_memo(
        memo="Deposited ₹15,000 cash in bank. Sundupalli van delivery at 3 PM.",
        updated_by="Brother 1",
        db=test_db,
        current_user=fake_user
    )
    assert updated["memo"] == "Deposited ₹15,000 cash in bank. Sundupalli van delivery at 3 PM."
    assert updated["updated_by"] == "Brother 1"

    # Read back memo
    memo2 = get_executive_memo(db=test_db, current_user=fake_user)
    assert memo2["memo"] == "Deposited ₹15,000 cash in bank. Sundupalli van delivery at 3 PM."
    assert memo2["updated_by"] == "Brother 1"

def test_payment_with_settlement_cash_discount(test_db):
    """Verifies that recording payment with a cash discount (customer paid less) settles the invoice and ledger completely."""
    from app.services.billing_service import BillingService
    from app.services.payment_service import PaymentService
    from app.services.customer_service import CustomerService
    from app.schemas.payment import PaymentCreate, PaymentAllocationCreate
    from app.domain.enums import InvoiceStatus

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # 1. Create and issue invoice for Rs. 5564.40
    # Price = 5300 + 5% tax = 5565, or explicit rate
    inv = BillingService.create_invoice(
        test_db,
        InvoiceCreate(
            customer_id=cust.id,
            items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("10.00"), unit_price=Decimal("530.00"))]
        )
    )
    BillingService.issue_invoice(test_db, inv.id)
    issued_inv = test_db.query(Invoice).filter(Invoice.id == inv.id).first()
    due_before = float(issued_inv.outstanding_amount)

    # 2. Customer pays Rs. 20 less as settlement concession
    discount_concession = Decimal("20.00")
    received_cash = Decimal(str(due_before)) - discount_concession

    pay = PaymentService.record_payment(
        test_db,
        PaymentCreate(
            customer_id=cust.id,
            amount=received_cash,
            discount_amount=discount_concession,
            payment_method="UPI",
            allocations=[PaymentAllocationCreate(invoice_id=issued_inv.id, amount=received_cash)]
        )
    )

    test_db.refresh(issued_inv)
    # The invoice outstanding must be 0.00 and status must be PAID
    assert issued_inv.outstanding_amount == Decimal("0.00")
    assert issued_inv.status == InvoiceStatus.PAID.value
    assert issued_inv.discount_amount >= Decimal("20.00")

    # The line item must reflect the discount in discount_amount and line_total
    item = issued_inv.items[0]
    assert item.discount_amount >= Decimal("20.00")
    assert item.line_total == Decimal(str(due_before)) - Decimal("20.00")

    # Customer ledger outstanding must be 0.00
    _, _, net_balance = CustomerService.get_customer_balances(test_db, cust.id)
    assert net_balance == Decimal("0.00")

    # 3. Test printable receipt reflects the discount banner
    from app.api.payments import get_printable_payment
    receipt_html = get_printable_payment(pay.id, test_db)
    receipt_body = receipt_html.body.decode("utf-8")
    assert "Settlement Cash Discount / Round-off Applied" in receipt_body
    assert "20.00" in receipt_body

def test_payment_with_settlement_cash_discount_fifo(test_db):
    """Verifies that paying less with cash discount via general unallocated pool settles open invoice via FIFO."""
    from app.services.billing_service import BillingService
    from app.services.payment_service import PaymentService
    from app.services.customer_service import CustomerService
    from app.schemas.payment import PaymentCreate
    from app.domain.enums import InvoiceStatus

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    inv = BillingService.create_invoice(
        test_db,
        InvoiceCreate(
            customer_id=cust.id,
            items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("5.00"), unit_price=Decimal("1000.00"))]
        )
    )
    BillingService.issue_invoice(test_db, inv.id)
    issued_inv = test_db.query(Invoice).filter(Invoice.id == inv.id).first()
    due_before = float(issued_inv.outstanding_amount)

    discount_concession = Decimal("20.00")
    received_cash = Decimal(str(due_before)) - discount_concession

    # No allocations passed (e.g. user selected unallocated pool)
    pay = PaymentService.record_payment(
        test_db,
        PaymentCreate(
            customer_id=cust.id,
            amount=received_cash,
            discount_amount=discount_concession,
            payment_method="CASH",
            allocations=[]
        )
    )

    test_db.refresh(issued_inv)
    assert issued_inv.outstanding_amount == Decimal("0.00")
    assert issued_inv.status == InvoiceStatus.PAID.value
    assert issued_inv.discount_amount >= Decimal("20.00")

    item = issued_inv.items[0]
    assert item.discount_amount >= Decimal("20.00")
    assert item.line_total == Decimal(str(due_before)) - Decimal("20.00")

    _, _, net_balance = CustomerService.get_customer_balances(test_db, cust.id)
    assert net_balance == Decimal("0.00")







