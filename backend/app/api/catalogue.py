from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.catalogue import Category, Product
from app.schemas.catalogue import (
    CategoryCreate, CategoryResponse, ProductCreate,
    ProductUpdate, ProductResponse
)
from app.services.catalogue_service import CatalogueService
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/catalogue", tags=["Catalogue"])

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    categories = CatalogueService.list_categories(db, active_only=active_only)
    resp = []
    for cat in categories:
        resp.append(CategoryResponse(
            id=cat.id,
            code=cat.code,
            name=cat.name,
            description=cat.description,
            display_order=cat.display_order,
            is_active=cat.is_active,
            product_count=len(cat.products),
            created_at=cat.created_at
        ))
    return resp

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    cat = CatalogueService.create_category(db, data, user_id=current_user.id)
    return CategoryResponse(
        id=cat.id,
        code=cat.code,
        name=cat.name,
        description=cat.description,
        display_order=cat.display_order,
        is_active=cat.is_active,
        product_count=0,
        created_at=cat.created_at
    )

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    brand: Optional[str] = None,
    active_only: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    products = CatalogueService.list_products(
        db, category_id=category_id, search=search, brand=brand,
        active_only=active_only, skip=skip, limit=limit
    )
    return [
        ProductResponse(
            id=p.id,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            sku=p.sku,
            name=p.name,
            brand=p.brand,
            packaging_unit=p.packaging_unit,
            unit_quantity=p.unit_quantity,
            base_price=p.base_price,
            tax_rate=p.tax_rate,
            hsn_code=p.hsn_code,
            description=p.description,
            current_stock=p.current_stock,
            min_stock_alert=p.min_stock_alert,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at
        ) for p in products
    ]

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    p = CatalogueService.get_product_by_id(db, product_id)
    return ProductResponse(
        id=p.id,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        sku=p.sku,
        name=p.name,
        brand=p.brand,
        packaging_unit=p.packaging_unit,
        unit_quantity=p.unit_quantity,
        base_price=p.base_price,
        tax_rate=p.tax_rate,
        hsn_code=p.hsn_code,
        description=p.description,
        current_stock=p.current_stock,
        min_stock_alert=p.min_stock_alert,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.post("/products", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    p = CatalogueService.create_product(db, data, user_id=current_user.id)
    return ProductResponse(
        id=p.id,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        sku=p.sku,
        name=p.name,
        brand=p.brand,
        packaging_unit=p.packaging_unit,
        unit_quantity=p.unit_quantity,
        base_price=p.base_price,
        tax_rate=p.tax_rate,
        hsn_code=p.hsn_code,
        description=p.description,
        current_stock=p.current_stock,
        min_stock_alert=p.min_stock_alert,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    p = CatalogueService.update_product(db, product_id, data, user_id=current_user.id)
    return ProductResponse(
        id=p.id,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        sku=p.sku,
        name=p.name,
        brand=p.brand,
        packaging_unit=p.packaging_unit,
        unit_quantity=p.unit_quantity,
        base_price=p.base_price,
        tax_rate=p.tax_rate,
        hsn_code=p.hsn_code,
        description=p.description,
        current_stock=p.current_stock,
        min_stock_alert=p.min_stock_alert,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at
    )
