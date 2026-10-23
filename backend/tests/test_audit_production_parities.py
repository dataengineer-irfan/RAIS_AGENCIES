import pytest
from decimal import Decimal
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

def test_thermal_receipt_tax_calculation(test_db):
    """Verifies that thermal print payload correctly splits GST into CGST and SGST."""
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    inv = BillingService.create_invoice(test_db, InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"), unit_price=Decimal("250.00"))],
        auto_issue=True
    ))

    # Set tax_amount for testing tax split parity
    inv.tax_amount = Decimal("36.00")
    test_db.flush()

    receipt = ThermalPrintService.build_thermal_receipt_payload(inv, paper_width=58)
    financials = receipt["financials"]
    assert financials["tax_total"] == 36.00
    assert financials["cgst"] == 18.00
    assert financials["sgst"] == 18.00
