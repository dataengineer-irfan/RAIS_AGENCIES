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


