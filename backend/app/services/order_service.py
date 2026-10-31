from decimal import Decimal
from typing import List, Optional
from datetime import date
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.catalogue import Product
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.services.billing_service import BillingService
from app.services.inventory_service import InventoryService
from app.core.exceptions import EntityNotFoundException, InvalidFinancialOperationException
from app.core.datetime_utils import get_ist_today

class OrderService:

    @staticmethod
    def create_order(db: Session, data: OrderCreate, user_id: Optional[str] = None) -> Order:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", data.customer_id)

        if not data.items:
            raise InvalidFinancialOperationException("An order must contain at least one product item.")

        order_number = SequenceService.get_next_sequence(db, "ORD")
        
        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")
        order_items = []

        for item_in in data.items:
            product = db.query(Product).filter(Product.id == item_in.product_id).first()
            if not product:
                raise EntityNotFoundException("Product", item_in.product_id)

            qty = Decimal(str(item_in.quantity))
            if qty <= Decimal("0.00"):
                raise InvalidFinancialOperationException(f"Order item quantity must be strictly positive (> 0), got {qty}.")

            price = Decimal(str(item_in.unit_price if item_in.unit_price is not None else product.base_price))
            if price <= Decimal("0.00"):
                raise InvalidFinancialOperationException(f"Order unit price must be strictly positive (> 0), got {price}.")

            line_sub = qty * price
            
            subtotal += line_sub

            order_item = OrderItem(
                product_id=product.id,
                item_name=product.name,
                packaging_unit=product.packaging_unit,
                quantity=qty,
                unit_price=price,
                line_total=line_sub
            )
            order_items.append(order_item)

            # Deduct stock for the ordered item upon order confirmation
            InventoryService.deduct_stock_for_order(
                db=db,
                product_id=product.id,
                quantity=qty,
                order_number=order_number,
                user_id=user_id
            )

        total_amount = subtotal

        order = Order(
            order_number=order_number,
            customer_id=customer.id,
            quotation_id=data.quotation_id,
            status=data.status or "CONFIRMED",
            order_date=data.order_date or get_ist_today(),
            expected_delivery_date=data.expected_delivery_date,
            subtotal=subtotal,
            tax_amount=Decimal("0.00"),
            total_amount=total_amount,
            delivery_address=data.delivery_address or customer.address_line1,
            notes=data.notes,
            created_by_id=user_id
        )
        order.items = order_items
        db.add(order)

        AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_name="Order",
            entity_id=order.id,
            action="CREATE_ORDER",
            after_state={"order_number": order_number, "total_amount": float(total_amount), "customer": customer.business_name}
        )

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def list_orders(db: Session, customer_id: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> List[Order]:
        query = db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product)
        ).order_by(Order.created_at.desc())

        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        if status and status != 'ALL':
            query = query.filter(Order.status == status)

        return query.limit(limit).all()

    @staticmethod
    def get_order_by_id(db: Session, order_id: str) -> Order:
        order = db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter(or_(Order.id == order_id, Order.order_number == order_id)).first()

        if not order:
            raise EntityNotFoundException("Order", order_id)
        return order

    @staticmethod
    def convert_order_to_invoice(db: Session, order_id: str, user_id: Optional[str] = None) -> Invoice:
        order = OrderService.get_order_by_id(db, order_id)
        
        # Build invoice line items from order items
        invoice_items_payload = []
        for itm in order.items:
            product = itm.product
            invoice_items_payload.append({
                "product_id": itm.product_id,
                "item_description": itm.item_name,
                "brand": product.brand if product else "RAIS Master",
                "packaging_unit": itm.packaging_unit,
                "hsn_code": product.hsn_code if product else "",
                "quantity": float(itm.quantity),
                "unit_price": float(itm.unit_price),
                "discount_rate": 0.0,
                "tax_rate": float(product.tax_rate) if (product and product.tax_rate is not None) else 0.0
            })
            # Stock was already deducted when the order was placed. No duplicate deduction here.

        # Create real invoice via BillingService
        from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
        inv_create = InvoiceCreate(
            customer_id=order.customer_id,
            order_id=order.id,
            invoice_date=get_ist_today(),
            due_date=get_ist_today(),
            payment_terms="Cash on Delivery / Immediate Settlement",
            notes=f"Generated from Customer Order {order.order_number}. {order.notes or ''}",
            items=[InvoiceItemCreate(**itm) for itm in invoice_items_payload],
            issue_immediately=True
        )

        invoice = BillingService.create_invoice(db=db, data=inv_create, user_id=user_id)
        
        # Mark order as completed
        order.status = "COMPLETED"
        db.commit()
        db.refresh(order)

        AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_name="Order",
            entity_id=order.id,
            action="CONVERT_TO_INVOICE",
            after_state={"order_number": order.order_number, "invoice_number": invoice.invoice_number}
        )

        return invoice

    @staticmethod
    def cancel_order(db: Session, order_id: str, reason: Optional[str] = None, user_id: Optional[str] = None) -> Order:
        order = OrderService.get_order_by_id(db, order_id)
        if order.status in ["CANCELLED", "COMPLETED"]:
            raise InvalidFinancialOperationException(f"Order '{order.order_number}' is already {order.status} and cannot be cancelled.")

        order.status = "CANCELLED"
        if reason:
            order.notes = (order.notes or "") + f" [CANCELLED: {reason}]"

        # Restore inventory for all items in the cancelled order
        for itm in order.items:
            InventoryService.restore_stock_for_order(
                db=db,
                product_id=itm.product_id,
                quantity=itm.quantity,
                order_number=order.order_number,
                reason=reason or f"Order Cancelled ({order.order_number})",
                user_id=user_id
            )

        db.commit()
        db.refresh(order)

        AuditService.log_action(
            db=db,
            user_id=user_id,
            entity_name="Order",
            entity_id=order.id,
            action="CANCEL_ORDER",
            after_state={"order_number": order.order_number, "status": "CANCELLED", "reason": reason}
        )

        from app.services.billing_service import BillingService
        BillingService.invalidate_cache()
        return order
