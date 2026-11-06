import pytest
from decimal import Decimal
from datetime import date
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem
from app.domain.enums import InvoiceStatus
from app.api.invoices import get_printable_invoice

def test_printable_invoice_total_outstanding_balance_rendering(db):
    # Fetch or create category
    cat_pkg = db.query(Category).first()
    if not cat_pkg:
        cat_pkg = Category(code="PACKAGING", name="Packaging", display_order=1, is_active=True)
        db.add(cat_pkg)
        db.flush()

    # Setup customer with past debt (opening balance = 4000.00)
    customer = Customer(
        id="cust-sundupalli-123",
        business_name="MFC SUNDUPALLI",
        customer_code="CUST-0038",
        phone="7989464648",
        address_line1="Main road, Sundupalli",
        city="Sundupalli",
        pincode="516269",
        contact_person="Mohammed",
        opening_balance=Decimal("4000.00")
    )
    db.add(customer)
    db.flush()

    product = Product(
        id="prod-box-sundupalli-1",
        category_id=cat_pkg.id,
        name="CHICKEN BOX 4x5x8",
        sku="BOX-CHK-458",
        base_price=Decimal("540.00"),
        brand="RAIS",
        packaging_unit="100 NOS"
    )
    db.add(product)
    db.flush()

    # Issued invoice for 830.00 (unpaid)
    inv = Invoice(
        id="inv-6effb426-sundupalli",
        invoice_number="INV-202611-00047",
        customer_id=customer.id,
        status=InvoiceStatus.ISSUED.value,
        invoice_date=date.today(),
        due_date=date.today(),
        subtotal=Decimal("830.00"),
        discount_amount=Decimal("0.00"),
        taxable_amount=Decimal("830.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("830.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("830.00")
    )
    db.add(inv)
    db.flush()

    item = InvoiceItem(
        id="item-sundupalli-1",
        invoice_id=inv.id,
        product_id=product.id,
        item_description="CHICKEN BOX 4x5x8",
        packaging_unit="100 NOS",
        hsn_code="4819",
        quantity=Decimal("1.00"),
        unit_price=Decimal("540.00"),
        line_total=Decimal("540.00")
    )
    db.add(item)
    db.commit()

    # Call get_printable_invoice
    html_resp = get_printable_invoice(inv.id, db)
    html_content = html_resp.body.decode("utf-8")

    # Assertions for Customer Total Outstanding Balance & Breakdown
    assert "Total Outstanding Balance:" in html_content
    assert "Previous Ledger Balance:" in html_content
    assert "Driver & Counter Collection Slip" in html_content or "Driver &amp; Counter Collection Slip" in html_content
    assert "₹4000.00" in html_content  # Previous balance
    assert "₹4830.00" in html_content  # Total Customer Outstanding (4000 + 830)
    assert "₹830.00" in html_content   # This invoice due
