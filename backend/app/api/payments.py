from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate, PaymentUpdate, PaymentAllocationCreate, PaymentResponse, PaymentAllocationResponse
)
from app.services.payment_service import PaymentService
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentResponse])
def list_payments(
    customer_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return PaymentService.list_payments(
        db=db,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit
    )

@router.get("/summary")
def get_payments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns true global collection metrics:
    All-Time Collections, Current Month Collections, Total Vouchers Count.
    """
    return PaymentService.get_payments_summary(db)

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return PaymentService.get_payment_by_id(db, payment_id)

@router.get("/{payment_id}/print-html", response_class=HTMLResponse)
def get_printable_payment(
    payment_id: str,
    db: Session = Depends(get_db)
):
    p = PaymentService.get_payment_by_id(db, payment_id)

    # Format created_at to IST (UTC+5:30) with date & short time
    created_str = str(p.payment_date)
    if p.created_at:
        try:
            ist_time = p.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(p.payment_date)

    cust_display = p.customer_name or "Customer"
    contact_person_str = ""
    if p.customer_contact and p.customer_contact.strip() and p.customer_contact.strip().lower() != (p.customer_name or "").strip().lower():
        contact_person_str = f'<p class="text-xs font-semibold text-gray-700 mt-0.5">Contact Person: <strong class="text-gray-900">{p.customer_contact}</strong></p>'

    method = (p.payment_method or "CASH").upper()
    fallback_ref = "Direct Cash Settlement" if method == "CASH" else ("UPI Transfer" if method == "UPI" else "Bank Settlement")
    ref_str = p.reference_number or fallback_ref

    # Allocations Table
    alloc_rows = ""
    if p.allocations:
        for idx, a in enumerate(p.allocations, 1):
            alloc_date_str = str(p.payment_date)
            if a.allocated_at:
                try:
                    alloc_ist = a.allocated_at + timedelta(hours=5, minutes=30)
                    alloc_date_str = alloc_ist.strftime("%d-%b-%Y")
                except Exception:
                    alloc_date_str = str(p.payment_date)
            alloc_rows += f"""
            <tr class="border-b border-gray-200 text-sm">
                <td class="py-2.5 text-center text-gray-600">{idx}</td>
                <td class="py-2.5 font-bold font-mono text-gray-900">{a.invoice_number or a.invoice_id}</td>
                <td class="py-2.5 text-center text-gray-600">{alloc_date_str}</td>
                <td class="py-2.5 text-right font-bold font-mono text-emerald-700">₹{a.allocated_amount:,.2f}</td>
            </tr>
            """
    else:
        alloc_rows = """
        <tr class="border-b border-gray-200 text-sm">
            <td colspan="4" class="py-4 text-center text-gray-500 italic">Direct settlement on customer ledger account.</td>
        </tr>
        """

    # Outstanding balance card
    balance_card = ""
    if p.customer_outstanding_balance is not None:
        bal = float(p.customer_outstanding_balance)
        if bal > 0:
            balance_card = f"""
            <div class="mt-4 p-3 bg-rose-50 border border-rose-200 rounded flex justify-between items-center text-sm">
                <span class="font-bold text-rose-900">Remaining Ledger Balance Due:</span>
                <span class="font-mono font-black text-rose-700 text-base">₹{bal:,.2f}</span>
            </div>
            """
        else:
            balance_card = f"""
            <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded flex justify-between items-center text-sm">
                <span class="font-bold text-emerald-900">Current Ledger Status:</span>
                <span class="font-bold text-emerald-700">All Dues Fully Settled (₹0.00)</span>
            </div>
            """

    notes_section = ""
    if p.notes:
        notes_section = f"""
        <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
            <span class="font-bold text-gray-900">Notes / Remarks:</span> {p.notes}
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Payment Receipt {p.payment_number} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Payment Settlement Receipt #{p.payment_number}">
        <meta property="og:description" content="Received From: {cust_display} • Amount: ₹{p.amount:,.2f} • Date: {created_str}">
        <meta property="og:type" content="website">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {{
                .no-print {{ display: none !important; }}
                body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body class="bg-gray-100 p-6 font-sans text-gray-800">
        <div class="no-print max-w-3xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-emerald-600 text-white font-semibold rounded text-sm shadow hover:bg-emerald-700">Print / Save as PDF</button>
        </div>

        <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-emerald-600 rounded flex items-center justify-center font-black text-2xl text-white">R</div>
                        <div>
                            <h1 class="text-2xl font-black tracking-wide text-gray-900">{settings.COMPANY_NAME}</h1>
                            <p class="text-xs font-semibold uppercase tracking-widest text-emerald-700">{settings.COMPANY_TAGLINE}</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-2">{settings.COMPANY_ADDRESS}</p>
                    <p class="text-xs text-gray-600 font-semibold">Phone: {settings.COMPANY_PHONE_PRIMARY} | {settings.COMPANY_PHONE_SECONDARY}</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-emerald-800 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">OFFICIAL PAYMENT RECEIPT</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{p.payment_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Date & Time: <span class="font-medium text-gray-800">{created_str}</span></p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {method} SETTLED
                    </span>
                </div>
            </div>

            <!-- Customer Details & Reference -->
            <div class="grid grid-cols-2 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Received From (Customer):</h3>
                    <p class="text-base font-bold text-gray-900">{p.customer_name or 'Valued Customer'}</p>
                    {contact_person_str}
                    <p class="text-gray-600 mt-0.5">{p.customer_address or 'Rayachoty Market'}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{p.customer_phone or '-'}</span></p>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{p.customer_code or '-'}</span></p>
                    <p class="text-gray-500 mt-1">Payment Method: <span class="font-bold text-gray-800">{method}</span></p>
                    <p class="text-gray-500 mt-1">Ref / UTR: <span class="font-mono font-bold text-gray-800">{ref_str}</span></p>
                </div>
            </div>

            <!-- Amount Highlight Banner -->
            <div class="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-lg p-5 mb-6 flex justify-between items-center">
                <div>
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Amount Received</span>
                    <span class="text-3xl font-black font-mono text-emerald-700">₹{p.amount:,.2f}</span>
                </div>
                <div class="text-right text-xs">
                    <span class="text-gray-500 block">Settlement Status:</span>
                    <span class="font-bold text-emerald-800 text-sm">₹{p.allocated_amount:,.2f} Allocated</span>
                    {f'<span class="text-amber-700 block text-[11px] font-medium mt-0.5">(₹{p.unallocated_amount:,.2f} unallocated advance)</span>' if p.unallocated_amount > 0 else ''}
                </div>
            </div>

            <!-- Allocations Table -->
            <div class="my-6">
                <h4 class="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Invoice Settlement Breakdown:</h4>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-300 text-xs font-bold text-gray-600 uppercase">
                            <th class="py-2 text-center w-10">#</th>
                            <th class="py-2">Invoice Number</th>
                            <th class="py-2 text-center">Settlement Date</th>
                            <th class="py-2 text-right">Allocated Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alloc_rows}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-gray-300 font-bold text-sm">
                            <td colspan="3" class="py-2.5 text-right text-gray-700">Total Allocated:</td>
                            <td class="py-2.5 text-right font-mono text-emerald-700">₹{p.allocated_amount:,.2f}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {balance_card}
            {notes_section}

            <!-- Bottom Support & Bank Settlement -->
            <div class="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-gray-800 uppercase tracking-wider mb-0.5">RAIS Agencies Settlement Desk:</h5>
                    <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                    <p class="mt-0.5">Direct Line: <span class="font-bold">9347453135 / 9573261696</span></p>
                    <p class="mt-2 italic text-gray-500">Thank you for your timely settlement! Quality frozen food products delivered fresh.</p>
                </div>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-12 pt-8 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Customer Acknowledgment</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-900">For RAIS AGENCIES</p>
                    <div class="h-10"></div>
                    <p class="text-gray-600">Authorized Accounts Signatory</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@router.post("", response_model=PaymentResponse)
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    payment = PaymentService.record_payment(
        db=db,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return PaymentService.get_payment_by_id(db, payment.id)

@router.post("/reconcile-fifo")
def reconcile_payments_fifo(
    customer_id: Optional[str] = Query(None, description="Optional customer ID to reconcile specifically"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    from app.services.reconciliation_service import ReconciliationService
    if customer_id:
        return ReconciliationService.reconcile_customer_fifo(db, customer_id)
    return ReconciliationService.reconcile_all_fifo(db)

@router.post("/{payment_id}/allocate", response_model=PaymentAllocationResponse)
def allocate_payment(
    payment_id: str,
    data: PaymentAllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    alloc = PaymentService.allocate_payment(
        db=db,
        payment_id=payment_id,
        invoice_id=data.invoice_id,
        amount=data.amount,
        user_id=current_user.id
    )
    db.commit()
    return PaymentAllocationResponse(
        id=alloc.id,
        payment_id=alloc.payment_id,
        invoice_id=alloc.invoice_id,
        invoice_number=alloc.invoice.invoice_number if alloc.invoice else None,
        allocated_amount=alloc.allocated_amount,
        allocated_at=alloc.allocated_at
    )

@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return PaymentService.update_payment(
        db=db,
        payment_id=payment_id,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )

@router.delete("/{payment_id}")
def delete_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return PaymentService.delete_payment(
        db=db,
        payment_id=payment_id,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
