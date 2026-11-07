import pytest
from decimal import Decimal
from app.models.catalogue import Product, Category
from app.models.user import User
from app.schemas.catalogue import ProductCreate, ProductUpdate
from app.services.catalogue_service import CatalogueService
from app.services.inventory_service import InventoryService

def test_product_purchase_cost_persistence_and_commercial_intelligence(db):
    """
    Verifies:
    1. Product can be created with explicit purchase_cost.
    2. Product purchase_cost can be updated via update_product.
    3. get_stock_overview correctly resolves purchase_cost and sets is_cost_estimated flag.
    4. When purchase_cost is not set, is_cost_estimated is True (75% fallback).
    5. When purchase_cost is explicitly set, is_cost_estimated is False.
    """
    # Get or create admin user for audit logging
    admin_user = db.query(User).filter(User.username == "admin").first()
    user_id = admin_user.id if admin_user else None

    # Create test category
    cat = Category(code="TST_CAT_COST", name="Test Cost Category")
    db.add(cat)
    db.flush()

    # 1. Product A: Explicit Purchase Cost (Wholesale 280, Cost 215)
    data_a = ProductCreate(
        category_id=cat.id,
        sku="TEST-SAU-GREE",
        name="Green Chilli Sause Test",
        brand="Foodrite",
        packaging_unit="5 KG",
        unit_quantity=Decimal("1.00"),
        base_price=Decimal("280.00"),
        purchase_cost=Decimal("215.00"),
        tax_rate=Decimal("0.00"),
        current_stock=Decimal("10.00"),
        min_stock_alert=Decimal("5.00"),
        is_active=True
    )
    prod_a = CatalogueService.create_product(db, data_a, user_id=user_id)
    assert prod_a.purchase_cost == Decimal("215.00")

    # 2. Product B: No Purchase Cost Set (Wholesale 200, None)
    data_b = ProductCreate(
        category_id=cat.id,
        sku="TEST-SAU-RED",
        name="Red Chilli Sause Test",
        brand="Foodrite",
        packaging_unit="5 KG",
        unit_quantity=Decimal("1.00"),
        base_price=Decimal("200.00"),
        purchase_cost=None,
        tax_rate=Decimal("0.00"),
        current_stock=Decimal("10.00"),
        min_stock_alert=Decimal("5.00"),
        is_active=True
    )
    prod_b = CatalogueService.create_product(db, data_b, user_id=user_id)
    assert prod_b.purchase_cost is None

    # 3. Check Inventory Overview
    overview = InventoryService.get_stock_overview(db)
    item_a = next((i for i in overview if i["product_id"] == prod_a.id), None)
    item_b = next((i for i in overview if i["product_id"] == prod_b.id), None)

    assert item_a is not None
    assert item_b is not None

    # Product A has explicit cost 215.00 -> NOT estimated
    assert item_a["purchase_cost"] == Decimal("215.00")
    assert item_a["is_cost_estimated"] is False
    assert item_a["margin_amount"] == Decimal("65.00") # 280 - 215 = 65

    # Product B has no cost -> falls back to 75% of 200 = 150.00 -> IS estimated
    assert item_b["purchase_cost"] == Decimal("150.00")
    assert item_b["is_cost_estimated"] is True
    assert item_b["margin_amount"] == Decimal("50.00") # 200 - 150 = 50

    # 4. Update Product B with an explicit purchase cost via CatalogueService
    update_data = ProductUpdate(purchase_cost=Decimal("155.00"))
    updated_b = CatalogueService.update_product(db, prod_b.id, update_data, user_id=user_id)
    assert updated_b.purchase_cost == Decimal("155.00")

    # Re-verify overview: Product B should now use 155.00 and NOT be estimated
    overview_2 = InventoryService.get_stock_overview(db)
    item_b_updated = next((i for i in overview_2 if i["product_id"] == prod_b.id), None)
    assert item_b_updated["purchase_cost"] == Decimal("155.00")
    assert item_b_updated["is_cost_estimated"] is False
    assert item_b_updated["margin_amount"] == Decimal("45.00") # 200 - 155 = 45
