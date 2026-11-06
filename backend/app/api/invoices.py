import io
from datetime import date, datetime, timedelta
from decimal import Decimal
from PIL import Image, ImageDraw, ImageFont
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
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

@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """
    Edit a generated invoice: change customer, dates, line items, quantities.
    Stock is automatically reconciled (restored for removed/reduced items, 
    deducted for added/increased items).
    Guard: Cannot edit if payments are already allocated.
    """
    inv = BillingService.update_invoice(
        db=db,
        invoice_id=invoice_id,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return BillingService.delete_invoice(
        db=db,
        invoice_id=invoice_id,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )

@router.get("/{invoice_id}/print-html", response_class=HTMLResponse)
def get_printable_invoice(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice_by_id(db, invoice_id)

    # Calculate live Customer Total Ledger Balance and Breakdown
    cust_total_due = None
    if getattr(inv, 'customer_outstanding_balance', None) is not None:
        try:
            cust_total_due = Decimal(str(inv.customer_outstanding_balance))
        except Exception:
            cust_total_due = None

    if cust_total_due is None and inv.customer_id:
        try:
            from app.services.customer_service import CustomerService
            _, _, cust_bal = CustomerService.get_customer_balances(db, str(inv.customer_id))
            cust_total_due = Decimal(str(cust_bal or "0.00"))
        except Exception:
            cust_total_due = Decimal(str(inv.outstanding_amount or "0.00"))

    if cust_total_due is None:
        cust_total_due = Decimal(str(inv.outstanding_amount or "0.00"))

    inv_out = Decimal(str(inv.outstanding_amount or "0.00"))
    inv_total = Decimal(str(inv.total_amount or "0.00"))
    inv_status = str(inv.status or "").upper()

    # Determine Previous Balance and Total Customer Outstanding Balance
    if inv_status in ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID']:
        prev_balance = max(Decimal("0.00"), cust_total_due - inv_out)
        total_customer_due = cust_total_due
    else:
        prev_balance = max(Decimal("0.00"), cust_total_due)
        total_customer_due = prev_balance + inv_out
    
    # Format created_at to IST (UTC+5:30) with date & short time
    created_str = str(inv.invoice_date)
    if inv.created_at:
        try:
            ist_time = inv.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(inv.invoice_date)

    # Render rich HTML invoice template for direct print / PDF generation
    # Calculate intelligent in-stock restock recommendation based on customer history (strictly NO PRICES)
    restock_banner = ""
    try:
        from app.services.recommendation_service import RecommendationService
        exclude_pids = [str(getattr(itm, 'product_id', '')) for itm in (inv.items or []) if getattr(itm, 'product_id', None)]
        suggestion = RecommendationService.get_customer_restock_suggestion(
            db=db,
            customer_id=str(inv.customer_id),
            exclude_product_ids=exclude_pids
        )
        if suggestion:
            ctx_note = suggestion.get("context_note", "In Stock at Depot")
            p_name = suggestion.get("name", "Product")
            p_unit = suggestion.get("packaging_unit", "PACKET")
            p_img = suggestion.get("image_url", "https://rais-frontend.onrender.com/assets/products/boxes_display_pizza_burger.jpg")
            te_note = suggestion.get("telugu_note", "రాయచోటి డిపోలో తాజా స్టాక్ సిద్ధంగా ఉంది")
            import urllib.parse
            encoded_pname = urllib.parse.quote(p_name)
            restock_banner = f"""
            <div class="mt-5 p-3.5 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-300 rounded-xl text-xs flex items-center justify-between gap-4 shadow-sm">
                <div class="flex items-center gap-3.5">
                    <div class="w-16 h-16 rounded-lg bg-white border border-amber-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                        <img src="{p_img}" alt="{p_name}" class="w-full h-full object-contain" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <span class="text-2xl hidden">📦</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="px-2 py-0.5 bg-amber-200/90 text-amber-900 rounded font-black text-[9px] uppercase tracking-wider">🔥 Popular Companion</span>
                            <span class="text-[10px] font-bold text-amber-800">{ctx_note}</span>
                        </div>
                        <div class="font-black text-sm text-gray-900">{p_name}</div>
                        <div class="text-gray-600 text-[11px] font-medium flex items-center gap-2 mt-0.5">
                            <span>Pack: <strong class="text-gray-800">{p_unit}</strong></span>
                            <span>•</span>
                            <span class="text-emerald-700 font-bold">100% In Depot Stock</span>
                        </div>
                        <div class="text-[10px] text-amber-800/80 font-medium mt-0.5 italic">{te_note}</div>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-sm block text-center">Ready to Dispatch</span>
                    <a href="https://wa.me/919347453135?text=Hi%20RAIS%20Agencies%2C%20please%20add%20{encoded_pname}%20to%20our%20next%20delivery" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline mt-1.5 inline-block">1-Tap WhatsApp Order</a>
                </div>
            </div>
            """
    except Exception:
        restock_banner = ""

    items_rows = ""
    for idx, itm in enumerate(inv.items, 1):
        desc = getattr(itm, 'item_description', 'Product')
        pkg = getattr(itm, 'packaging_unit', 'PKT') or 'PKT'
        hsn = getattr(itm, 'hsn_code', '-') or '-'
        qty = getattr(itm, 'quantity', 1)
        price = float(getattr(itm, 'unit_price', 0))
        disc = float(getattr(itm, 'discount_rate', 0) or 0)
        ltotal = float(getattr(itm, 'line_total', 0))
        items_rows += f"""
        <tr class="border-b border-gray-200 text-sm">
            <td class="py-2.5 text-center text-gray-500 font-mono text-xs">{idx}</td>
            <td class="py-2.5 font-semibold text-gray-900 pl-1">{desc}</td>
            <td class="py-2.5 text-center text-gray-700 font-medium text-xs font-mono">{pkg}</td>
            <td class="py-2.5 text-center text-gray-500 font-mono text-xs">{hsn}</td>
            <td class="py-2.5 text-center font-bold font-mono text-gray-900">{qty}</td>
            <td class="py-2.5 text-right font-mono text-gray-800">₹{price:.2f}</td>
            <td class="py-2.5 text-right text-gray-600 font-mono text-xs">{disc:.1f}%</td>
            <td class="py-2.5 text-right font-bold font-mono text-gray-900 pr-1">₹{ltotal:.2f}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice {inv.invoice_number} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Tax Invoice #{inv.invoice_number}">
        <meta property="og:description" content="Billed To: {inv.customer_name} • Total: ₹{inv.total_amount:.2f} • Date: {created_str}">
        <meta property="og:image" content="https://rais-backend.onrender.com/api/invoices/{inv.id}/image">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
            body {{
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            }}
            @media print {{
                .no-print {{ display: none !important; }}
                body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #ffffff !important; padding: 0 !important; }}
            }}
        </style>
    </head>
    <body class="bg-gray-100 p-6 text-gray-800">
        <div id="standalone-action-bar" class="no-print max-w-4xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-emerald-600 text-white font-semibold rounded text-sm shadow hover:bg-emerald-700 flex items-center gap-1.5">
                <span>🖨️ Print / Save as PDF</span>
            </button>
        </div>
        <script>
            if (window.self !== window.top) {{
                var ab = document.getElementById('standalone-action-bar');
                if (ab) ab.style.display = 'none';
            }}
        </script>

        <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-sm border border-emerald-500">R</div>
                        <div>
                            <h1 class="text-2xl font-black tracking-wide text-gray-900">{settings.COMPANY_NAME}</h1>
                            <p class="text-xs font-bold uppercase tracking-widest text-amber-600">Central Frozen Food Depot • Rayachoty</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-2">{settings.COMPANY_ADDRESS}</p>
                    <p class="text-xs text-gray-600 font-semibold">Phone: {settings.COMPANY_PHONE_PRIMARY} | {settings.COMPANY_PHONE_SECONDARY}</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">WHOLESALE INVOICE</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{inv.invoice_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Date & Time: <span class="font-medium text-gray-800">{created_str}</span></p>
                    <p class="text-xs text-gray-500">Due Date: <span class="font-medium text-gray-800">{getattr(inv, 'due_date', '-') or '-'}</span></p>
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
                    {f'<p class="text-xs font-semibold text-gray-700 mt-0.5">Contact Person: <strong class="text-gray-900">{inv.customer_contact}</strong></p>' if getattr(inv, 'customer_contact', None) and inv.customer_contact.strip() and inv.customer_contact.strip().lower() != inv.customer_name.strip().lower() and inv.customer_contact.strip().lower() not in (inv.customer_name or "").lower() else ''}
                    <p class="text-gray-600 mt-0.5">{inv.customer_address}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{inv.customer_phone}</span></p>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{inv.customer_code}</span></p>
                    <p class="text-gray-500 mt-1">Terms: <span class="font-medium text-gray-800">{inv.payment_terms or 'Standard Wholesale'}</span></p>
                </div>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left border-collapse my-6">
                <thead>
                    <tr class="border-b-2 border-gray-900 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50">
                        <th class="py-2.5 text-center w-10">#</th>
                        <th class="py-2.5 pl-1">Item Description & SKU</th>
                        <th class="py-2.5 text-center">Packaging</th>
                        <th class="py-2.5 text-center">HSN</th>
                        <th class="py-2.5 text-center">Qty</th>
                        <th class="py-2.5 text-right">Rate</th>
                        <th class="py-2.5 text-right">Disc %</th>
                        <th class="py-2.5 text-right pr-1">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>

            <!-- Summary & Settlement / QR -->
            <div class="grid grid-cols-12 gap-6 pt-4 border-t-2 border-gray-300">
                <div class="col-span-7 text-xs text-gray-600 flex flex-col justify-between">
                    {'<div class="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-1">'
                     '<div class="flex items-center justify-between pb-1 border-b border-emerald-200">'
                     '  <span class="font-bold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">'
                     '    ✓ PAYMENT SETTLEMENT CONFIRMED'
                     '  </span>'
                     f'  <span class="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold font-mono text-[10px] uppercase">{inv.payment_method or "CASH"}</span>'
                     '</div>'
                     f'<div class="flex justify-between pt-1"><span class="text-gray-700">Total Received / Settled:</span><span class="font-bold font-mono text-gray-900">₹{getattr(inv, "received_amount", None) or inv.paid_amount:.2f}</span></div>'
                     f'<div class="flex justify-between"><span class="text-gray-700">Applied to This Bill:</span><span class="font-bold font-mono text-emerald-700">₹{inv.paid_amount:.2f}</span></div>'
                     + (f'<div class="flex justify-between text-amber-800 font-semibold"><span>Adjusted to Past Dues / Bills:</span><span class="font-bold font-mono">₹{inv.applied_to_previous:.2f}</span></div>' if getattr(inv, 'applied_to_previous', None) and inv.applied_to_previous > 0 else '')
                     + (f'<div class="mt-1 pt-1 border-t border-emerald-200 text-[11px] font-bold text-emerald-800">✓ ALL DUES FULLY CLEARED (Current Ledger: ₹0.00)</div>' if total_customer_due <= Decimal("0.01") else f'<div class="mt-1 pt-1 border-t border-amber-200 text-[11px] font-bold text-amber-800">Remaining Ledger Balance: ₹{total_customer_due:.2f}</div>')
                     + '</div>'
                     if (inv.status == 'PAID' or (getattr(inv, 'received_amount', None) and inv.received_amount > 0)) else
                     f'''<div>
                     <h4 class="font-bold text-gray-800 uppercase tracking-wider mb-1">Bank & UPI Settlement:</h4>
                     <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                     <p class="mt-1">For direct orders & accounts support: <span class="font-bold">9347453135 / 9573261696</span></p>
                     <p class="mt-2 text-[11px] font-semibold text-emerald-700">✓ Wholesale GST Status: Intra-State AP Registered • Direct Wholesale Pricing (0.00% GST)</p>
                     <div class="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-300 rounded-lg text-xs space-y-1">
                         <div class="font-black text-amber-950 uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-amber-200 pb-1">
                             <span>📋 Driver & Counter Collection Slip</span>
                             <span class="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded font-bold font-mono text-[9px]">{inv.customer_code}</span>
                         </div>
                         <div class="flex justify-between text-[11px] text-gray-700 pt-0.5">
                             <span>Current Bill Due:</span>
                             <span class="font-mono font-bold text-gray-900">₹{inv_out:.2f}</span>
                         </div>
                         <div class="flex justify-between text-[11px] text-gray-700">
                             <span>Previous Overdue Ledger:</span>
                             <span class="font-mono font-bold text-amber-900">₹{prev_balance:.2f}</span>
                         </div>
                         <div class="flex justify-between text-xs font-black text-rose-900 pt-1 border-t border-amber-300">
                             <span>Total Due to Collect:</span>
                             <span class="font-mono text-sm font-black text-rose-700">₹{total_customer_due:.2f}</span>
                         </div>
                     </div>
                     <p class="mt-2 italic text-gray-500">Thank you for partnering with RAIS Agencies! Quality frozen food products delivered fresh.</p>
                     </div>'''}
                </div>

                <div class="col-span-5 text-sm space-y-1.5 font-mono">
                    <div class="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>₹{inv.subtotal:.2f}</span>
                    </div>
                    {f'<div class="flex justify-between text-emerald-600"><span>Discount:</span><span>-₹{inv.discount_amount:.2f}</span></div>' if inv.discount_amount > 0 else ''}
                    <div class="flex justify-between text-gray-800 font-semibold pt-1 border-t border-gray-200 text-xs">
                        <span>Taxable Value (ITC Eligible):</span>
                        <span class="font-bold text-sm">₹{inv.taxable_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 pl-1.5">
                        <span>• CGST (0.00%):</span>
                        <span>₹0.00</span>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 pl-1.5">
                        <span>• SGST (0.00%):</span>
                        <span>₹0.00</span>
                    </div>
                    <div class="flex justify-between text-base font-bold text-gray-900 border-t border-b-2 border-gray-900 py-1.5 font-sans">
                        <span>Invoice Grand Total:</span>
                        <span class="font-mono font-black">₹{inv.total_amount:.2f}</span>
                    </div>
                    {f'<div class="flex justify-between text-xs text-emerald-700 pt-1 font-semibold"><span>Amount Received on Bill:</span><span>₹{inv.received_amount:.2f}</span></div>' if getattr(inv, 'received_amount', None) and inv.received_amount > 0 else f'<div class="flex justify-between text-xs text-emerald-700 pt-1 font-semibold"><span>Paid on this Bill:</span><span>₹{inv.paid_amount:.2f}</span></div>' if inv.paid_amount > 0 else ''}
                    {f'<div class="flex justify-between text-xs text-sky-700 font-semibold"><span>Past Dues Cleared:</span><span>₹{inv.applied_to_previous:.2f}</span></div>' if getattr(inv, 'applied_to_previous', None) and inv.applied_to_previous > 0 else ''}
                    <div class="flex justify-between text-xs text-gray-700 pt-0.5">
                        <span>This Bill Balance Due:</span>
                        <span class="font-mono font-bold text-gray-900">₹{inv_out:.2f}</span>
                    </div>
                    <div class="flex justify-between text-xs text-amber-800 font-medium">
                        <span>Previous Ledger Balance:</span>
                        <span class="font-mono font-bold">₹{prev_balance:.2f}</span>
                    </div>
                    {f'''
                    <div class="flex justify-between items-center text-sm font-black text-rose-800 bg-rose-50 border-2 border-rose-300 p-2.5 rounded-lg font-sans mt-2 shadow-sm">
                        <div>
                            <div class="uppercase tracking-wider text-[11px] text-rose-900 font-black">Total Outstanding Balance:</div>
                            <div class="text-[9px] font-medium text-rose-600">(This Bill + Previous Unpaid Dues)</div>
                        </div>
                        <span class="font-mono text-base font-black text-rose-700">₹{total_customer_due:.2f}</span>
                    </div>
                    ''' if total_customer_due > Decimal("0.01") else '''
                    <div class="flex justify-between items-center text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg font-sans mt-2 shadow-sm">
                        <span class="uppercase tracking-wider text-[10px]">Total Outstanding Balance:</span>
                        <span class="font-mono text-xs font-bold text-emerald-700">₹0.00 (All Dues Cleared)</span>
                    </div>
                    '''}
                </div>
            </div>

            {restock_banner}

            <!-- Direct Quick Links (Bold Green Badges) -->
            <div class="mt-8 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 print:hidden flex flex-wrap items-center justify-between gap-3">
                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    ⚡ Quick Online Links:
                </span>
                <div class="flex flex-wrap items-center gap-2">
                    <a href="https://wa.me/919347453135" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>🟢 WhatsApp Orders</span>
                    </a>
                    <a href="https://rais-frontend.onrender.com/catalogue.html" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>📖 Photo Catalogue</span>
                    </a>
                    <a href="https://rais-frontend.onrender.com/#/products" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>🌐 Website & Products</span>
                    </a>
                </div>
            </div>

            <!-- Printed Links (For paper print / PDF rendering) -->
            <div class="hidden print:block mt-6 pt-3 border-t border-gray-200 text-[10px] text-gray-600">
                <p><strong>🟢 WhatsApp Orders:</strong> wa.me/919347453135 &nbsp;•&nbsp; <strong>📖 Photo Catalogue:</strong> rais-frontend.onrender.com/catalogue.html &nbsp;•&nbsp; <strong>🌐 Website:</strong> rais-frontend.onrender.com</p>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-10 pt-6 text-xs text-gray-500 border-t border-gray-200">
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


@router.get("/{invoice_id}/image")
def get_invoice_image(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice_by_id(db, invoice_id)
    
    # Format date & short time in IST
    created_str = str(inv.invoice_date)
    if inv.created_at:
        try:
            ist_time = inv.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(inv.invoice_date)

    items = list(inv.items) if inv.items else []
    item_count = len(items) if items else 1
    
    # Dynamic sizing based on item rows + restock recommendation strip
    width = 800
    row_height = 34
    
    suggestion = None
    try:
        from app.services.recommendation_service import RecommendationService
        exclude_pids = [str(getattr(itm, 'product_id', '')) for itm in items if getattr(itm, 'product_id', None)]
        suggestion = RecommendationService.get_customer_restock_suggestion(
            db=db,
            customer_id=str(inv.customer_id),
            exclude_product_ids=exclude_pids
        )
    except Exception:
        suggestion = None

    rec_strip_h = 44 if suggestion else 0
    height = 650 + (item_count * row_height) + rec_strip_h
    
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    def load_font(size, bold=False):
        candidates = ["arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "calibri.ttf", "segoeui.ttf"]
        for c in candidates:
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
        return ImageFont.load_default()

    f_title = load_font(24, bold=True)
    f_sub = load_font(12)
    f_bold = load_font(12, bold=True)
    f_regular = load_font(11)
    f_mono = load_font(12, bold=True)
    f_small = load_font(10)

    # 1. Header Banner (Navy + Gold Accent)
    draw.rectangle([(0, 0), (width, 130)], fill=(15, 23, 42))
    draw.rectangle([(0, 126), (width, 130)], fill=(245, 158, 11))

    draw.text((30, 18), settings.COMPANY_NAME, fill=(245, 158, 11), font=f_title)
    draw.text((30, 50), settings.COMPANY_TAGLINE, fill=(148, 163, 184), font=f_sub)
    draw.text((30, 72), f"{settings.COMPANY_ADDRESS} • Phone: {settings.COMPANY_PHONE_PRIMARY}", fill=(203, 213, 225), font=f_small)
    draw.text((30, 90), "Depot Hours: 8:00 AM - 9:30 PM (All 7 Days) • UPI: 9347453135@ybl", fill=(203, 213, 225), font=f_small)

    # Invoice Meta Box (Header Right)
    draw.rectangle([(width - 240, 16), (width - 30, 115)], fill=(30, 41, 59), outline=(51, 65, 85))
    draw.text((width - 225, 24), "TAX INVOICE", fill=(248, 250, 252), font=f_bold)
    draw.text((width - 225, 44), f"#{inv.invoice_number}", fill=(245, 158, 11), font=f_mono)
    draw.text((width - 225, 64), f"Date: {created_str}", fill=(148, 163, 184), font=f_small)
    status_color = (16, 185, 129) if inv.status == "PAID" else (245, 158, 11)
    draw.text((width - 225, 86), f"STATUS: {inv.status}", fill=status_color, font=f_bold)

    # 2. Customer Info Card
    draw.rectangle([(30, 145), (width - 30, 225)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((45, 155), "BILLED TO (CUSTOMER):", fill=(100, 116, 139), font=f_small)
    draw.text((45, 172), inv.customer_name, fill=(15, 23, 42), font=f_bold)
    draw.text((45, 194), f"Phone: {inv.customer_phone or '-'}  •  Code: {inv.customer_code or '-'}  •  Terms: {inv.payment_terms or 'Standard'}", fill=(71, 85, 105), font=f_regular)

    # 3. Items Table
    tbl_y = 240
    tbl_right = width - 48  # 752px (18px clean padding inside 770px table boundary)

    def draw_right(x, y, text, fill, font):
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            w = bbox[2] - bbox[0]
            draw.text((x - w, y), text, fill=fill, font=font)
        except Exception:
            draw.text((x - 80, y), text, fill=fill, font=font)

    draw.rectangle([(30, tbl_y), (width - 30, tbl_y + 30)], fill=(15, 23, 42))
    draw.text((42, tbl_y + 8), "#", fill=(248, 250, 252), font=f_bold)
    draw.text((80, tbl_y + 8), "ITEM DESCRIPTION", fill=(248, 250, 252), font=f_bold)
    draw.text((430, tbl_y + 8), "UNIT", fill=(248, 250, 252), font=f_bold)
    draw.text((510, tbl_y + 8), "QTY", fill=(248, 250, 252), font=f_bold)
    draw.text((600, tbl_y + 8), "RATE (₹)", fill=(248, 250, 252), font=f_bold)
    draw_right(tbl_right, tbl_y + 8, "TOTAL (₹)", fill=(248, 250, 252), font=f_bold)

    cur_y = tbl_y + 30
    if items:
        for idx, itm in enumerate(items, 1):
            bg = (255, 255, 255) if idx % 2 == 1 else (248, 250, 252)
            draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=bg)
            draw.line([(30, cur_y + row_height), (width - 30, cur_y + row_height)], fill=(241, 245, 249))

            draw.text((42, cur_y + 9), str(idx), fill=(100, 116, 139), font=f_regular)
            desc = itm.item_description[:38] + ("..." if len(itm.item_description) > 38 else "")
            draw.text((80, cur_y + 9), desc, fill=(30, 41, 59), font=f_bold)
            draw.text((430, cur_y + 9), str(itm.packaging_unit or "PKT"), fill=(100, 116, 139), font=f_regular)
            draw.text((510, cur_y + 9), str(itm.quantity), fill=(15, 23, 42), font=f_bold)
            draw.text((600, cur_y + 9), f"₹{itm.unit_price:.2f}", fill=(71, 85, 105), font=f_regular)
            draw_right(tbl_right, cur_y + 9, f"₹{itm.line_total:.2f}", fill=(15, 23, 42), font=f_bold)
            cur_y += row_height
    else:
        draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=(255, 255, 255))
        draw.text((80, cur_y + 9), "Wholesale frozen foods & supplies", fill=(30, 41, 59), font=f_bold)
        draw.text((510, cur_y + 9), "1", fill=(15, 23, 42), font=f_bold)
        draw_right(tbl_right, cur_y + 9, f"₹{inv.total_amount:.2f}", fill=(15, 23, 42), font=f_bold)
        cur_y += row_height

    # 3b. In-Stock Restock Strip on Image Card (strictly NO PRICES)
    if suggestion:
        cur_y += 10
        strip_h = 32
        draw.rectangle([(30, cur_y), (width - 30, cur_y + strip_h)], fill=(254, 243, 199), outline=(251, 191, 36))
        ctx_tag = (suggestion.get("context_note") or "In Stock at Depot").upper()
        p_name = (suggestion.get("name") or "Product")[:42]
        p_unit = suggestion.get("packaging_unit") or "PACKET"
        draw.text((45, cur_y + 8), f"📦 {ctx_tag}: {p_name} ({p_unit})", fill=(146, 64, 14), font=f_bold)
        draw.rectangle([(width - 170, cur_y + 5), (width - 45, cur_y + strip_h - 5)], fill=(5, 150, 105))
        draw.text((width - 158, cur_y + 8), "IN STOCK AT DEPOT", fill=(255, 255, 255), font=f_small)
        cur_y += strip_h

    # 4. Summary & UPI Cards
    cur_y += 15
    box_h = 145
    sum_right = width - 48  # 752px

    # Calculate customer overall balance and prior balance
    cust_total_due = None
    if getattr(inv, 'customer_outstanding_balance', None) is not None:
        try:
            cust_total_due = Decimal(str(inv.customer_outstanding_balance))
        except Exception:
            cust_total_due = None

    if cust_total_due is None and inv.customer_id:
        try:
            from app.services.customer_service import CustomerService
            _, _, cust_bal = CustomerService.get_customer_balances(db, str(inv.customer_id))
            cust_total_due = Decimal(str(cust_bal or "0.00"))
        except Exception:
            cust_total_due = Decimal(str(inv.outstanding_amount or "0.00"))

    if cust_total_due is None:
        cust_total_due = Decimal(str(inv.outstanding_amount or "0.00"))

    inv_out = Decimal(str(inv.outstanding_amount or "0.00"))
    prev_balance = max(Decimal("0.00"), cust_total_due - inv_out)

    # UPI Box (Left)
    draw.rectangle([(30, cur_y), (420, cur_y + box_h)], fill=(240, 253, 244), outline=(187, 247, 208))
    draw.text((45, cur_y + 12), "💳 OFFICIAL UPI SETTLEMENT:", fill=(21, 128, 61), font=f_bold)
    draw.text((45, cur_y + 34), "9347453135@ybl", fill=(15, 23, 42), font=f_title)
    draw.text((45, cur_y + 70), "Payee: RAIS AGENCIES • GPay / PhonePe: 9347453135", fill=(51, 65, 85), font=f_regular)
    draw.text((45, cur_y + 92), "Share payment confirmation on WhatsApp for instant credit.", fill=(21, 128, 61), font=f_small)

    # Totals Box (Right)
    draw.rectangle([(440, cur_y), (width - 30, cur_y + box_h)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((455, cur_y + 10), "Subtotal:", fill=(100, 116, 139), font=f_regular)
    draw_right(sum_right, cur_y + 10, f"₹{inv.subtotal:.2f}", fill=(30, 41, 59), font=f_bold)

    # Dark Card for Invoice Total
    draw.rectangle([(450, cur_y + 28), (width - 40, cur_y + 56)], fill=(15, 23, 42))
    draw.text((462, cur_y + 36), "INVOICE TOTAL:", fill=(245, 158, 11), font=f_bold)
    draw_right(width - 52, cur_y + 36, f"₹{inv.total_amount:.2f}", fill=(255, 255, 255), font=f_mono)

    if inv.paid_amount > 0:
        draw.text((455, cur_y + 64), "Paid on Bill:", fill=(5, 150, 105), font=f_regular)
        draw_right(sum_right, cur_y + 64, f"-₹{inv.paid_amount:.2f}", fill=(5, 150, 105), font=f_bold)
    else:
        draw.text((455, cur_y + 64), "Prior Balance:", fill=(180, 83, 9), font=f_regular)
        draw_right(sum_right, cur_y + 64, f"₹{prev_balance:.2f}", fill=(180, 83, 9), font=f_bold)

    draw.text((455, cur_y + 82), "This Bill Balance:", fill=(100, 116, 139), font=f_regular)
    draw_right(sum_right, cur_y + 82, f"₹{inv_out:.2f}", fill=(30, 41, 59), font=f_bold)

    # Line separator
    draw.line([(450, cur_y + 102), (width - 40, cur_y + 102)], fill=(226, 232, 240))

    due_color = (225, 29, 72) if cust_total_due > Decimal("0.01") else (5, 150, 105)
    draw.text((455, cur_y + 108), "TOTAL BALANCE DUE:", fill=due_color, font=f_bold)
    draw_right(sum_right, cur_y + 108, f"₹{cust_total_due:.2f}", fill=due_color, font=f_mono)

    # 4b. Direct Quick Links Banner (Bold Emerald Card)
    cur_y += box_h + 10
    draw.rectangle([(30, cur_y), (width - 30, cur_y + 48)], fill=(236, 253, 245), outline=(167, 243, 208))
    draw.text((45, cur_y + 8), "🟢 WhatsApp Orders: 9347453135 (wa.me/919347453135)", fill=(4, 120, 87), font=f_bold)
    draw.text((430, cur_y + 8), "🌐 Online Store: Live Products & Pricing", fill=(6, 95, 70), font=f_bold)
    draw.text((45, cur_y + 26), "📖 Photo Catalogue: 66+ Frozen SKUs Available (Tap links in message to open)", fill=(4, 120, 87), font=f_bold)

    # 5. Footer
    cur_y += 58
    draw.line([(0, cur_y), (width, cur_y)], fill=(226, 232, 240))
    draw.text((30, cur_y + 8), "Official Computer Generated Invoice • RAIS AGENCIES Rayachoty (-18°C Deep Cold-Chain Depot)", fill=(100, 116, 139), font=f_small)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="RAIS_Invoice_{inv.invoice_number}.png"'}
    )

@router.get("/{invoice_id}/restock-suggestion")
def get_invoice_restock_suggestion(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns an intelligent, in-stock restock suggestion based on customer history (strictly NO PRICES).
    Safe, read-only endpoint with graceful empty fallback.
    """
    try:
        from app.services.recommendation_service import RecommendationService
        inv = BillingService.get_invoice_by_id(db, invoice_id)
        exclude_pids = [str(getattr(itm, 'product_id', '')) for itm in (inv.items or []) if getattr(itm, 'product_id', None)]
        suggestion = RecommendationService.get_customer_restock_suggestion(
            db=db,
            customer_id=str(inv.customer_id),
            exclude_product_ids=exclude_pids
        )
        return {"suggestion": suggestion}
    except Exception:
        return {"suggestion": None}

