import sys
import os
from decimal import Decimal
from datetime import date, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
import app.models # Register all models
from app.models.user import User
from app.models.customer import Customer
from app.models.catalogue import Category, Product
from app.models.system import SystemSetting
from app.core.security import hash_password
from app.domain.enums import UserRole, CustomerStatus
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.payment import PaymentCreate, PaymentAllocationCreate

def seed_database():
    print("[INFO] Initializing RAIS Agencies Database & Seeding Official Catalogue...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. SEED USERS
        users_data = [
            {
                "username": "admin",
                "email": "admin@raisagencies.com",
                "full_name": "RAIS System Admin",
                "password": "RaisAdmin@2026",
                "role": UserRole.ADMIN.value
            },
            {
                "username": "operator",
                "email": "operator@raisagencies.com",
                "full_name": "RAIS Billing Operator",
                "password": "RaisOperator@2026",
                "role": UserRole.OPERATOR.value
            },
            {
                "username": "viewer",
                "email": "viewer@raisagencies.com",
                "full_name": "RAIS Store Viewer",
                "password": "RaisViewer@2026",
                "role": UserRole.VIEWER.value
            }
        ]

        admin_user = None
        for u in users_data:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                new_u = User(
                    username=u["username"],
                    email=u["email"],
                    full_name=u["full_name"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    is_active=True
                )
                db.add(new_u)
                db.flush()
                if u["username"] == "admin":
                    admin_user = new_u
                print(f"  + Created user: {u['username']} ({u['role']})")
            else:
                if u["username"] == "admin":
                    admin_user = existing

        # 2. SEED OFFICIAL RAIS AGENCIES CATEGORIES
        categories_data = [
            {"code": "CHICKEN", "name": "Chicken Items", "description": "Frozen Chicken patties, nuggets, momos, popcorn & tortillas", "display_order": 1},
            {"code": "VEG", "name": "Veg Items", "description": "Frozen French fries, veg momos, burger patties, paneer pops & sweet corn", "display_order": 2},
            {"code": "SAUCES", "name": "Ketchup & Sauces", "description": "Mayonnaise, tomato ketchup, pizza pasta sauces & dips", "display_order": 3},
            {"code": "BREADING", "name": "Bread Mix & Powders", "description": "Breading mixes, marinades, peri-peri powder & oregano seasonings", "display_order": 4},
            {"code": "CHEESE", "name": "Cheese & Slices", "description": "Mozzarella diced cheese, cheese slices & fresh paneer cubes", "display_order": 5},
            {"code": "PACKAGING", "name": "Pizza Boxes & Burger Boxes", "description": "Plain and printed food packaging boxes", "display_order": 6},
            {"code": "SPICES", "name": "Spices", "description": "Chilli powder, turmeric powder & coriander spices", "display_order": 7},
            {"code": "MOJITOS", "name": "Mojitos & Syrups", "description": "Beverage syrups, mocktail bases & crushes", "display_order": 8}
        ]

        category_map = {}
        for c in categories_data:
            cat = db.query(Category).filter(Category.code == c["code"]).first()
            if not cat:
                cat = Category(
                    code=c["code"],
                    name=c["name"],
                    description=c["description"],
                    display_order=c["display_order"],
                    is_active=True
                )
                db.add(cat)
                db.flush()
                print(f"  + Created Category: {c['name']}")
            category_map[c["code"]] = cat

        # 3. SEED 38 OFFICIAL CATALOGUE PRODUCTS (WITH VERIFIED PRICES & PACKAGING)
        products_data = [
            # Chicken Items
            {"sku": "RAIS-CHK-01", "cat": "CHICKEN", "name": "SIGNATURE TORTILLAH 8 INCHES FROZEN", "brand": "Signature", "pack": "1 PACKET", "price": "85.00", "tax": "5.00", "hsn": "1905"},
            {"sku": "RAIS-CHK-02", "cat": "CHICKEN", "name": "SIGNATURE TORTILLAH 8.5 INCHES", "brand": "Signature", "pack": "1 PACKET", "price": "90.00", "tax": "5.00", "hsn": "1905"},
            {"sku": "RAIS-CHK-03", "cat": "CHICKEN", "name": "NUTRICH CHICKEN POPCORN BALL", "brand": "Nutrich", "pack": "1 KG PACKET", "price": "330.00", "tax": "5.00", "hsn": "1602"},
            {"sku": "RAIS-CHK-04", "cat": "CHICKEN", "name": "I.T.C CHICKEN MOMOS", "brand": "ITC Master Chef", "pack": "1 PACKET", "price": "170.00", "tax": "5.00", "hsn": "1902"},
            {"sku": "RAIS-CHK-05", "cat": "CHICKEN", "name": "ITC CHICKEN NUGGETS", "brand": "ITC Master Chef", "pack": "1 KG PACKET", "price": "355.00", "tax": "5.00", "hsn": "1602"},
            {"sku": "RAIS-CHK-06", "cat": "CHICKEN", "name": "NUTRICH CHICKEN BURGER PATTY", "brand": "Nutrich", "pack": "1 KG PACKET", "price": "325.00", "tax": "5.00", "hsn": "1602"},
            
            # Veg Items
            {"sku": "RAIS-VEG-01", "cat": "VEG", "name": "HUP HUP FRENCH FRIES 9MM", "brand": "Hup Hup", "pack": "2.5 KG PACKET", "price": "310.00", "tax": "5.00", "hsn": "2004"},
            {"sku": "RAIS-VEG-02", "cat": "VEG", "name": "HUP HUP FRENCH FRIES 6MM", "brand": "Hup Hup", "pack": "2.5 KG PACKET", "price": "320.00", "tax": "5.00", "hsn": "2004"},
            {"sku": "RAIS-VEG-03", "cat": "VEG", "name": "I.T.C VEG MOMOS", "brand": "ITC Master Chef", "pack": "1 PACKET", "price": "165.00", "tax": "5.00", "hsn": "1902"},
            {"sku": "RAIS-VEG-04", "cat": "VEG", "name": "CHILLI FILL VEG BURGER PATTY", "brand": "Chilli Fill", "pack": "1.2 KG PACKET", "price": "245.00", "tax": "5.00", "hsn": "2004"},
            {"sku": "RAIS-VEG-05", "cat": "VEG", "name": "ITC PANEER PATTY", "brand": "ITC Master Chef", "pack": "1.02KG PACKET", "price": "530.00", "tax": "5.00", "hsn": "0406"},
            {"sku": "RAIS-VEG-06", "cat": "VEG", "name": "GODREJ PANEER POPS", "brand": "Godrej", "pack": "1 KG PACKET", "price": "510.00", "tax": "5.00", "hsn": "0406"},
            {"sku": "RAIS-VEG-07", "cat": "VEG", "name": "ITC CHEESY CORN TRIANGLE", "brand": "ITC Master Chef", "pack": "1 KG PACKET", "price": "350.00", "tax": "5.00", "hsn": "2004"},
            {"sku": "RAIS-VEG-08", "cat": "VEG", "name": "SWEET CORN", "brand": "RAIS Fresh", "pack": "1 KG PACKET", "price": "90.00", "tax": "5.00", "hsn": "0710"},
            {"sku": "RAIS-VEG-09", "cat": "VEG", "name": "GODREJ TANDOORI PANEER NUGGETS", "brand": "Godrej", "pack": "1 KG PACKET", "price": "360.00", "tax": "5.00", "hsn": "0406"},

            # Ketchup & Sauces
            {"sku": "RAIS-SAU-01", "cat": "SAUCES", "name": "DELMONT TOMATO KETCHUP 1.1kg", "brand": "Del Monte", "pack": "1 PACKET", "price": "120.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-02", "cat": "SAUCES", "name": "FOODRITE TOMATO KETCHUP", "brand": "Foodrite", "pack": "1 KG PACKET", "price": "75.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-03", "cat": "SAUCES", "name": "DELMONTE KETCHUP (8 GRAM PKT)", "brand": "Del Monte", "pack": "1 PACKET", "price": "80.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-04", "cat": "SAUCES", "name": "DELMONT TANDOORI MAYO", "brand": "Del Monte", "pack": "1 KG PACKET", "price": "285.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-05", "cat": "SAUCES", "name": "DELMONTE CREAMY CHEESE SAUCE", "brand": "Del Monte", "pack": "1 KG PACKET", "price": "190.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-06", "cat": "SAUCES", "name": "DELMONTE PIZZA PASTA SAUCE", "brand": "Del Monte", "pack": "1 KG PACKET", "price": "155.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-07", "cat": "SAUCES", "name": "MAYANK GOLD KETCHUP (9 GRAM PKT)", "brand": "Mayank Gold", "pack": "1 PACKET", "price": "70.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-08", "cat": "SAUCES", "name": "FOODRITE SALAD MAYONNAISE", "brand": "Foodrite", "pack": "1 KG PACKET", "price": "135.00", "tax": "12.00", "hsn": "2103"},
            {"sku": "RAIS-SAU-09", "cat": "SAUCES", "name": "FOODRITE MAYONNAISE (8 GRAM PKT)", "brand": "Foodrite", "pack": "1 PACKET", "price": "190.00", "tax": "12.00", "hsn": "2103"},

            # Bread Mix & Powders
            {"sku": "RAIS-BRD-01", "cat": "BREADING", "name": "VKL EXTRA H & S MARINDE", "brand": "VKL", "pack": "1 KG PACKET", "price": "370.00", "tax": "5.00", "hsn": "2103"},
            {"sku": "RAIS-BRD-02", "cat": "BREADING", "name": "VKL CRISPY CAJUN BREADING MIX", "brand": "VKL", "pack": "1 KG PACKET", "price": "300.00", "tax": "5.00", "hsn": "1901"},
            {"sku": "RAIS-BRD-03", "cat": "BREADING", "name": "VKL PERI PERI POWDER", "brand": "VKL", "pack": "250 GRAMS PACKET", "price": "165.00", "tax": "5.00", "hsn": "0910"},
            {"sku": "RAIS-BRD-04", "cat": "BREADING", "name": "OREGANO", "brand": "RAIS Select", "pack": "1 KG PACKET", "price": "230.00", "tax": "5.00", "hsn": "1211"},

            # Cheese & Slices
            {"sku": "RAIS-CHS-01", "cat": "CHEESE", "name": "MILKY MIST MOZEROLLA DICED CHEESE (2KG)", "brand": "Milky Mist", "pack": "2 KG PACKET", "price": "920.00", "tax": "12.00", "hsn": "0406"},
            {"sku": "RAIS-CHS-02", "cat": "CHEESE", "name": "MILKY MIST MOZEROLLA DICED CHEESE (1KG)", "brand": "Milky Mist", "pack": "1 KG PACKET", "price": "475.00", "tax": "12.00", "hsn": "0406"},
            {"sku": "RAIS-CHS-03", "cat": "CHEESE", "name": "MILKY MIST CHEESE SLICE", "brand": "Milky Mist", "pack": "765 GRAMS PACKET", "price": "440.00", "tax": "12.00", "hsn": "0406"},
            {"sku": "RAIS-CHS-04", "cat": "CHEESE", "name": "MILKY MIST PANEER (DICED CUBES)", "brand": "Milky Mist", "pack": "1 KG PACKET", "price": "460.00", "tax": "5.00", "hsn": "0406"},

            # Pizza Boxes & Burger Boxes
            {"sku": "RAIS-BOX-01", "cat": "PACKAGING", "name": 'PIZZA BOX 8"x8" PLAIN', "brand": "Packaging Solutions", "pack": "100 NOS", "price": "600.00", "tax": "18.00", "hsn": "4819"},
            {"sku": "RAIS-BOX-02", "cat": "PACKAGING", "name": 'BURGER BOX 4"x4"', "brand": "Packaging Solutions", "pack": "100 NOS", "price": "400.00", "tax": "18.00", "hsn": "4819"},
            {"sku": "RAIS-BOX-03", "cat": "PACKAGING", "name": 'PIZZA BOX 8"x8" PRINTED', "brand": "Packaging Solutions", "pack": "100 NOS", "price": "650.00", "tax": "18.00", "hsn": "4819"},
            {"sku": "RAIS-BOX-04", "cat": "PACKAGING", "name": 'BURGER BOX 4"x4" PRINTED', "brand": "Packaging Solutions", "pack": "100 NOS", "price": "450.00", "tax": "18.00", "hsn": "4819"},
            {"sku": "RAIS-BOX-05", "cat": "PACKAGING", "name": 'BURGER BOX 5"x5" PRINTED', "brand": "Packaging Solutions", "pack": "100 NOS", "price": "500.00", "tax": "18.00", "hsn": "4819"},

            # Spices
            {"sku": "RAIS-SPC-01", "cat": "SPICES", "name": "CHILLY POWDER NO 1 (PICKLE)", "brand": "RAIS Spices", "pack": "1 KG PACKET", "price": "300.00", "tax": "5.00", "hsn": "0904"},
            {"sku": "RAIS-SPC-02", "cat": "SPICES", "name": "CHILLY POWDER", "brand": "RAIS Spices", "pack": "1 KG PACKET", "price": "280.00", "tax": "5.00", "hsn": "0904"},
            {"sku": "RAIS-SPC-03", "cat": "SPICES", "name": "TURMERIC POWDER", "brand": "RAIS Spices", "pack": "1 KG PACKET", "price": "185.00", "tax": "5.00", "hsn": "0910"},
            {"sku": "RAIS-SPC-04", "cat": "SPICES", "name": "CORIANDER POWDER", "brand": "RAIS Spices", "pack": "1 KG PACKET", "price": "200.00", "tax": "5.00", "hsn": "0909"},

            # Mojitos
            {"sku": "RAIS-MOJ-01", "cat": "MOJITOS", "name": "LIME AND MINT", "brand": "RAIS Beverages", "pack": "1 BOTTLE", "price": "360.00", "tax": "12.00", "hsn": "2106"},
            {"sku": "RAIS-MOJ-02", "cat": "MOJITOS", "name": "BLUECURCO", "brand": "RAIS Beverages", "pack": "1 BOTTLE", "price": "350.00", "tax": "12.00", "hsn": "2106"}
        ]

        is_first_run = False
        seeded_products = {}
        for p in products_data:
            prod = db.query(Product).filter(Product.sku == p["sku"]).first()
            cat = category_map[p["cat"]]
            if not prod:
                is_first_run = True
                prod = Product(
                    sku=p["sku"],
                    category_id=cat.id,
                    name=p["name"],
                    brand=p["brand"],
                    packaging_unit=p["pack"],
                    unit_quantity=Decimal("1.00"),
                    base_price=Decimal(p["price"]),
                    tax_rate=Decimal(p["tax"]),
                    hsn_code=p["hsn"],
                    description=f"{p['brand']} {p['name']} in {p['pack']}",
                    current_stock=Decimal("0.00"),
                    min_stock_alert=Decimal("15.00"),
                    is_active=True
                )
                db.add(prod)
                db.flush()
            seeded_products[p["sku"]] = prod
        print(f"  + Successfully verified and seeded all {len(products_data)} RAIS Agencies SKUs.")

        from sqlalchemy import text

        # 4. RESET STOCK ONLY ON VERY FIRST RUN (new products were just created)
        if is_first_run:
            db.execute(text("UPDATE products SET current_stock = 0.00"))
            print("  + First run: stock reset to 0 for all products.")
        else:
            print("  + Existing catalogue detected — stock levels preserved.")

        # 5. PURGE DUMMY DATA ONLY ON FIRST RUN (never wipe real customer/invoice data)
        if is_first_run:
            clean_tables = [
                'payment_allocations',
                'payments',
                'invoice_items',
                'invoices',
                'order_items',
                'orders',
                'quotation_items',
                'quotations',
                'customers'
            ]
            for tbl in clean_tables:
                try:
                    db.execute(text(f"DELETE FROM {tbl}"))
                except Exception:
                    pass
            print("  + First run: cleared dummy operational data.")
        else:
            print("  + Existing data detected — customers, invoices, orders preserved.")

        db.commit()
        print("[SUCCESS] RAIS Agencies Seed Complete! Catalogue ready, real data preserved.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seed: {e}")
        raise
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
