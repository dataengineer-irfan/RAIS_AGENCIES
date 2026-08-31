import pytest
from decimal import Decimal
from app.services.billing_service import BillingService, quantize_amount

def test_quantize_amount():
    assert quantize_amount(Decimal("10.555")) == Decimal("10.56")
    assert quantize_amount(Decimal("10.554")) == Decimal("10.55")
    assert quantize_amount(Decimal("100")) == Decimal("100.00")

def test_invoice_line_calculation_without_gst_and_discount():
    # 4 packets of Hup Hup French Fries @ Rs.310 with NO GST
    items = [{
        "quantity": Decimal("4.00"),
        "unit_price": Decimal("310.00"),
        "discount_rate": Decimal("0.00"),
        "tax_rate": Decimal("0.00")
    }]
    res = BillingService.calculate_invoice_totals(items, Decimal("0.00"))
    
    assert res["subtotal"] == Decimal("1240.00")
    assert res["discount_amount"] == Decimal("0.00")
    assert res["taxable_amount"] == Decimal("1240.00")
    assert res["tax_amount"] == Decimal("0.00") # No GST
    assert res["total_amount"] == Decimal("1240.00")

def test_invoice_line_calculation_with_discounts_and_no_gst():
    # 2 packets of Milky Mist Mozzarella @ Rs.920 with 10% line discount and NO GST
    # Plus Rs.40 invoice level discount
    items = [{
        "quantity": Decimal("2.00"),
        "unit_price": Decimal("920.00"),
        "discount_rate": Decimal("10.00"),
        "tax_rate": Decimal("0.00")
    }]
    res = BillingService.calculate_invoice_totals(items, Decimal("40.00"))
    
    # Gross: 2 * 920 = 1840.00
    # Line Disc: 1840 * 0.10 = 184.00
    # Line Total: 1840 - 184 = 1656.00
    # Line Tax: 0.00
    # Total Disc: 184 + 40 = 224.00
    # Final Taxable / Net Total: 1840 - 224 = 1616.00
    assert res["subtotal"] == Decimal("1840.00")
    assert res["discount_amount"] == Decimal("224.00")
    assert res["taxable_amount"] == Decimal("1616.00")
    assert res["tax_amount"] == Decimal("0.00")
    assert res["total_amount"] == Decimal("1616.00")
