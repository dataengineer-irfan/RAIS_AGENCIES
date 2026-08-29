import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Ensure utf-8 stdout on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from sqlalchemy import text, inspect
from app.core.database import SessionLocal, engine

def inspect_database():
    db = SessionLocal()
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    print("=" * 80)
    print("RAIS AGENCIES -- LIVE DATABASE AUDIT & DATA INVENTORY")
    print("=" * 80)
    print(f"Total Tables Found: {len(table_names)}\n")

    for table in sorted(table_names):
        columns = inspector.get_columns(table)
        pk_constraint = inspector.get_pk_constraint(table)
        fk_constraints = inspector.get_foreign_keys(table)

        # Count records
        res = db.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()

        print(f"* Table: [{table.upper()}] -- Total Rows: {res}")
        col_summary = ", ".join([f"{c['name']} ({c['type']})" for c in columns[:6]])
        if len(columns) > 6:
            col_summary += f", ... (+{len(columns)-6} more)"
        print(f"  Columns: {col_summary}")
        if fk_constraints:
            for fk in fk_constraints:
                print(f"  FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        print()

    # Specific Data Breakdown for Business Users
    print("=" * 80)
    print("SPECIFIC RECORD BREAKDOWN & DETAILS:")
    print("=" * 80)

    # 1. Users
    users = db.execute(text('SELECT username, full_name, role, is_active FROM users')).mappings().all()
    print("\n1. SYSTEM USERS (Authentication & Roles):")
    for u in users:
        print(f"   - {u['username']:<12} | Role: {u['role']:<10} | Name: {u['full_name']}")

    # 2. Categories
    cats = db.execute(text('SELECT code, name, display_order FROM categories ORDER BY display_order')).mappings().all()
    print(f"\n2. PRODUCT CATEGORIES ({len(cats)} categories):")
    for c in cats:
        print(f"   - [{c['code']}] {c['name']}")

    # 3. Products
    products = db.execute(text('SELECT sku, name, brand, base_price, tax_rate, current_stock FROM products ORDER BY sku')).mappings().all()
    print(f"\n3. MASTER PRODUCT SKUs ({len(products)} SKUs):")
    for p in products[:12]:
        print(f"   - {p['sku']:<18} | {p['name']:<35} | {p['brand']:<10} | Rs. {float(p['base_price']):<7.2f} + {float(p['tax_rate'])}% GST | Stock: {float(p['current_stock']):.0f}")
    if len(products) > 12:
        print(f"   ... and {len(products)-12} more SKUs.")

    # 4. Customers
    custs = db.execute(text('SELECT customer_code, business_name, contact_person, phone, city, credit_limit FROM customers ORDER BY customer_code')).mappings().all()
    print(f"\n4. REGISTERED B2B CUSTOMERS ({len(custs)} clients in Rayachoty & Region):")
    for cu in custs:
        print(f"   - {cu['customer_code']} | {cu['business_name']:<32} | Contact: {cu['contact_person']} ({cu['phone']}) | City: {cu['city']}")

    # 5. Invoices & Financials
    inv_count = db.execute(text('SELECT COUNT(*), SUM(total_amount), SUM(paid_amount), SUM(outstanding_amount) FROM invoices')).fetchone()
    print(f"\n5. INVOICES & FINANCIALS:")
    print(f"   - Total Invoices Generated: {inv_count[0]}")
    print(f"   - Total Billed Revenue:    Rs. {float(inv_count[1] or 0):,.2f}")
    print(f"   - Total Amount Settled:    Rs. {float(inv_count[2] or 0):,.2f}")
    print(f"   - Total Outstanding Due:   Rs. {float(inv_count[3] or 0):,.2f}")

    # 6. Orders
    ord_count = db.execute(text('SELECT COUNT(*), SUM(total_amount) FROM orders')).fetchone()
    print(f"\n6. ADVANCE BOOKINGS & ORDERS:")
    print(f"   - Total Orders Booked:     {ord_count[0]}")
    print(f"   - Total Order Value:       Rs. {float(ord_count[1] or 0):,.2f}")

    # 7. Payments
    pay_count = db.execute(text('SELECT COUNT(*), SUM(amount) FROM payments')).fetchone()
    print(f"\n7. PAYMENT SETTLEMENTS:")
    print(f"   - Total Payments Logged:   {pay_count[0]}")
    print(f"   - Total Collected Amount:  Rs. {float(pay_count[1] or 0):,.2f}")

    # 8. Document Sequences
    seqs = db.execute(text('SELECT doc_type, prefix, year_month, current_number FROM document_sequences')).mappings().all()
    print(f"\n8. DOCUMENT SEQUENCES ({len(seqs)} sequences):")
    for s in seqs:
        print(f"   - {s['doc_type']:<10} | Prefix: {s['prefix']} | YearMonth: {s['year_month']} | Next Seq: {s['current_number']}")

    db.close()

if __name__ == "__main__":
    inspect_database()
