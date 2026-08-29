from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.catalogue import Category, Product
from app.schemas.catalogue import CategoryCreate, ProductCreate, ProductUpdate
from app.core.exceptions import EntityNotFoundException, RaisAppException
from app.services.audit_service import AuditService
from app.domain.enums import AuditAction

class CatalogueService:
    @staticmethod
    def list_categories(db: Session, active_only: bool = True) -> List[Category]:
        query = db.query(Category)
        if active_only:
            query = query.filter(Category.is_active == True)
        return query.order_by(Category.display_order.asc(), Category.name.asc()).all()

    @staticmethod
    def get_category_by_id(db: Session, category_id: str) -> Category:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise EntityNotFoundException("Category", category_id)
        return category

    @staticmethod
    def create_category(db: Session, data: CategoryCreate, user_id: Optional[str] = None) -> Category:
        existing = db.query(Category).filter(Category.code == data.code).first()
        if existing:
            raise RaisAppException(detail=f"Category with code '{data.code}' already exists.")
        
        category = Category(
            code=data.code,
            name=data.name,
            description=data.description,
            display_order=data.display_order,
            is_active=data.is_active
        )
        db.add(category)
        db.flush()
        AuditService.log(db, AuditAction.CREATE, "Category", category.id, user_id=user_id, after_state=data.dict())
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def list_products(
        db: Session,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        query = db.query(Product).options(joinedload(Product.category))
        if active_only:
            query = query.filter(Product.is_active == True)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if brand:
            query = query.filter(Product.brand.ilike(f"%{brand}%"))
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(pattern),
                    Product.sku.ilike(pattern),
                    Product.brand.ilike(pattern),
                    Product.packaging_unit.ilike(pattern)
                )
            )
        return query.order_by(Product.name.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_product_by_id(db: Session, product_id: str) -> Product:
        product = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
        if not product:
            raise EntityNotFoundException("Product", product_id)
        return product

    @staticmethod
    def get_product_by_sku(db: Session, sku: str) -> Product:
        product = db.query(Product).filter(Product.sku == sku).first()
        if not product:
            raise EntityNotFoundException("Product", sku)
        return product

    @staticmethod
    def create_product(db: Session, data: ProductCreate, user_id: Optional[str] = None) -> Product:
        existing = db.query(Product).filter(Product.sku == data.sku).first()
        if existing:
            raise RaisAppException(detail=f"Product with SKU '{data.sku}' already exists.")
        
        # Verify category
        CatalogueService.get_category_by_id(db, data.category_id)

        product = Product(
            sku=data.sku,
            category_id=data.category_id,
            name=data.name,
            brand=data.brand,
            packaging_unit=data.packaging_unit,
            unit_quantity=data.unit_quantity,
            base_price=data.base_price,
            tax_rate=data.tax_rate,
            hsn_code=data.hsn_code,
            description=data.description,
            current_stock=data.current_stock,
            min_stock_alert=data.min_stock_alert,
            is_active=data.is_active
        )
        db.add(product)
        db.flush()
        AuditService.log(db, AuditAction.CREATE, "Product", product.id, user_id=user_id, after_state=data.dict())
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update_product(db: Session, product_id: str, data: ProductUpdate, user_id: Optional[str] = None) -> Product:
        product = CatalogueService.get_product_by_id(db, product_id)
        before_state = {
            "name": product.name,
            "base_price": str(product.base_price),
            "tax_rate": str(product.tax_rate),
            "current_stock": str(product.current_stock)
        }

        update_dict = data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(product, key, value)

        db.flush()
        AuditService.log(db, AuditAction.UPDATE, "Product", product.id, user_id=user_id, before_state=before_state, after_state=update_dict)
        db.commit()
        db.refresh(product)
        return product
