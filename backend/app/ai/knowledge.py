"""
Authoritative RAIS Agencies Business Knowledge & Semantic Ontology
"""

RAIS_KNOWLEDGE_BASE = {
    "business_profile": {
        "name": "RAIS AGENCIES",
        "tagline": "Wholesale Frozen Food Products & Packaging Solutions",
        "location": "Near Reddies Colony, Rayachoty - 516269, Andhra Pradesh, India",
        "phones": ["9347453135", "9573261696"],
        "channels": ["WhatsApp Ordering", "Direct Wholesale Counter", "Field Sales"],
        "partner_brands": [
            "McCain", "ITC Master Chef", "Ayamas", "Venky's", "Milky Mist",
            "Mrs. Bector's Cremica", "Dr. Oetker FunFoods", "Wingreens Farms",
            "Del Monte", "Foodrite", "Godrej", "VKL"
        ]
    },
    "domain_definitions": {
        "customer": "A restaurant, cafe, quick-service food joint, or retailer that purchases frozen foods or packaging from RAIS Agencies.",
        "catalogue_item": "A verified SKU stocked and sold by RAIS Agencies with a specified unit of measure (UOM) and wholesale rate.",
        "quotation": "A formal commercial estimate sent to a prospective or existing customer with validity window.",
        "order": "A confirmed booking of products awaiting dispatch or delivery.",
        "invoice": "A binding tax and commercial document detailing supplied products, applicable taxes, discounts, and payment terms.",
        "payment": "A financial settlement received via Cash, UPI, Bank NEFT/RTGS, Cheque, or Card.",
        "payment_allocation": "The exact settlement of a payment amount against an open issued invoice balance.",
        "outstanding_balance": "The unpaid remaining portion of issued invoices (Invoice Total - Allocated Payments)."
    },
    "calculation_rules": {
        "line_item_gross": "Quantity * Unit Price",
        "line_discount": "Line Gross * (Discount Rate / 100)",
        "line_taxable": "Line Gross - Line Discount",
        "line_tax": "Line Taxable * (Tax Rate / 100)",
        "line_total": "Line Taxable + Line Tax",
        "invoice_subtotal": "Sum of all line gross amounts",
        "invoice_taxable": "Invoice Subtotal - (Sum of item discounts + Invoice discount)",
        "invoice_tax": "Sum of all line tax amounts",
        "invoice_total": "Invoice Taxable + Invoice Tax",
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
