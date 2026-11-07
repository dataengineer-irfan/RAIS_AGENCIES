import pytest
from decimal import Decimal
from datetime import date
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.catalogue import Category, Product
from app.schemas.payment import PaymentCreate, PaymentAllocationCreate
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.services.payment_service import PaymentService
from app.services.billing_service import BillingService
from app.domain.enums import PaymentMethod, InvoiceStatus, CustomerStatus
from app.core.exceptions import InvalidFinancialOperationException

@pytest.fixture
def sample_data(db):
    cat = db.query(Category).first()
    if not cat:
        cat = Category(name="Test Cat", code="TST", is_active=True)
        db.add(cat)
        db.flush()

    prod = Product(
        sku="TEST-SKU-DEDUP",
        category_id=cat.id,
        name="Test Deduplication Product",
        brand="RAIS",
        packaging_unit="1 KG",
        base_price=Decimal("315.00"),
        tax_rate=Decimal("0.00"),
        current_stock=Decimal("100.00")
    )
    db.add(prod)

    cust = Customer(
        customer_code="CUST-DEDUP",
        business_name="Test Dedup Cafe",
        contact_person="Tester",
        phone="9988776655",
        address_line1="Rayachoty",
        city="Rayachoty",
        opening_balance=Decimal("0.00"),
        status=CustomerStatus.ACTIVE.value
    )
    db.add(cust)
    db.commit()
    return cust, prod

def test_rapid_fire_duplicate_payment_rejection(db, sample_data):
    """Verifies that submitting an identical payment within 10 seconds is strictly rejected by the backend."""
    cust, _ = sample_data
    
    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("1500.00"),
        payment_method="UPI",
        notes="First attempt"
    )
    
    # 1. First payment succeeds
    pay1 = PaymentService.record_payment(db, pay_data)
    assert pay1.id is not None
    assert pay1.amount == Decimal("1500.00")
    
    # 2. Immediate second submission (same customer, amount, method) within 10s must be rejected
    dup_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("1500.00"),
        payment_method="UPI",
        notes="Rapid double click"
    )
    with pytest.raises(InvalidFinancialOperationException) as exc_info:
        PaymentService.record_payment(db, dup_data)
    
    assert "Rapid-fire duplicate payment prevented" in str(exc_info.value)
    assert "already recorded" in str(exc_info.value)

def test_different_amount_or_method_allowed(db, sample_data):
    """Verifies that legitimate distinct payments (different amount or method) are NOT blocked."""
    cust, _ = sample_data
    
    # Different amount
    pay_data_1 = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("250.00"),
        payment_method="UPI"
    )
    pay1 = PaymentService.record_payment(db, pay_data_1)
    assert pay1.id is not None
    
    pay_data_2 = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("350.00"),
        payment_method="UPI"
    )
    pay2 = PaymentService.record_payment(db, pay_data_2)
    assert pay2.id is not None
    assert pay2.amount == Decimal("350.00")
    
    # Different method
    pay_data_3 = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("350.00"),
        payment_method="CASH"
    )
    pay3 = PaymentService.record_payment(db, pay_data_3)
    assert pay3.id is not None
    assert pay3.payment_method == "CASH"

def test_invoice_image_rendering_no_redundant_entries(db, sample_data):
    """Verifies that invoice image generation runs smoothly and cleanly with unified Option 1 math."""
    from app.api.invoices import get_invoice_image
    
    cust, prod = sample_data
    
    # Create invoice
    inv_data = InvoiceCreate(
        customer_id=cust.id,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("2.00"), unit_price=Decimal("315.00"))],
        auto_issue=True
    )
    inv = BillingService.create_invoice(db, inv_data)
    
    # Settle it with payment
    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("630.00"),
        payment_method="UPI",
        allocations=[PaymentAllocationCreate(invoice_id=inv.id, amount=Decimal("630.00"))]
    )
    PaymentService.record_payment(db, pay_data)
    
    db.refresh(inv)
    assert inv.status == InvoiceStatus.PAID.value
    
    # Generate image
    resp = get_invoice_image(invoice_id=inv.id, db=db)
    assert resp.status_code == 200
    assert resp.media_type == "image/png"
    assert len(resp.body) > 1000
