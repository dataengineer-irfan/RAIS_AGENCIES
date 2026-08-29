from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.catalogue import Product
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.domain.enums import OrderStatus, AuditAction
from app.core.exceptions import EntityNotFoundException
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/orders", tags=["Orders / Bookings"])

@router.get("", response_model=List[OrderResponse])
def list_orders(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    query = db.query(Order)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if status:
        query = query.filter(Order.status == status)
        
    orders = query.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    res = []
    for o in orders:
        items = [
            OrderItemResponse(
                id=i.id,
                product_id=i.product_id,
                item_name=i.item_name,
                packaging_unit=i.packaging_unit,
                quantity=i.quantity,
                unit_price=i.unit_price,
                line_total=i.line_total
            ) for i in o.items
        ]
        res.append(OrderResponse(
            id=o.id,
            order_number=o.order_number,
            customer_id=o.customer_id,
            customer_name=o.customer.business_name if o.customer else None,
            customer_phone=o.customer.phone if o.customer else None,
            quotation_id=o.quotation_id,
            status=o.status,
            order_date=o.order_date,
            expected_delivery_date=o.expected_delivery_date,
            subtotal=o.subtotal,
            tax_amount=o.tax_amount,
            total_amount=o.total_amount,
            delivery_address=o.delivery_address,
            notes=o.notes,
            created_at=o.created_at,
            items=items
        ))
    return res

@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise EntityNotFoundException("Customer", data.customer_id)

    ord_number = SequenceService.get_next_sequence(db, "ORD")
    subtotal = 0
    
    order = Order(
        order_number=ord_number,
        customer_id=customer.id,
        quotation_id=data.quotation_id,
        status=OrderStatus.PENDING.value,
        order_date=date.today(),
        expected_delivery_date=data.expected_delivery_date,
        delivery_address=data.delivery_address or customer.address_line1,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(order)
    db.flush()

    for itm in data.items:
        prod = db.query(Product).filter(Product.id == itm.product_id).first()
        if not prod:
            raise EntityNotFoundException("Product", itm.product_id)
        u_price = itm.unit_price if itm.unit_price is not None else prod.base_price
        l_total = itm.quantity * u_price
        subtotal += l_total

        o_item = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            item_name=prod.name,
            packaging_unit=prod.packaging_unit,
            quantity=itm.quantity,
            unit_price=u_price,
            line_total=l_total
        )
        db.add(o_item)

    order.subtotal = subtotal
    order.tax_amount = 0
    order.total_amount = subtotal
    
    AuditService.log(db, AuditAction.CREATE, "Order", order.id, user_id=current_user.id, after_state={"order_number": ord_number})
    db.commit()
    db.refresh(order)
    
    items = [
        OrderItemResponse(
            id=i.id,
            product_id=i.product_id,
            item_name=i.item_name,
            packaging_unit=i.packaging_unit,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.line_total
        ) for i in order.items
    ]
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        customer_id=order.customer_id,
        customer_name=order.customer.business_name if order.customer else None,
        customer_phone=order.customer.phone if order.customer else None,
        quotation_id=order.quotation_id,
        status=order.status,
        order_date=order.order_date,
        expected_delivery_date=order.expected_delivery_date,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        delivery_address=order.delivery_address,
        notes=order.notes,
        created_at=order.created_at,
        items=items
    )
