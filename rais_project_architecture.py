"""
========================================================================================
RAIS AGENCIES BUSINESS MANAGEMENT & BILLING PLATFORM — COMPLETE ARCHITECTURAL GRAPH
========================================================================================
Purpose:
  This script is a self-contained, machine-readable, and human-readable blueprint of the
  RAIS Agencies codebase, database architecture, domain workflows, and API graph.
  
  Any AI model or software architect can run this file directly with Python:
    `python rais_project_architecture.py`
    `python rais_project_architecture.py --format mermaid`
    `python rais_project_architecture.py --format json`
========================================================================================
"""

import sys
import json
import os

# Set UTF-8 console output for Windows compatibility
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# --------------------------------------------------------------------------------------
# 1. CORE SYSTEM METADATA
# --------------------------------------------------------------------------------------

SYSTEM_METADATA = {
    "project_name": "RAIS Agencies Business Management Platform",
    "industry": "B2B Frozen Foods & Beverage Wholesale Distribution",
    "location": "Reddies Colony, Rayachoty, Annamayya District, Andhra Pradesh - 516269",
    "hotlines": ["9347453135", "9573261696"],
    "target_users": "3 Non-Technical Business Operators (Admin, Operator, Viewer)",
    "git_repository": "https://github.com/rais-agencies/Rais-Agencies.git",
    "database": {
        "engine": "PostgreSQL 15+ (Hosted on Supabase Connection Pooler)",
        "host": "aws-0-ap-northeast-1.pooler.supabase.com",
        "port": 6543,
        "database": "postgres",
        "user": "postgres.gdxuwquplzyktrclvezy"
    },
    "tech_stack": {
        "backend": "Python 3.12 + FastAPI + SQLAlchemy ORM + Pydantic v2 + Uvicorn (Port 8001)",
        "frontend": "React 18 + Vite + Tailwind CSS + Lucide React (Port 3000)",
        "testing": "Playwright Python E2E Automated QA Suite",
        "ai_engine": "Semantic Business Knowledge Layer (Deterministic SQL Tools + NLP Router)"
    }
}

# --------------------------------------------------------------------------------------
# 2. NON-TECHNICAL OPERATING MODEL (BUSINESS WORKFLOW GRAPH)
# --------------------------------------------------------------------------------------

OPERATING_MODEL = {
    "philosophy": (
        "Non-technical operators think exclusively in commercial business terms "
        "(Customer, Product, Stock, Order, Invoice, Payment, Report, AI Assistant). "
        "The system silently translates all modal actions into atomic database transactions with full audit logging."
    ),
    "workflow_pipeline": [
        {"step": 1, "module": "Authentication", "action": "Secure JWT Login", "roles": ["ADMIN", "OPERATOR", "VIEWER"]},
        {"step": 2, "module": "Executive Dashboard", "action": "Commercial KPIs, Total Receivables, Fast Moving SKUs", "route": "/api/reports/dashboard"},
        {"step": 3, "module": "Customer Directory", "action": "Register Restaurant / View Workspace Profile", "entity": "Customer (CUST-XXXX)"},
        {"step": 4, "module": "Master Catalogue", "action": "Add/Edit SKUs, Dual Pricing (Base+GST), WhatsApp Price Sheet", "entity": "Product (RAIS-XXX-XX)"},
        {"step": 5, "module": "Inventory Engine", "action": "Stock Intake (REC-XXXX) & Breakage Adjustments (ADJ-XXXX)", "entity": "StockMovement"},
        {"step": 6, "module": "Orders & Bookings", "action": "Customer Booking (ORD-XXXX) with live warehouse stock reservation", "entity": "Order / OrderItem"},
        {"step": 7, "module": "Tax Billing", "action": "1-Click Convert Order to GST Tax Invoice (INV-XXXX) & Stock Deduction", "entity": "Invoice / InvoiceItem"},
        {"step": 8, "module": "Payment Settlements", "action": "Record UPI/Cash Settlement (PAY-XXXX) & Reconcile Invoices", "entity": "Payment / Allocation"},
        {"step": 9, "module": "Customer Ledger", "action": "Real-time running debit/credit statement timeline", "entity": "LedgerEntry"},
        {"step": 10, "module": "Reports & Aging", "action": "Receivables Aging Buckets (0-15, 16-30, 31-60, 60+ days)", "entity": "AgingReport"},
        {"step": 11, "module": "Semantic AI Assistant", "action": "Conversational tool execution for instant balance/pricing lookups", "endpoint": "/api/ai/query"}
    ]
}

# --------------------------------------------------------------------------------------
# 3. DATABASE SCHEMA & ENTITY RELATIONSHIPS
# --------------------------------------------------------------------------------------

DATABASE_ENTITIES = [
    {
        "table_name": "users",
        "description": "System operators, administrators, and viewers with bcrypt hashed passwords",
        "columns": [
            "id (UUID, PK)", "username (VARCHAR, UNIQUE)", "hashed_password (VARCHAR)",
            "full_name (VARCHAR)", "role (ENUM: ADMIN, OPERATOR, VIEWER)", "is_active (BOOLEAN)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Has many AuditLogs"]
    },
    {
        "table_name": "categories",
        "description": "Product categories (Chicken Items, Veg Items, Sauces, Cheese & Dairy, Packaging, etc.)",
        "columns": [
            "id (UUID, PK)", "code (VARCHAR, UNIQUE)", "name (VARCHAR)", "description (TEXT)",
            "display_order (INT)", "is_active (BOOLEAN)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Has many Products (1:N)"]
    },
    {
        "table_name": "products",
        "description": "Authoritative Master SKU catalogue with wholesale pricing, GST, and warehouse stock levels",
        "columns": [
            "id (UUID, PK)", "category_id (UUID, FK -> categories.id)", "sku (VARCHAR, UNIQUE)",
            "name (VARCHAR)", "brand (VARCHAR)", "packaging_unit (VARCHAR)", "unit_quantity (NUMERIC)",
            "base_price (NUMERIC)", "tax_rate (NUMERIC)", "hsn_code (VARCHAR)", "description (TEXT)",
            "current_stock (NUMERIC)", "min_stock_alert (NUMERIC)", "is_active (BOOLEAN)", "created_at (TIMESTAMP)"
        ],
        "relationships": [
            "Belongs to Category (N:1)", "Has many StockMovements (1:N)",
            "Referenced by OrderItems (1:N)", "Referenced by InvoiceItems (1:N)"
        ]
    },
    {
        "table_name": "customers",
        "description": "B2B Restaurants, Cafes, and Wholesale Food Clients in Rayachoty & Region",
        "columns": [
            "id (UUID, PK)", "code (VARCHAR, UNIQUE, e.g. CUST-0001)", "name (VARCHAR)", "contact_person (VARCHAR)",
            "phone (VARCHAR)", "email (VARCHAR)", "address (TEXT)", "gstin (VARCHAR)",
            "credit_limit (NUMERIC)", "payment_terms_days (INT)", "is_active (BOOLEAN)", "created_at (TIMESTAMP)"
        ],
        "relationships": [
            "Has many Orders (1:N)", "Has many Invoices (1:N)",
            "Has many Payments (1:N)", "Has many LedgerEntries (1:N)"
        ]
    },
    {
        "table_name": "stock_movements",
        "description": "Complete audit trail for stock receipts, adjustments, and order dispatches",
        "columns": [
            "id (UUID, PK)", "product_id (UUID, FK -> products.id)", "movement_type (ENUM: IN_PURCHASE, OUT_SALE, ADJUSTMENT, RETURN)",
            "reference_number (VARCHAR, e.g. REC-XXXX, ADJ-XXXX, INV-XXXX)", "quantity (NUMERIC)",
            "batch_number (VARCHAR)", "supplier_name (VARCHAR)", "purchase_cost (NUMERIC)",
            "reason (TEXT)", "created_by (UUID, FK -> users.id)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to Product (N:1)", "Belongs to User (N:1)"]
    },
    {
        "table_name": "orders",
        "description": "Advance restaurant bookings and reservations prior to tax invoice generation",
        "columns": [
            "id (UUID, PK)", "order_number (VARCHAR, UNIQUE, e.g. ORD-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "order_date (DATE)", "required_delivery_date (DATE)",
            "status (ENUM: DRAFT, CONFIRMED, FULFILLED, CANCELLED)", "subtotal (NUMERIC)",
            "tax_total (NUMERIC)", "grand_total (NUMERIC)", "notes (TEXT)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to Customer (N:1)", "Has many OrderItems (1:N)", "Linked to Invoice (1:1)"]
    },
    {
        "table_name": "order_items",
        "description": "Line items for customer advance orders",
        "columns": [
            "id (UUID, PK)", "order_id (UUID, FK -> orders.id)", "product_id (UUID, FK -> products.id)",
            "quantity (NUMERIC)", "unit_price (NUMERIC)", "tax_rate (NUMERIC)",
            "tax_amount (NUMERIC)", "line_total (NUMERIC)"
        ],
        "relationships": ["Belongs to Order (N:1)", "Belongs to Product (N:1)"]
    },
    {
        "table_name": "invoices",
        "description": "Official GST-Compliant B2B Tax Invoices with deterministic sequence numbers",
        "columns": [
            "id (UUID, PK)", "invoice_number (VARCHAR, UNIQUE, e.g. INV-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "order_id (UUID, FK -> orders.id, NULLABLE)",
            "invoice_date (DATE)", "due_date (DATE)", "subtotal (NUMERIC)", "tax_total (NUMERIC)",
            "grand_total (NUMERIC)", "paid_amount (NUMERIC)", "outstanding_amount (NUMERIC)",
            "status (ENUM: DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED, OVERDUE)",
            "notes (TEXT)", "created_at (TIMESTAMP)"
        ],
        "relationships": [
            "Belongs to Customer (N:1)", "Linked to Order (1:1)",
            "Has many InvoiceItems (1:N)", "Has many PaymentAllocations (1:N)"
        ]
    },
    {
        "table_name": "invoice_items",
        "description": "Line items for official tax invoices",
        "columns": [
            "id (UUID, PK)", "invoice_id (UUID, FK -> invoices.id)", "product_id (UUID, FK -> products.id)",
            "quantity (NUMERIC)", "unit_price (NUMERIC)", "tax_rate (NUMERIC)",
            "tax_amount (NUMERIC)", "line_total (NUMERIC)"
        ],
        "relationships": ["Belongs to Invoice (N:1)", "Belongs to Product (N:1)"]
    },
    {
        "table_name": "payments",
        "description": "Customer payments (UPI, Cash, Bank Transfer, Cheque) with UTR settlement tracking",
        "columns": [
            "id (UUID, PK)", "payment_number (VARCHAR, UNIQUE, e.g. PAY-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "payment_date (DATE)", "amount (NUMERIC)",
            "payment_mode (ENUM: CASH, UPI, BANK_TRANSFER, CHEQUE)", "reference_number (VARCHAR, UTR)",
            "notes (TEXT)", "allocated_amount (NUMERIC)", "unallocated_amount (NUMERIC)", "created_at (TIMESTAMP)"
        ],
        "relationships": [
            "Belongs to Customer (N:1)", "Has many PaymentAllocations (1:N)",
            "Generates LedgerEntry (1:1)"
        ]
    },
    {
        "table_name": "payment_allocations",
        "description": "Reconciliation map distributing payment amounts against specific open invoices",
        "columns": [
            "id (UUID, PK)", "payment_id (UUID, FK -> payments.id)", "invoice_id (UUID, FK -> invoices.id)",
            "amount (NUMERIC)", "allocated_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to Payment (N:1)", "Belongs to Invoice (N:1)"]
    },
    {
        "table_name": "customer_ledger",
        "description": "Immutable double-entry customer accounting statement with real-time balance tracking",
        "columns": [
            "id (UUID, PK)", "customer_id (UUID, FK -> customers.id)", "entry_date (DATE)",
            "entry_type (ENUM: INVOICE, PAYMENT, CREDIT_NOTE, DEBIT_NOTE, OPENING_BALANCE)",
            "reference_id (VARCHAR)", "description (TEXT)", "debit (NUMERIC)", "credit (NUMERIC)",
            "running_balance (NUMERIC)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to Customer (N:1)"]
    },
    {
        "table_name": "document_sequences",
        "description": "Collision-free deterministic monthly sequential number generator",
        "columns": [
            "id (UUID, PK)", "doc_type (VARCHAR, e.g. INV, ORD, REC, ADJ, PAY, CUST)",
            "prefix (VARCHAR)", "year_month (VARCHAR, e.g. 202608)", "current_number (INT)", "updated_at (TIMESTAMP)"
        ],
        "relationships": []
    },
    {
        "table_name": "audit_logs",
        "description": "System-wide immutable change audit log capturing before/after states",
        "columns": [
            "id (UUID, PK)", "user_id (UUID, FK -> users.id)", "action (ENUM: CREATE, UPDATE, DELETE, CANCEL, STATUS_CHANGE)",
            "entity_name (VARCHAR)", "entity_id (VARCHAR)", "before_state (JSONB)", "after_state (JSONB)",
            "ip_address (VARCHAR)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to User (N:1)"]
    }
]

# --------------------------------------------------------------------------------------
# 4. BACKEND API ROUTER DIRECTORY
# --------------------------------------------------------------------------------------

API_ROUTER_DIRECTORY = {
    "/api/auth": [
        "POST /api/auth/login-json -> JSON credentials login returning JWT access token",
        "GET  /api/auth/me -> Return current authenticated user profile and roles",
        "GET  /api/auth/users -> Admin user management",
        "POST /api/auth/users -> Create new operator/viewer account"
    ],
    "/api/customers": [
        "GET  /api/customers -> List all restaurant customers with balances and search",
        "GET  /api/customers/{id} -> Get customer details and financial profile",
        "POST /api/customers -> Register new customer with auto-assigned CUST-XXXX",
        "PUT  /api/customers/{id} -> Update customer contact and credit terms",
        "GET  /api/customers/{id}/ledger -> Get chronological running-balance ledger timeline"
    ],
    "/api/catalogue": [
        "GET  /api/catalogue/categories -> List active product categories with counts",
        "POST /api/catalogue/categories -> Create new product category",
        "GET  /api/catalogue/products -> List master SKUs with category, brand, stock, and price filters",
        "GET  /api/catalogue/products/{id} -> Get single product SKU details",
        "POST /api/catalogue/products -> Create new master SKU with live GST preview",
        "PUT  /api/catalogue/products/{id} -> Update master SKU price, unit, or stock thresholds"
    ],
    "/api/inventory": [
        "GET  /api/inventory/overview -> Stock KPIs, on-hand counts, and reorder alerts",
        "POST /api/inventory/receive -> Record supplier stock intake (+REC-XXXX)",
        "POST /api/inventory/adjust -> Record breakage/damage adjustment (-ADJ-XXXX)",
        "GET  /api/inventory/movements -> Audit timeline of receipts, adjustments, and sales"
    ],
    "/api/orders": [
        "GET  /api/orders -> List all customer advance bookings and orders",
        "GET  /api/orders/{id} -> Get order details with line items",
        "POST /api/orders -> Create new booking (ORD-XXXX) with live stock reservation check",
        "PUT  /api/orders/{id} -> Update order status",
        "POST /api/orders/{id}/convert-to-invoice -> 1-Click convert order to tax invoice (INV-XXXX)"
    ],
    "/api/invoices": [
        "GET  /api/invoices -> List GST tax invoices with status and date filters",
        "GET  /api/invoices/{id} -> Get complete invoice details with items and payment allocations",
        "POST /api/invoices -> Create standalone tax invoice (INV-XXXX)",
        "PUT  /api/invoices/{id}/status -> Update invoice status (ISSUED, CANCELLED, OVERDUE)"
    ],
    "/api/payments": [
        "GET  /api/payments -> List payment settlements with customer and method filters",
        "GET  /api/payments/{id} -> Get payment settlement with allocation breakdown",
        "POST /api/payments -> Record payment (PAY-XXXX), allocate to open invoices, and credit ledger"
    ],
    "/api/reports": [
        "GET  /api/reports/dashboard -> Commercial dashboard KPIs (Revenue, Receivables, Overdue)",
        "GET  /api/reports/aging -> Overall receivables aging buckets (0-15, 16-30, 31-60, 60+ days)",
        "GET  /api/reports/aging/customers -> Per-customer aging breakdown and credit risk",
        "GET  /api/reports/product-sales -> SKU sales velocity, volume, and gross margin"
    ],
    "/api/ai": [
        "POST /api/ai/query -> Semantic business assistant answering questions via live analytical tools"
    ],
    "/api/audit": [
        "GET  /api/audit/logs -> Immutable system audit trail logs with before/after diffs"
    ]
}

# --------------------------------------------------------------------------------------
# 5. FRONTEND COMPONENT GRAPH
# --------------------------------------------------------------------------------------

FRONTEND_ARCHITECTURE = {
    "root_layout": "App.jsx (Sidebar Navigation, Header with Live Rayachoty Hotline, Modal Mounts)",
    "pages": {
        "DashboardPage": "KPI stat cards, Monthly Revenue, Total Receivables, Overdue, Recent Invoices, High-Velocity SKUs",
        "CustomersPage": "Directory, Search, Balance Badges, +New Customer Modal, CustomerProfileModal (Workspace with Ledger)",
        "CataloguePage": "Category Hero Bar (Fries, Nuggets, Momos, Burgers, Cheese, Sauces, Boxes, Mojitos, Spices), Grid/Table View, Live Stock Badges, Dual Rates (Base+GST), Partner Brands, WhatsApp Price Sheet, Flyer Modal, ProductModal",
        "InventoryPage": "Stock KPI Overview, Low Stock Alerts, ReceiveStockModal (+REC-XXXX), AdjustStockModal (-ADJ-XXXX), StockMovementsDrawer",
        "OrdersPage": "Order Directory, Status Badges, OrderBuilderModal (ORD-XXXX with Live Stock Check), 1-Click Invoice Conversion Trigger",
        "BillingPage": "Invoice Directory, Printable GST Tax Invoice PDF Viewer, Status Badges, Record Settlement Trigger",
        "PaymentsPage": "Payment & Settlement Log, PaymentModal (Auto-allocate to oldest open invoices), UTR verification",
        "ReportsPage": "Receivables Aging Buckets (0-15, 16-30, 31-60, 60+ days), Customer Credit Risk Table, Product Sales Velocity",
        "AuditPage": "System Audit Trail, Entity Change Logs, User Actions, Before/After JSON Diffs"
    },
    "interactive_modals": [
        "ProductModal.jsx -> Add/Edit SKU with live GST calculator, auto-SKU, and stock limits",
        "ReceiveStockModal.jsx -> Intake supplier shipments with batch, supplier hub, and purchase cost",
        "AdjustStockModal.jsx -> Record spoilage/transit damage with mandatory business reason",
        "OrderBuilderModal.jsx -> Build restaurant order with dynamic lines and stock warnings",
        "PaymentModal.jsx -> Settle customer balances against specific invoices with UTR reference",
        "CustomerProfileModal.jsx -> 360-degree customer workspace (Ledger Timeline, Invoices, Orders, Payments)",
        "OfficialFlyerModal.jsx -> High-resolution promotional brochure viewer with Print and Download options",
        "WhatsAppPriceListModal.jsx -> 1-Click formatted text generator for WhatsApp sharing",
        "AIAssistantDrawer.jsx -> Slide-over conversational AI assistant executing live backend tools"
    ]
}

# --------------------------------------------------------------------------------------
# 6. MERMAID DIAGRAM GENERATOR
# --------------------------------------------------------------------------------------

def generate_mermaid_diagram() -> str:
    return """```mermaid
graph TD
    %% User Layer
    User([Business Operator / Admin]) -->|Interacts with GUI| Frontend[React 18 + Vite Frontend]
    
    %% Frontend Modals & Pages
    subgraph Frontend Layer [Port: 3000]
        Frontend --> Dash[Dashboard Page]
        Frontend --> Cust[Customers Page]
        Frontend --> Cat[Master Catalogue Page]
        Frontend --> Inv[Inventory Page]
        Frontend --> Ord[Orders Page]
        Frontend --> Bill[Billing Page]
        Frontend --> Pay[Payments Page]
        Frontend --> Rep[Reports & Aging]
        Frontend --> AI_UI[AI Assistant Drawer]
        
        Cat --> ProdModal[ProductModal - Add/Edit SKU]
        Cat --> FlyerModal[OfficialFlyerModal - Brochure]
        Cat --> WAModal[WhatsAppPriceListModal]
        Inv --> RecModal[ReceiveStockModal]
        Inv --> AdjModal[AdjustStockModal]
        Ord --> OrdModal[OrderBuilderModal]
        Pay --> PayModal[PaymentModal]
        Cust --> CustModal[CustomerProfileModal]
    end

    %% API Layer
    Frontend -->|Axios REST / Bearer JWT| Backend[FastAPI Backend - Port: 8001]
    
    subgraph Backend Services Layer
        Backend --> AuthSvc[AuthService]
        Backend --> CustSvc[CustomerService]
        Backend --> CatSvc[CatalogueService]
        Backend --> InvSvc[InventoryService]
        Backend --> OrdSvc[OrderService]
        Backend --> BillSvc[BillingService]
        Backend --> PaySvc[PaymentService]
        Backend --> RepSvc[ReportingService]
        Backend --> SeqSvc[SequenceService - Collision-Free Sequences]
        Backend --> AuditSvc[AuditService - Immutable Logs]
        Backend --> AISvc[AIService - Semantic Knowledge Layer]
    end

    %% Database Layer
    subgraph PostgreSQL Database Layer [Supabase Pooler : 6543]
        AuthSvc --> DB_Users[(users)]
        CustSvc --> DB_Cust[(customers)]
        CatSvc --> DB_Prod[(categories & products)]
        InvSvc --> DB_Stock[(stock_movements)]
        OrdSvc --> DB_Ord[(orders & order_items)]
        BillSvc --> DB_Inv[(invoices & invoice_items)]
        PaySvc --> DB_Pay[(payments & allocations)]
        CustSvc --> DB_Ledger[(customer_ledger)]
        SeqSvc --> DB_Seq[(document_sequences)]
        AuditSvc --> DB_Audit[(audit_logs)]
    end

    %% Business Data Flows
    RecModal -.->|Intake +REC-XXXX| InvSvc
    AdjModal -.->|Damage -ADJ-XXXX| InvSvc
    OrdModal -.->|Create ORD-XXXX| OrdSvc
    OrdSvc -.->|1-Click Convert| BillSvc
    BillSvc -.->|Generates INV-XXXX & Deducts Stock| DB_Inv
    BillSvc -.->|Debits Ledger| DB_Ledger
    PayModal -.->|Record PAY-XXXX| PaySvc
    PaySvc -.->|Reconciles Invoices & Credits Ledger| DB_Ledger
    AISvc -.->|Analytical Queries| RepSvc
```"""

# --------------------------------------------------------------------------------------
# 7. CLI RUNNER & EXPORT FUNCTIONS
# --------------------------------------------------------------------------------------

def print_ascii_architecture():
    print("=" * 80)
    print("RAIS AGENCIES BUSINESS MANAGEMENT & BILLING PLATFORM -- ARCHITECTURE GRAPH")
    print("=" * 80)
    print(f"Project:     {SYSTEM_METADATA['project_name']}")
    print(f"Domain:      {SYSTEM_METADATA['industry']}")
    print(f"Location:    {SYSTEM_METADATA['location']}")
    print(f"Hotlines:    {', '.join(SYSTEM_METADATA['hotlines'])}")
    print(f"Target:      {SYSTEM_METADATA['target_users']}")
    print(f"Backend:     {SYSTEM_METADATA['tech_stack']['backend']}")
    print(f"Frontend:    {SYSTEM_METADATA['tech_stack']['frontend']}")
    print(f"Database:    {SYSTEM_METADATA['database']['engine']} @ {SYSTEM_METADATA['database']['host']}:{SYSTEM_METADATA['database']['port']}")
    print("-" * 80)
    print("\n[1] NON-TECHNICAL OPERATING PIPELINE:")
    for step in OPERATING_MODEL["workflow_pipeline"]:
        print(f"  Step {step['step']:2d} | {step['module']:<20} -> {step['action']}")
    
    print("\n[2] DATABASE ENTITIES & RELATIONAL SCHEMA:")
    for entity in DATABASE_ENTITIES:
        print(f"  * {entity['table_name']:<20} : {entity['description']}")
        print(f"    Columns: {', '.join(entity['columns'][:4])} ...")
        if entity['relationships']:
            print(f"    Relations: {', '.join(entity['relationships'])}")
        print()

    print("[3] API ROUTE DIRECTORY:")
    for prefix, routes in API_ROUTER_DIRECTORY.items():
        print(f"  [{prefix}]")
        for r in routes:
            print(f"    {r}")
        print()

    print("[4] FRONTEND COMPONENT GRAPH:")
    print(f"  Layout: {FRONTEND_ARCHITECTURE['root_layout']}")
    print("  Pages:")
    for page, desc in FRONTEND_ARCHITECTURE["pages"].items():
        print(f"    - {page:<20} : {desc}")
    print("  Modals & Drawers:")
    for modal in FRONTEND_ARCHITECTURE["interactive_modals"]:
        print(f"    * {modal}")
    print("=" * 80)

def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["--mermaid", "-m", "mermaid"]:
            print(generate_mermaid_diagram())
            return
        elif arg in ["--json", "-j", "json"]:
            full_graph = {
                "system_metadata": SYSTEM_METADATA,
                "operating_model": OPERATING_MODEL,
                "database_entities": DATABASE_ENTITIES,
                "api_router_directory": API_ROUTER_DIRECTORY,
                "frontend_architecture": FRONTEND_ARCHITECTURE
            }
            print(json.dumps(full_graph, indent=2))
            return
    
    print_ascii_architecture()
    print("\n[TIP] To generate Mermaid diagram for documentation/AI context, run:")
    print("      python rais_project_architecture.py --mermaid")
    print("[TIP] To generate raw JSON architecture graph, run:")
    print("      python rais_project_architecture.py --json")

if __name__ == "__main__":
    main()
