from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date, datetime, time
from app.core.database import get_db
from app.models.user import User
from app.models.system import AuditLog
from app.schemas.system import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

@router.get("/logs", response_model=List[AuditLogResponse], dependencies=[Depends(require_admin)])
def list_audit_logs(
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    entity_name: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    # 1. Date Range Bounding (Indexed via created_at B-tree index for high performance)
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.combine(start_date, time.min))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.combine(end_date, time.max))

    # 2. Indexed Exact Filters
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username == username)

    # 3. Server-Side Full-Database Search across entity_id, actors, and JSON before/after snapshots
    if search:
        s = search.strip()
        if s:
            term = f"%{s}%"
            query = query.filter(
                or_(
                    AuditLog.entity_id.ilike(term),
                    AuditLog.username.ilike(term),
                    AuditLog.entity_name.ilike(term),
                    AuditLog.action.ilike(term),
                    AuditLog.before_state.ilike(term),
                    AuditLog.after_state.ilike(term)
                )
            )

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/margin-leakage", dependencies=[Depends(require_admin)])
def get_margin_leakage(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    db: Session = Depends(get_db)
):
    from decimal import Decimal
    from app.models.invoice import Invoice, InvoiceItem
    from app.models.inventory import StockMovement
    from app.models.catalogue import Product
    from app.models.customer import Customer
    from app.models.user import User

    # 1. Latest purchase cost map per product from StockMovements
    cost_rows = db.query(
        StockMovement.product_id,
        StockMovement.purchase_cost
    ).filter(StockMovement.purchase_cost.isnot(None))\
     .order_by(StockMovement.created_at.desc()).all()

    cost_map = {}
    for row in cost_rows:
        if row.product_id not in cost_map and row.purchase_cost is not None:
            cost_map[row.product_id] = Decimal(str(row.purchase_cost))

    # 2. Query InvoiceItems with Invoices, Customers, Products, and Users
    valid_statuses = ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']
    query = db.query(
        InvoiceItem,
        Invoice,
        Customer,
        Product,
        User
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
     .join(Customer, Customer.id == Invoice.customer_id)\
     .join(Product, Product.id == InvoiceItem.product_id)\
     .outerjoin(User, User.id == Invoice.created_by_id)\
     .filter(Invoice.status.in_(valid_statuses))

    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    rows = query.order_by(Invoice.invoice_date.desc(), Invoice.invoice_number.desc()).all()

    leakage_items = []
    total_loss = Decimal("0.00")
    affected_invoices = set()
    customer_loss_map = {}
    sku_loss_map = {}

    term = search.strip().lower() if (isinstance(search, str) and search.strip()) else None

    for item, inv, cust, prod, user in rows:
        cost = cost_map.get(item.product_id)
        if cost is None:
            continue

        unit_price = Decimal(str(item.unit_price or "0"))
        if unit_price >= cost:
            continue

        qty = Decimal(str(item.quantity or "0"))
        unit_loss = cost - unit_price
        item_total_loss = unit_loss * qty

        # If search term provided, filter across invoice, customer, sku, product, and user
        if term:
            searchable = f"{inv.invoice_number} {cust.business_name} {prod.sku} {prod.name} {user.username if user else ''}".lower()
            if term not in searchable:
                continue

        total_loss += item_total_loss
        affected_invoices.add(inv.id)

        customer_loss_map[cust.business_name] = customer_loss_map.get(cust.business_name, Decimal("0")) + item_total_loss
        
        if prod.sku not in sku_loss_map:
            sku_loss_map[prod.sku] = {"name": prod.name, "loss": Decimal("0")}
        sku_loss_map[prod.sku]["loss"] += item_total_loss

        # Classification: Typo / Fatal error if unit price is less than 30% of cost (e.g. Tortilla Rs 2 vs 72)
        classification = "CRITICAL_TYPO" if unit_price < (cost * Decimal("0.30")) else "BELOW_COST_DISCOUNT"

        leakage_items.append({
            "id": item.id,
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "customer_id": cust.id,
            "customer_name": cust.business_name,
            "product_id": prod.id,
            "sku": prod.sku,
            "product_name": prod.name,
            "packaging_unit": item.packaging_unit or prod.packaging_unit,
            "quantity": float(qty),
            "unit_price": float(unit_price),
            "landed_cost": float(cost),
            "unit_loss": float(unit_loss),
            "total_loss": float(item_total_loss),
            "loss_pct": round(float((unit_loss / cost) * 100), 1) if cost > 0 else 0.0,
            "classification": classification,
            "billed_by": user.username if user else "admin"
        })

    # Sort leakage items by total_loss descending
    leakage_items.sort(key=lambda x: x["total_loss"], reverse=True)

    worst_customer = max(customer_loss_map.items(), key=lambda x: x[1])[0] if customer_loss_map else None
    worst_customer_loss = float(max(customer_loss_map.values())) if customer_loss_map else 0.0

    worst_sku = max(sku_loss_map.items(), key=lambda x: x[1]["loss"]) if sku_loss_map else None

    summary = {
        "total_loss": round(float(total_loss), 2),
        "total_items": len(leakage_items),
        "total_invoices": len(affected_invoices),
        "worst_customer": worst_customer,
        "worst_customer_loss": round(worst_customer_loss, 2),
        "worst_sku": worst_sku[0] if worst_sku else None,
        "worst_product_name": worst_sku[1]["name"] if worst_sku else None,
        "worst_sku_loss": round(float(worst_sku[1]["loss"]), 2) if worst_sku else 0.0
    }

    return {
        "summary": summary,
        "items": leakage_items
    }


@router.post("/reset-operational-data", dependencies=[Depends(require_admin)])
def reset_operational_data(
    db: Session = Depends(get_db)
):
    from sqlalchemy import text
    clean_tables = [
        'payment_allocations',
        'payments',
        'invoice_items',
        'invoices',
        'order_items',
        'orders',
        'quotation_items',
        'quotations',
        'audit_logs',
        'customers'
    ]
    deleted_counts = {}
    for tbl in clean_tables:
        try:
            res = db.execute(text(f"DELETE FROM {tbl}"))
            deleted_counts[tbl] = res.rowcount
        except Exception as e:
            deleted_counts[tbl] = str(e)
            
    # Reset inventory stock levels to 0.00
    try:
        res = db.execute(text("UPDATE products SET current_stock = 0.00"))
        deleted_counts["products_stock_reset"] = res.rowcount
    except Exception as e:
        deleted_counts["products_stock_reset"] = str(e)

    # Reset sequences if present
    try:
        db.execute(text("UPDATE document_sequences SET current_sequence = 0"))
    except Exception:
        pass

    db.commit()
    return {
        "status": "success",
        "message": "All dummy operational data wiped cleanly. Products and categories preserved with 0 stock.",
        "deleted": deleted_counts
    }
