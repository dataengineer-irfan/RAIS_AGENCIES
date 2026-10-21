import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.invoice import Invoice
from app.domain.enums import UserRole, InvoiceStatus
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.payment import PaymentCreate, PaymentAllocationCreate
from app.core.exceptions import InvalidFinancialOperationException

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Seed minimal entities
    cat = Category(code="VEG", name="Veg", display_order=1)
    db.add(cat)
    db.flush()

    prod = Product(
        sku="TEST-FRIES",
        category_id=cat.id,
        name="Test French Fries",
        brand="Hup Hup",
        packaging_unit="2.5 KG",
        base_price=Decimal("300.00"),
        tax_rate=Decimal("5.00"),
        current_stock=Decimal("100.00")
    )
    db.add(prod)

    cust = Customer(
        customer_code="CUST-0001",
        business_name="Test Burger Joint",
        contact_person="Ravi",
        phone="9999999999",
        address_line1="Rayachoty",
        credit_limit=Decimal("10000.00")
    )
    db.add(cust)
    db.commit()

    yield db
    db.close()

def test_full_invoice_and_payment_lifecycle(test_db):
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()

    # 1. Create Invoice for 2 packs (2 * 300 = 600.00 wholesale flat)
    inv_data = InvoiceCreate(
        customer_id=cust.id,
        auto_issue=True,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"))]
    )
    inv = BillingService.create_invoice(test_db, inv_data)
    assert inv.status == InvoiceStatus.ISSUED.value
    assert inv.total_amount == Decimal("600.00")
    assert inv.outstanding_amount == Decimal("600.00")
    assert inv.paid_amount == Decimal("0.00")

    # 2. Record partial payment of Rs.300
    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("300.00"),
        payment_method="UPI",
        allocations=[PaymentAllocationCreate(invoice_id=inv.id, amount=Decimal("300.00"))]
    )
    pay = PaymentService.record_payment(test_db, pay_data)
    
    test_db.refresh(inv)
    assert inv.status == InvoiceStatus.PARTIALLY_PAID.value
    assert inv.paid_amount == Decimal("300.00")
    assert inv.outstanding_amount == Decimal("300.00")
    assert pay.unallocated_amount == Decimal("0.00")

    # 3. Prevent over-allocation
    with pytest.raises(InvalidFinancialOperationException):
        PaymentService.allocate_payment(test_db, pay.id, inv.id, Decimal("500.00"))

    # 4. Settle remainder with second payment of Rs.300
    pay2_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("300.00"),
        payment_method="CASH",
        allocations=[PaymentAllocationCreate(invoice_id=inv.id, amount=Decimal("300.00"))]
    )
    pay2 = PaymentService.record_payment(test_db, pay2_data)

    test_db.refresh(inv)
    assert inv.status == InvoiceStatus.PAID.value
    assert inv.paid_amount == Decimal("600.00")
    assert inv.outstanding_amount == Decimal("0.00")


def test_invoice_insufficient_stock_rejection(test_db):
    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()
    initial_stock = prod.current_stock

    inv_data = InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("150.00"), unit_price=Decimal("300.00"))],
        auto_issue=True
    )

    with pytest.raises(InvalidFinancialOperationException) as exc_info:
        BillingService.create_invoice(test_db, inv_data)

    assert "Insufficient stock" in str(exc_info.value)
    test_db.refresh(prod)
    assert prod.current_stock == initial_stock


def test_order_insufficient_stock_rejection(test_db):
    from app.services.order_service import OrderService
    from app.schemas.order import OrderCreate, OrderItemCreate

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()
    initial_stock = prod.current_stock

    order_data = OrderCreate(
        customer_id=cust.id,
        items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("150.00"), unit_price=Decimal("300.00"))]
    )

    with pytest.raises(InvalidFinancialOperationException) as exc_info:
        OrderService.create_order(test_db, order_data)

    assert "Insufficient stock" in str(exc_info.value)
    test_db.refresh(prod)
    assert prod.current_stock == initial_stock


def test_order_creation_and_stock_deduction(test_db):
    from app.services.order_service import OrderService
    from app.schemas.order import OrderCreate, OrderItemCreate
    from app.models.inventory import StockMovement

    cust = test_db.query(Customer).first()
    prod = test_db.query(Product).first()
    initial_stock = prod.current_stock

    order_data = OrderCreate(
        customer_id=cust.id,
        items=[OrderItemCreate(product_id=prod.id, quantity=Decimal("20.00"), unit_price=Decimal("300.00"))]
    )

    order = OrderService.create_order(test_db, order_data)
    test_db.commit()

    test_db.refresh(prod)
    assert prod.current_stock == initial_stock - Decimal("20.00")

    movement = test_db.query(StockMovement).filter(
        StockMovement.product_id == prod.id,
        StockMovement.movement_type == "ORDER_DEDUCTION"
    ).first()
    assert movement is not None
    assert movement.quantity_change == Decimal("-20.00")
    assert movement.new_stock == initial_stock - Decimal("20.00")


def test_cash_account_invoice_auto_settlement(test_db):
    """
    Validates that counter cash sales under 'Cash account' (or CUST-0044) are automatically
    and atomically settled as PAID with 0 outstanding balance upon creation.
    """
    prod = test_db.query(Product).first()

    cash_cust = Customer(
        customer_code="CUST-0044",
        business_name="Cash account",
        contact_person="Counter Walk-in",
        phone="9999999990",
        address_line1="Rayachoty Counter"
    )
    test_db.add(cash_cust)
    test_db.commit()

    inv_data = InvoiceCreate(
        customer_id=cash_cust.id,
        auto_issue=True,
        payment_terms="Cash on Delivery / Immediate Settlement",
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("3.00"))]
    )

    inv = BillingService.create_invoice(test_db, inv_data)

    assert inv.status == InvoiceStatus.PAID.value
    assert inv.total_amount == Decimal("900.00")
    assert inv.paid_amount == Decimal("900.00")
    assert inv.outstanding_amount == Decimal("0.00")

    # Verify payment record was automatically created and linked
    from app.models.payment import Payment, PaymentAllocation
    pmt = test_db.query(Payment).filter(Payment.customer_id == cash_cust.id).first()
    assert pmt is not None
    assert pmt.amount == Decimal("900.00")
    assert pmt.allocated_amount == Decimal("900.00")
    assert pmt.unallocated_amount == Decimal("0.00")
    assert pmt.payment_method == "CASH"

    alloc = test_db.query(PaymentAllocation).filter(PaymentAllocation.invoice_id == inv.id).first()
    assert alloc is not None
    assert alloc.allocated_amount == Decimal("900.00")


def test_mark_as_paid_invoice_auto_settlement(test_db):
    """
    Validates that any customer bill created with mark_as_paid=True is atomically settled as PAID.
    """
    cust = test_db.query(Customer).filter(Customer.customer_code == "CUST-0001").first()
    prod = test_db.query(Product).first()

    inv_data = InvoiceCreate(
        customer_id=cust.id,
        auto_issue=True,
        mark_as_paid=True,
        payment_terms="Immediate UPI / Online Settlement",
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("1.00"))]
    )

    inv = BillingService.create_invoice(test_db, inv_data)

    assert inv.status == InvoiceStatus.PAID.value
    assert inv.total_amount == Decimal("300.00")
    assert inv.paid_amount == Decimal("300.00")
    assert inv.outstanding_amount == Decimal("0.00")

    from app.models.payment import Payment
    pmt = test_db.query(Payment).filter(Payment.customer_id == cust.id).order_by(Payment.created_at.desc()).first()
    assert pmt is not None
    assert pmt.amount == Decimal("300.00")
    assert pmt.payment_method == "UPI"

