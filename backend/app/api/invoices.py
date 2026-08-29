from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceStatusUpdate
)
from app.services.billing_service import BillingService
from app.api.deps import get_current_user, require_operator_or_admin, require_any_authenticated, require_admin
from app.core.config import settings

router = APIRouter(prefix="/invoices", tags=["Invoices / Billing"])

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return BillingService.list_invoices(
        db=db,
        customer_id=customer_id,
        status=status,
        search=search,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return BillingService.get_invoice_by_id(db, invoice_id)

@router.post("", response_model=InvoiceResponse)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.create_invoice(
        db=db,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.issue_invoice(db, invoice_id, user_id=current_user.id)
    return BillingService.get_invoice_by_id(db, inv.id)

@router.post("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: str,
    data: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.cancel_or_void_invoice(
        db=db,
        invoice_id=invoice_id,
        target_status=data.status,
        reason=data.reason,
        user_id=current_user.id
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.get("/{invoice_id}/print-html", response_class=HTMLResponse)
def get_printable_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    inv = BillingService.get_invoice_by_id(db, invoice_id)
    
    # Render rich HTML invoice template for direct print / PDF generation
    items_rows = ""
    for idx, itm in enumerate(inv.items, 1):
        items_rows += f"""
        <tr class="border-b border-gray-200 text-sm">
            <td class="py-2.5 text-center">{idx}</td>
            <td class="py-2.5 font-medium text-gray-800">{itm.item_description} <span class="text-xs text-gray-500">({itm.packaging_unit})</span></td>
            <td class="py-2.5 text-center text-gray-600">{itm.hsn_code or '-'}</td>
            <td class="py-2.5 text-center font-bold">{itm.quantity}</td>
            <td class="py-2.5 text-right font-mono">₹{itm.unit_price:.2f}</td>
            <td class="py-2.5 text-right text-gray-600">{itm.discount_rate}%</td>
            <td class="py-2.5 text-right text-gray-600 font-mono">₹{itm.tax_amount:.2f} <span class="text-xs">({itm.tax_rate}%)</span></td>
            <td class="py-2.5 text-right font-bold font-mono">₹{itm.line_total:.2f}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice {inv.invoice_number} - RAIS Agencies</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {{
                .no-print {{ display: none !important; }}
                body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body class="bg-gray-100 p-6 font-sans text-gray-800">
        <div class="no-print max-w-4xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-blue-600 text-white font-semibold rounded text-sm shadow hover:bg-blue-700">Print / Save as PDF</button>
        </div>

        <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-amber-500 rounded flex items-center justify-center font-black text-2xl text-white">R</div>
                        <div>
                            <h1 class="text-2xl font-black tracking-wide text-gray-900">{settings.COMPANY_NAME}</h1>
                            <p class="text-xs font-semibold uppercase tracking-widest text-amber-600">{settings.COMPANY_TAGLINE}</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-2">{settings.COMPANY_ADDRESS}</p>
                    <p class="text-xs text-gray-600 font-semibold">Phone: {settings.COMPANY_PHONE_PRIMARY} | {settings.COMPANY_PHONE_SECONDARY}</p>
                    <p class="text-xs text-gray-600">GSTIN: <span class="font-mono font-bold">{settings.COMPANY_GSTIN}</span></p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">TAX INVOICE</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{inv.invoice_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Date: <span class="font-medium text-gray-800">{inv.invoice_date}</span></p>
                    <p class="text-xs text-gray-500">Due Date: <span class="font-medium text-gray-800">{inv.due_date}</span></p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase {'bg-emerald-100 text-emerald-800' if inv.status == 'PAID' else 'bg-amber-100 text-amber-800' if inv.status == 'PARTIALLY_PAID' else 'bg-blue-100 text-blue-800'}">
                        {inv.status}
                    </span>
                </div>
            </div>

            <!-- Bill To -->
            <div class="grid grid-cols-2 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Billed To (Customer):</h3>
                    <p class="text-base font-bold text-gray-900">{inv.customer_name}</p>
                    <p class="text-gray-600 mt-0.5">{inv.customer_address}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{inv.customer_phone}</span></p>
                    {f'<p class="text-gray-600 mt-0.5">GSTIN: <span class="font-mono font-bold text-gray-800">{inv.customer_gstin}</span></p>' if inv.customer_gstin else ''}
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{inv.customer_code}</span></p>
                    <p class="text-gray-500 mt-1">Terms: <span class="font-medium text-gray-800">{inv.payment_terms or 'Standard Wholesale'}</span></p>
                </div>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left border-collapse my-6">
                <thead>
                    <tr class="border-b-2 border-gray-300 text-xs font-bold text-gray-600 uppercase">
                        <th class="py-2 text-center w-10">#</th>
                        <th class="py-2">Item Description</th>
                        <th class="py-2 text-center">HSN</th>
                        <th class="py-2 text-center">Qty</th>
                        <th class="py-2 text-right">Rate</th>
                        <th class="py-2 text-right">Disc %</th>
                        <th class="py-2 text-right">GST</th>
                        <th class="py-2 text-right">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>

            <!-- Summary & QR -->
            <div class="grid grid-cols-12 gap-6 pt-4 border-t-2 border-gray-300">
                <div class="col-span-7 text-xs text-gray-600 flex flex-col justify-between">
                    <div>
                        <h4 class="font-bold text-gray-800 uppercase tracking-wider mb-1">Bank & UPI Settlement:</h4>
                        <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                        <p class="mt-1">For direct orders & accounts support: <span class="font-bold">9347453135 / 9573261696</span></p>
                        <p class="mt-2 italic text-gray-500">Thank you for partnering with RAIS Agencies! Quality frozen food products delivered fresh.</p>
                    </div>
                </div>

                <div class="col-span-5 text-sm space-y-1.5 font-mono">
                    <div class="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>₹{inv.subtotal:.2f}</span>
                    </div>
                    {f'<div class="flex justify-between text-emerald-600"><span>Discount:</span><span>-₹{inv.discount_amount:.2f}</span></div>' if inv.discount_amount > 0 else ''}
                    <div class="flex justify-between text-gray-600">
                        <span>Taxable Amount:</span>
                        <span>₹{inv.taxable_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-gray-600">
                        <span>GST / Tax:</span>
                        <span>₹{inv.tax_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-base font-bold text-gray-900 border-t border-b border-gray-400 py-1 font-sans">
                        <span>Grand Total:</span>
                        <span class="font-mono">₹{inv.total_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-xs text-emerald-700 pt-1">
                        <span>Paid to Date:</span>
                        <span>₹{inv.paid_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-base font-black text-rose-700 bg-rose-50 p-1.5 rounded font-sans">
                        <span>Balance Due:</span>
                        <span class="font-mono">₹{inv.outstanding_amount:.2f}</span>
                    </div>
                </div>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-12 pt-8 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Customer Signature / Stamp</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-900">For RAIS AGENCIES</p>
                    <div class="h-10"></div>
                    <p class="text-gray-600">Authorized Signatory</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
