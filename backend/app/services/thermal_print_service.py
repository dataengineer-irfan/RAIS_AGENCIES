import urllib.parse
from typing import Dict, Any, List
from decimal import Decimal
from app.models.invoice import Invoice

class ThermalPrintService:
    HOTLINE = "9347453135"
    GSTIN = "37ABCDE1234F1Z5"
    UPI_ID = "9347453135@ybl" # Official Rayachoty UPI Handle
    BUSINESS_NAME = "RAIS AGENCIES"
    ADDRESS = "Reddies Colony, Rayachoty - 516269"

    @staticmethod
    def generate_upi_qr_string(invoice_number: str, amount: float) -> str:
        """
        Generates standard Indian NPCI UPI deep-link string for QR code generation
        """
        params = {
            "pa": ThermalPrintService.UPI_ID,
            "pn": ThermalPrintService.BUSINESS_NAME,
            "am": f"{amount:.2f}",
            "cu": "INR",
            "tn": f"Payment for {invoice_number}"
        }
        return f"upi://pay?{urllib.parse.urlencode(params)}"

    @staticmethod
    def build_thermal_receipt_payload(invoice: Invoice, paper_width: int = 58) -> Dict[str, Any]:
        """
        Builds structured thermal receipt data tailored for 58mm (32 chars) or 80mm (48 chars) ESC/POS printers.
        """
        char_width = 32 if paper_width == 58 else 48
        divider = "-" * char_width
        double_divider = "=" * char_width

        line_items = []
        for item in invoice.items:
            p_name = item.item_description or (item.product.name if item.product else "Item")
            max_name_len = 16 if paper_width == 58 else 24
            short_name = p_name[:max_name_len]

            line_items.append({
                "name": p_name,
                "short_name": short_name,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "tax_rate": float(item.tax_rate or 0),
                "tax_amount": float(item.tax_amount or 0),
                "line_total": float(item.line_total)
            })

        tax_total = 0.0
        cgst = 0.0
        sgst = 0.0

        grand_total = float(invoice.total_amount)
        paid_amount = float(invoice.paid_amount or 0.0)
        outstanding = float(invoice.outstanding_amount or 0.0)

        received_amount = None
        applied_to_previous = None
        payment_method = None
        if invoice.allocations:
            for alloc in invoice.allocations:
                if alloc.payment:
                    p_amt = float(alloc.payment.amount)
                    this_alloc = float(alloc.allocated_amount)
                    surplus = max(0.0, p_amt - this_alloc)
                    if received_amount is None or p_amt > received_amount:
                        received_amount = p_amt
                        applied_to_previous = surplus
                        payment_method = alloc.payment.payment_method
        if not payment_method:
            payment_method = "UPI" if "UPI" in (invoice.payment_terms or "").upper() else "CASH"

        # Only generate UPI QR code if the invoice is unpaid / has outstanding due
        upi_qr_data = None
        upi_qr_base64 = None
        if outstanding > 0.01:
            upi_qr_data = ThermalPrintService.generate_upi_qr_string(invoice.invoice_number, outstanding)
            try:
                import io, base64, qrcode
                qr_img = qrcode.make(upi_qr_data)
                buf = io.BytesIO()
                qr_img.save(buf, format="PNG")
                upi_qr_base64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
            except Exception:
                upi_qr_base64 = None

        cust_name = invoice.customer.business_name if invoice.customer else "Counter Sale"
        if invoice.customer and invoice.customer.contact_person and invoice.customer.contact_person.strip() and invoice.customer.contact_person.strip().lower() != cust_name.strip().lower():
            cust_name = f"{cust_name} ({invoice.customer.contact_person.strip()})"

        return {
            "header": {
                "business_name": ThermalPrintService.BUSINESS_NAME,
                "subtitle": "FROZEN FOODS & BEVERAGE WHOLESALE",
                "address": ThermalPrintService.ADDRESS,
                "hotline": ThermalPrintService.HOTLINE,
                "gstin": ThermalPrintService.GSTIN
            },
            "invoice_meta": {
                "invoice_number": invoice.invoice_number,
                "date": invoice.invoice_date.strftime("%d-%m-%Y") if invoice.invoice_date else "",
                "customer_name": cust_name,
                "customer_contact": invoice.customer.contact_person if invoice.customer else "",
                "customer_phone": invoice.customer.phone if invoice.customer else "",
                "status": invoice.status
            },
            "paper_width": paper_width,
            "char_width": char_width,
            "divider": divider,
            "double_divider": double_divider,
            "line_items": line_items,
            "financials": {
                "subtotal": float(invoice.subtotal),
                "cgst": 0.0,
                "sgst": 0.0,
                "tax_total": 0.0,
                "grand_total": round(grand_total, 2),
                "paid_amount": round(paid_amount, 2),
                "outstanding_balance": round(outstanding, 2),
                "received_amount": round(received_amount, 2) if received_amount is not None else None,
                "applied_to_previous": round(applied_to_previous, 2) if applied_to_previous is not None else None,
                "payment_method": payment_method
            },
            "upi": {
                "upi_id": ThermalPrintService.UPI_ID,
                "upi_qr_string": upi_qr_data,
                "upi_qr_base64": upi_qr_base64
            },
            "footer_message": "Thank you for partnering with RAIS Agencies!"
        }
