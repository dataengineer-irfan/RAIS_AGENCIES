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

    # 1. Create Invoice for 2 packs (2 * 300 = 600 + 5% tax = 630.00)
    inv_data = InvoiceCreate(
        customer_id=cust.id,
        auto_issue=True,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"))]
    )
    inv = BillingService.create_invoice(test_db, inv_data)
    assert inv.status == InvoiceStatus.ISSUED.value
    assert inv.total_amount == Decimal("630.00")
    assert inv.outstanding_amount == Decimal("630.00")
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
    assert inv.outstanding_amount == Decimal("330.00")
    assert pay.unallocated_amount == Decimal("0.00")

    # 3. Prevent over-allocation
    with pytest.raises(InvalidFinancialOperationException):
        PaymentService.allocate_payment(test_db, pay.id, inv.id, Decimal("500.00"))

    # 4. Settle remainder with second payment of Rs.330
    pay2_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("330.00"),
        payment_method="CASH",
        allocations=[PaymentAllocationCreate(invoice_id=inv.id, amount=Decimal("330.00"))]
    )
    pay2 = PaymentService.record_payment(test_db, pay2_data)

    test_db.refresh(inv)
    assert inv.status == InvoiceStatus.PAID.value
    assert inv.paid_amount == Decimal("630.00")
    assert inv.outstanding_amount == Decimal("0.00")
