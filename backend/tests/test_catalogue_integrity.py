import pytest
from decimal import Decimal
from app.core.database import SessionLocal
from app.models.catalogue import Product, Category

def test_seeded_catalogue_completeness():
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        assert len(categories) == 8, f"Expected 8 categories, found {len(categories)}"

        # Check key items from catalogue image
        item_checks = {
            "RAIS-CHK-01": {"name": "SIGNATURE TORTILLAH 8 INCHES FROZEN", "price": Decimal("85.00")},
            "RAIS-CHK-05": {"name": "ITC CHICKEN NUGGETS", "price": Decimal("355.00")},
            "RAIS-VEG-01": {"name": "HUP HUP FRENCH FRIES 9MM", "price": Decimal("310.00")},
            "RAIS-CHS-01": {"name": "MILKY MIST MOZEROLLA DICED CHEESE (2KG)", "price": Decimal("920.00")},
            "RAIS-BOX-03": {"name": 'PIZZA BOX 8"x8" PRINTED', "price": Decimal("650.00")},
            "RAIS-SPC-01": {"name": "CHILLY POWDER NO 1 (PICKLE)", "price": Decimal("300.00")},
            "RAIS-MOJ-01": {"name": "LIME AND MINT", "price": Decimal("360.00")}
        }

        for sku, expected in item_checks.items():
            prod = db.query(Product).filter(Product.sku == sku).first()
            assert prod is not None, f"Missing product SKU: {sku}"
            assert prod.name == expected["name"], f"Name mismatch for {sku}"
            assert prod.base_price == expected["price"], f"Price mismatch for {sku}: got {prod.base_price}, expected {expected['price']}"

    finally:
        db.close()
