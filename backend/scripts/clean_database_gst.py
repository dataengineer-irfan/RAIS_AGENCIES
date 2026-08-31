import os
import sys
from decimal import Decimal

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.models.catalogue import Product
from app.models.invoice import Invoice, InvoiceItem
from app.models.order import Order, OrderItem
from app.services.billing_service import quantize_amount

def clean_database_gst_and_dates():
    db = SessionLocal()
    try:
        print("[Step 1] Updating all products to 0.00% tax rate...")
        products = db.query(Product).all()
        for p in products:
            p.tax_rate = Decimal("0.00")
        print(f"  -> Updated {len(products)} products to 0% tax rate.")

        print("\n[Step 2] Cleaning existing invoice line items and totals...")
        invoices = db.query(Invoice).all()
        for inv in invoices:
            # Sync due date to invoice date
            inv.due_date = inv.invoice_date
            if "15 days" in (inv.payment_terms or ""):
                inv.payment_terms = "Cash on Delivery / Immediate Settlement"
            
            subtotal = Decimal("0.00")
            item_discounts = Decimal("0.00")
            
            for itm in inv.items:
                itm.tax_rate = Decimal("0.00")
                itm.tax_amount = Decimal("0.00")
                
                qty = Decimal(str(itm.quantity))
                price = Decimal(str(itm.unit_price))
                disc_rate = Decimal(str(itm.discount_rate or 0))
                
                gross = quantize_amount(qty * price)
                disc = quantize_amount(gross * (disc_rate / Decimal("100.00")))
                taxable = quantize_amount(gross - disc)
                
                itm.discount_amount = disc
                itm.taxable_amount = taxable
                itm.line_total = taxable # No GST
                
                subtotal += gross
                item_discounts += disc
            
            inv.subtotal = subtotal
            net_disc = quantize_amount(item_discounts + (inv.discount_amount or Decimal("0.00")))
            inv.taxable_amount = quantize_amount(subtotal - net_disc)
            inv.tax_amount = Decimal("0.00")
            inv.total_amount = quantize_amount(inv.taxable_amount)
            
            paid = Decimal(str(inv.paid_amount or 0))
            inv.outstanding_amount = quantize_amount(max(Decimal("0.00"), inv.total_amount - paid))
        
        print(f"  -> Cleaned and recalculated {len(invoices)} invoices (Tax = 0.00, Due Date = Invoice Date).")

        print("\n[Step 3] Cleaning existing orders...")
        orders = db.query(Order).all()
        for o in orders:
            o.tax_amount = Decimal("0.00")
            o.total_amount = o.subtotal
            for itm in o.items:
                qty = Decimal(str(itm.quantity))
                price = Decimal(str(itm.unit_price))
                itm.line_total = quantize_amount(qty * price)
        print(f"  -> Cleaned {len(orders)} orders.")

        db.commit()
        print("\n[SUCCESS] All products, invoices, and orders database records updated to 0% GST, Cash same-day terms!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database cleanup failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clean_database_gst_and_dates()
