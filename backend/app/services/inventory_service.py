from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.catalogue import Product
from app.models.inventory import StockMovement
from app.schemas.inventory import ReceiveStockRequest, AdjustStockRequest
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.core.exceptions import EntityNotFoundException, InvalidFinancialOperationException

class InventoryService:

    @staticmethod
    def get_stock_overview(db: Session, category_id: Optional[str] = None, search: Optional[str] = None) -> List[dict]:
        query = db.query(Product).options(joinedload(Product.category)).filter(Product.is_active == True)
        if category_id and category_id != 'ALL':
            query = query.filter(Product.category_id == category_id)
        
        products = query.order_by(Product.name).all()
        results = []
        for p in products:
            curr = Decimal(str(p.current_stock or 0))
            min_thresh = Decimal(str(p.min_stock_alert or 10))
            
            if curr <= 0:
                status = "OUT_OF_STOCK"
            elif curr <= min_thresh:
                status = "LOW_STOCK"
            else:
                status = "IN_STOCK"

            if search:
                s = search.lower()
                if not (s in p.name.lower() or s in p.sku.lower() or s in p.brand.lower()):
                    continue

            results.append({
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category_name": p.category.name if p.category else "Uncategorized",
                "brand": p.brand,
                "packaging_unit": p.packaging_unit,
                "current_stock": curr,
                "min_stock_alert": min_thresh,
                "stock_status": status,
                "base_price": Decimal(str(p.base_price)),
                "tax_rate": Decimal(str(p.tax_rate))
            })
        return results

    @staticmethod
    def receive_stock(db: Session, req: ReceiveStockRequest, user_id: Optional[str] = None) -> dict:
        product = db.query(Product).filter(Product.id == req.product_id).with_for_update().first()
        if not product:
            raise EntityNotFoundException("Product", req.product_id)

        qty = Decimal(str(req.quantity))
        prev_stock = Decimal(str(product.current_stock or 0))
        new_stock = prev_stock + qty
        product.current_stock = new_stock

        rec_number = SequenceService.get_next_sequence(db, "REC")

        movement = StockMovement(
            product_id=product.id,
            movement_type="RECEIPT",
            quantity_change=qty,
            previous_stock=prev_stock,
            new_stock=new_stock,
            unit=req.unit or product.packaging_unit,
            purchase_cost=Decimal(str(req.purchase_cost)) if req.purchase_cost else None,
            supplier=req.supplier,
            batch_number=req.batch_number,
            expiry_date=req.expiry_date,
            reference_type="RECEIPT",
            reference_number=rec_number,
            reason="Supplier Stock Delivery",
            notes=req.notes,
            created_by_id=user_id
        )
        db.add(movement)

        AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_name="StockMovement",
            entity_id=movement.id,
            action="RECEIVE_STOCK",
            before_state={"current_stock": float(prev_stock)},
            after_state={"current_stock": float(new_stock), "received": float(qty), "reference": rec_number}
        )

        db.commit()
        db.refresh(movement)
        db.refresh(product)

        return {
            "success": True,
            "message": f"Successfully received {qty} of {product.name}",
            "receipt_number": rec_number,
            "product_name": product.name,
            "previous_stock": float(prev_stock),
            "received_quantity": float(qty),
            "new_stock": float(new_stock),
            "unit": product.packaging_unit
        }

    @staticmethod
    def batch_receive_stock(db: Session, items: List[ReceiveStockRequest], supplier: Optional[str] = None, notes: Optional[str] = None, user_id: Optional[str] = None) -> dict:
        results = []
        batch_rec_number = SequenceService.get_next_sequence(db, "REC")
        
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product:
                continue
            qty = Decimal(str(item.quantity))
            if qty <= 0:
                continue
            prev_stock = Decimal(str(product.current_stock or 0))
            new_stock = prev_stock + qty
            product.current_stock = new_stock
            
            movement = StockMovement(
                product_id=product.id,
                movement_type="RECEIPT",
                quantity_change=qty,
                previous_stock=prev_stock,
                new_stock=new_stock,
                unit=product.packaging_unit or "1 KG PACKET",
                purchase_cost=Decimal(str(item.purchase_cost)) if item.purchase_cost else None,
                supplier=supplier or item.supplier,
                batch_number=item.batch_number,
                expiry_date=item.expiry_date,
                reference_type="RECEIPT",
                reference_number=batch_rec_number,
                reason="Truck Arrival Batch Intake",
                notes=notes or item.notes or "Truck Arrival Batch Intake",
                created_by_id=user_id
            )
            db.add(movement)
            results.append({
                "product_id": product.id,
                "name": product.name,
                "received": float(qty),
                "new_stock": float(new_stock)
            })
            
        db.commit()
        return {
            "success": True,
            "receipt_number": batch_rec_number,
            "items_count": len(results),
            "items": results
        }

    @staticmethod
    def adjust_stock(db: Session, req: AdjustStockRequest, user_id: Optional[str] = None) -> dict:
        product = db.query(Product).filter(Product.id == req.product_id).with_for_update().first()
        if not product:
            raise EntityNotFoundException("Product", req.product_id)

        qty = Decimal(str(req.quantity))
        prev_stock = Decimal(str(product.current_stock or 0))

        if req.adjustment_type.upper() == "INCREASE":
            change = qty
            new_stock = prev_stock + qty
            mtype = "ADJUSTMENT_INCREASE"
        elif req.adjustment_type.upper() == "DECREASE":
            if prev_stock < qty:
                raise InvalidFinancialOperationException(
                    f"Cannot decrease {qty} units. Current stock is only {prev_stock}."
                )
            change = -qty
            new_stock = prev_stock - qty
            mtype = "ADJUSTMENT_DECREASE"
        else:
            raise InvalidFinancialOperationException("Adjustment type must be INCREASE or DECREASE.")

        product.current_stock = new_stock
        adj_number = SequenceService.get_next_sequence(db, "ADJ")

        movement = StockMovement(
            product_id=product.id,
            movement_type=mtype,
            quantity_change=change,
            previous_stock=prev_stock,
            new_stock=new_stock,
            unit=product.packaging_unit,
            reference_type="MANUAL_ADJUSTMENT",
            reference_number=adj_number,
            reason=req.reason.replace("_", " ").title(),
            notes=req.notes,
            created_by_id=user_id
        )
        db.add(movement)

        AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_name="StockMovement",
            entity_id=movement.id,
            action="ADJUST_STOCK",
            before_state={"current_stock": float(prev_stock)},
            after_state={"current_stock": float(new_stock), "change": float(change), "reason": req.reason}
        )

        db.commit()
        db.refresh(movement)
        db.refresh(product)

        return {
            "success": True,
            "message": f"Successfully adjusted stock for {product.name}",
            "adjustment_number": adj_number,
            "product_name": product.name,
            "previous_stock": float(prev_stock),
            "quantity_change": float(change),
            "new_stock": float(new_stock),
            "reason": req.reason
        }

    @staticmethod
    def get_stock_movements(db: Session, product_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        query = db.query(StockMovement).options(joinedload(StockMovement.product)).order_by(StockMovement.created_at.desc())
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        
        movements = query.limit(limit).all()
        results = []
        for m in movements:
            results.append({
                "id": m.id,
                "product_id": m.product_id,
                "product_name": m.product.name if m.product else "Unknown Product",
                "sku": m.product.sku if m.product else "-",
                "movement_type": m.movement_type,
                "quantity_change": Decimal(str(m.quantity_change)),
                "previous_stock": Decimal(str(m.previous_stock)),
                "new_stock": Decimal(str(m.new_stock)),
                "unit": m.unit,
                "purchase_cost": Decimal(str(m.purchase_cost)) if m.purchase_cost else None,
                "supplier": m.supplier,
                "batch_number": m.batch_number,
                "expiry_date": m.expiry_date,
                "reference_type": m.reference_type,
                "reference_number": m.reference_number,
                "reason": m.reason,
                "notes": m.notes,
                "created_at": m.created_at
            })
        return results

    @staticmethod
    def deduct_stock_for_order(db: Session, product_id: str, quantity: Decimal, order_number: str, user_id: Optional[str] = None):
        product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
        if not product:
            return
        
        qty = Decimal(str(quantity))
        prev_stock = Decimal(str(product.current_stock or 0))
        new_stock = prev_stock - qty
        if new_stock < 0:
            new_stock = Decimal("0.00")
        product.current_stock = new_stock

        movement = StockMovement(
            product_id=product.id,
            movement_type="ORDER_DEDUCTION",
            quantity_change=-qty,
            previous_stock=prev_stock,
            new_stock=new_stock,
            unit=product.packaging_unit,
            reference_type="ORDER",
            reference_number=order_number,
            reason=f"Customer Order {order_number}",
            created_by_id=user_id
        )
        db.add(movement)
