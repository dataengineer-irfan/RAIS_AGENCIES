import pytest
from decimal import Decimal
from datetime import date
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.models.payment import Payment, PaymentAllocation
from app.models.invoice import Invoice
from app.domain.enums import InvoiceStatus
from app.api.payments import get_printable_payment, get_payment_image

def test_payment_receipt_promotional_spotlight_rendering(db):
    # Setup test category & customer (PIZZA TIME)
    cat = db.query(Category).first()
    if not cat:
        cat = Category(code="PIZZA_CAT", name="Pizza Supplies", display_order=1, is_active=True)
        db.add(cat)
        db.flush()

    customer = Customer(
        id="cust-pizzatime-promo",
        business_name="PIZZA TIME",
        customer_code="CUST-0013",
        phone="9182248206",
        address_line1="Chinnamandem Main Road",
        city="Chinnamandem",
        pincode="516214",
        contact_person="Tayassar",
        opening_balance=Decimal("20000.00")
    )
    db.add(customer)
    db.flush()

    # Create payment of 3000.00
    payment = Payment(
        id="pay-promo-test-1",
        payment_number="PAY-202611-00037",
        customer_id=customer.id,
        amount=Decimal("3000.00"),
        payment_date=date.today(),
        payment_method="UPI",
        reference_number="UPI Transfer",
        allocated_amount=Decimal("3000.00"),
        unallocated_amount=Decimal("0.00")
    )
    db.add(payment)
    db.commit()

    # 1. Test HTML printable payment voucher
    html_resp = get_printable_payment(payment.id, db)
    html_content = html_resp.body.decode("utf-8")

    assert "In Depot Stock" in html_content
    assert "DELMONTE PIZZA PASTA SAUCE" in html_content or "PIZZA" in html_content
    assert "1-Tap WhatsApp Order" in html_content

    # 2. Test Image card generation
    img_resp = get_payment_image(payment.id, db)
    assert img_resp.media_type == "image/png"
    assert len(img_resp.body) > 1000  # valid image bytes with promotional strip rendered
