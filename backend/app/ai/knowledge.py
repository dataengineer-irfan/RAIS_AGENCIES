"""
Authoritative RAIS Agencies Business Knowledge & Semantic Ontology
"""

RAIS_KNOWLEDGE_BASE = {
    "business_profile": {
        "name": "RAIS AGENCIES",
        "tagline": "Wholesale Frozen Food Products & Packaging Solutions",
        "location": "Near Reddies Colony, Rayachoty - 516269, Andhra Pradesh, India",
        "phones": ["9347453135", "9573261696"],
        "upi_id": "9347453135@ybl",
        "channels": ["WhatsApp Ordering", "Direct Wholesale Counter", "Field Delivery Sales"],
        "partner_brands": [
            "McCain", "ITC Master Chef", "Ayamas", "Venky's", "Milky Mist",
            "Mrs. Bector's Cremica", "Dr. Oetker FunFoods", "Wingreens Farms",
            "Del Monte", "Foodrite", "Godrej", "VKL", "Signature", "Nutrich", "Hup Hup"
        ]
    },
    "domain_definitions": {
        "customer": "A restaurant, cafe, quick-service food joint, or retailer that purchases frozen foods or packaging from RAIS Agencies in Rayachoty & surrounding territories.",
        "catalogue_item": "A verified SKU stocked and sold by RAIS Agencies with a specified unit of measure (UOM) and wholesale cash rate.",
        "order": "A confirmed route booking of products awaiting dispatch or delivery.",
        "invoice": "A binding commercial wholesale invoice detailing supplied products, quantity, wholesale rate, and cash settlement terms.",
        "payment": "A financial settlement received via UPI (9347453135@ybl), Cash on Delivery, or Bank Transfer.",
        "payment_allocation": "The exact settlement of a payment amount against an open issued invoice balance.",
        "outstanding_balance": "The unpaid remaining portion of issued invoices (Invoice Total - Allocated Payments)."
    },
    "calculation_rules": {
        "business_model": "Direct Wholesale Cash / Immediate Settlement (Zero GST Wholesale)",
        "line_item_gross": "Quantity * Wholesale Rate",
        "line_discount": "Line Gross * (Discount Rate / 100)",
        "line_total": "Line Gross - Line Discount",
        "invoice_subtotal": "Sum of all line gross amounts",
        "invoice_total": "Invoice Subtotal - (Sum of item discounts + Invoice discount)",
        "payment_terms": "Cash on Delivery / Immediate Settlement (Invoice Date = Due Date)",
        "upi_settlement": "9347453135@ybl (RAIS Agencies)",
        "outstanding_amount": "Invoice Total - Allocated Payments"
    },
    "invoice_states": {
        "DRAFT": "Created but not yet finalized or issued to the customer.",
        "ISSUED": "Finalized and delivered to customer; waiting for payment settlement.",
        "PARTIALLY_PAID": "Part of the invoice amount has been settled by payments.",
        "PAID": "The entire invoice amount has been completely settled (Outstanding = 0.00).",
        "OVERDUE": "Due date has passed and remaining outstanding amount > 0.00.",
        "CANCELLED": "Invoice cancelled before payment allocation.",
        "VOID": "Invoice voided by admin due to formal error."
    }
}
