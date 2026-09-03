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
    "version": "2.0.0 (Decision-Support & Operational Excellence Layer)",
    "industry": "B2B Frozen Foods & Beverage Wholesale Distribution",
    "location": "Reddies Colony, Rayachoty, Annamayya District, Andhra Pradesh - 516269",
    "hotlines": ["9347453135", "9573261696"],
    "target_users": "3 Non-Technical Business Operators (Admin, Operator, Viewer)",
    "git_repository": "https://github.com/rais-agencies/Rais-Agencies.git",
    "database": {
        "engine": "PostgreSQL 15+ (Configured via DATABASE_URL environment variable)",
        "host": "configured-via-env",
        "port": 5432,
        "database": "postgres",
        "user": "postgres"
    },
    "tech_stack": {
        "backend": "Python 3.12 + FastAPI + SQLAlchemy ORM + Pydantic v2 + Uvicorn (Port 8001)",
        "frontend": "React 18 + Vite + Tailwind CSS + Lucide React (Port 3000)",
        "testing": "Playwright Python E2E Automated QA Suite",
        "ai_engine": "Semantic Business Knowledge Layer (Deterministic SQL Tools + NLP Router)",
        "hardware_integration": "ESC/POS 58mm/80mm Bluetooth & Universal Browser Thermal Receipt Printing + Dynamic UPI QR Codes"
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
        {"step": 2, "module": "Executive Decision Canvas", "action": "Commercial KPIs, Global Slicers, Progressive Disclosure Drilldowns", "route": "/api/reports/dashboard"},
        {"step": 3, "module": "Sales Forecasting & Targets", "action": "Rolling 90-day velocity, month-end projection, inline target editor", "route": "/api/analytics/forecast"},
        {"step": 4, "module": "Product Performance Matrix", "action": "4-Quadrant matrix (Winner/Steady/Declining/Zero-Mover) & Cold Room Dead Stock alert", "route": "/api/analytics/product-matrix"},
        {"step": 5, "module": "Customer Health & Early Warning", "action": "DSO, payment punctuality, 1-click WhatsApp reminders", "route": "/api/analytics/customer-health"},
        {"step": 6, "module": "Master Catalogue", "action": "Add/Edit SKUs, Dual Pricing (Base+GST), WhatsApp Price Sheet", "entity": "Product (RAIS-XXX-XX)"},
        {"step": 7, "module": "Inventory Engine", "action": "Stock Intake (REC-XXXX) & Breakage Adjustments (ADJ-XXXX)", "entity": "StockMovement"},
        {"step": 8, "module": "Orders & Bookings", "action": "Customer Booking (ORD-XXXX) with live warehouse stock reservation", "entity": "Order / OrderItem"},
        {"step": 9, "module": "Tax Billing & Thermal Receipts", "action": "1-Click Convert Order to GST Tax Invoice (INV-XXXX) & 58mm/80mm ESC/POS Thermal Print with UPI QR", "entity": "Invoice / InvoiceItem"},
        {"step": 10, "module": "Payment Settlements", "action": "Record UPI/Cash Settlement (PAY-XXXX) & Reconcile Invoices", "entity": "Payment / Allocation"},
        {"step": 11, "module": "Customer Ledger", "action": "Real-time running debit/credit statement timeline", "entity": "LedgerEntry"},
        {"step": 12, "module": "Reports & Aging", "action": "Receivables Aging Buckets (0-15, 16-30, 31-60, 60+ days)", "entity": "AgingReport"},
        {"step": 13, "module": "Semantic AI Assistant", "action": "Conversational tool execution for instant balance/pricing lookups", "endpoint": "/api/ai/query"}
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
            "id (UUID, PK)", "customer_code (VARCHAR, UNIQUE, e.g. CUST-0001)", "business_name (VARCHAR)", "contact_person (VARCHAR)",
            "phone (VARCHAR)", "email (VARCHAR)", "address_line1 (TEXT)", "city (VARCHAR)", "gstin (VARCHAR)",
            "credit_limit (NUMERIC)", "status (VARCHAR)", "created_at (TIMESTAMP)"
        ],
        "relationships": [
            "Has many Orders (1:N)", "Has many Invoices (1:N)",
            "Has many Payments (1:N)", "Has many LedgerEntries (1:N)"
        ]
    },
    {
        "table_name": "monthly_targets",
        "description": "Target revenue goals per month set by administration",
        "columns": [
            "id (UUID, PK)", "year_month (VARCHAR, UNIQUE, e.g. 2026-08)", "target_revenue (NUMERIC)", "set_by (UUID, FK -> users.id)", "created_at (TIMESTAMP)"
        ],
        "relationships": []
    },
    {
        "table_name": "product_performance_snapshots",
        "description": "Snapshots of SKU classifications (Winner, Steady, Declining, Zero-Mover) and dead stock values",
        "columns": [
            "id (UUID, PK)", "product_id (UUID, FK -> products.id)", "period (VARCHAR)", "revenue (NUMERIC)",
            "units_sold (NUMERIC)", "stock_holding_value (NUMERIC)", "trend_pct (NUMERIC)", "classification (VARCHAR)"
        ],
        "relationships": ["Belongs to Product (N:1)"]
    },
    {
        "table_name": "customer_health_snapshots",
        "description": "Health traffic light scores, DSO, payment delay history, and risk reasons",
        "columns": [
            "id (UUID, PK)", "customer_id (UUID, FK -> customers.id)", "period (VARCHAR)", "dso_days (NUMERIC)",
            "avg_days_late (NUMERIC)", "health_status (VARCHAR: HEALTHY, WATCH, AT_RISK)", "risk_reason (TEXT)"
        ],
        "relationships": ["Belongs to Customer (N:1)"]
    },
    {
        "table_name": "printer_profiles",
        "description": "Thermal printer hardware profiles (58mm/80mm ESC/POS Bluetooth and USB)",
        "columns": [
            "id (UUID, PK)", "user_id (UUID, FK -> users.id)", "name (VARCHAR)", "connection_type (VARCHAR)",
            "paper_width (INT)", "device_name (VARCHAR)", "is_default (BOOLEAN)"
        ],
        "relationships": []
    },
    {
        "table_name": "stock_movements",
        "description": "Complete audit trail for stock receipts, adjustments, and order dispatches",
        "columns": [
            "id (UUID, PK)", "product_id (UUID, FK -> products.id)", "movement_type (ENUM: IN_PURCHASE, OUT_SALE, ADJUSTMENT, RETURN)",
            "reference_number (VARCHAR, e.g. REC-XXXX, ADJ-XXXX, INV-XXXX)", "quantity (NUMERIC)", "created_at (TIMESTAMP)"
        ],
        "relationships": ["Belongs to Product (N:1)", "Belongs to User (N:1)"]
    },
    {
        "table_name": "orders",
        "description": "Advance restaurant bookings and reservations prior to tax invoice generation",
        "columns": [
            "id (UUID, PK)", "order_number (VARCHAR, UNIQUE, e.g. ORD-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "order_date (DATE)", "total_amount (NUMERIC)", "status (VARCHAR)"
        ],
        "relationships": ["Belongs to Customer (N:1)", "Has many OrderItems (1:N)", "Linked to Invoice (1:1)"]
    },
    {
        "table_name": "invoices",
        "description": "Official GST-Compliant B2B Tax Invoices with deterministic sequence numbers",
        "columns": [
            "id (UUID, PK)", "invoice_number (VARCHAR, UNIQUE, e.g. INV-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "total_amount (NUMERIC)", "tax_amount (NUMERIC)",
            "paid_amount (NUMERIC)", "outstanding_amount (NUMERIC)", "status (VARCHAR)"
        ],
        "relationships": [
            "Belongs to Customer (N:1)", "Linked to Order (1:1)",
            "Has many InvoiceItems (1:N)", "Has many PaymentAllocations (1:N)"
        ]
    },
    {
        "table_name": "payments",
        "description": "Customer payments (UPI, Cash, Bank Transfer, Cheque) with UTR settlement tracking",
        "columns": [
            "id (UUID, PK)", "payment_number (VARCHAR, UNIQUE, e.g. PAY-202608-00001)",
            "customer_id (UUID, FK -> customers.id)", "amount (NUMERIC)", "payment_mode (VARCHAR)"
        ],
        "relationships": [
            "Belongs to Customer (N:1)", "Has many PaymentAllocations (1:N)",
            "Generates LedgerEntry (1:1)"
        ]
    },
    {
        "table_name": "customer_ledger",
        "description": "Immutable double-entry customer accounting statement with real-time balance tracking",
        "columns": [
            "id (UUID, PK)", "customer_id (UUID, FK -> customers.id)", "entry_date (DATE)",
            "debit (NUMERIC)", "credit (NUMERIC)", "running_balance (NUMERIC)"
        ],
        "relationships": ["Belongs to Customer (N:1)"]
    },
    {
        "table_name": "document_sequences",
        "description": "Collision-free deterministic monthly sequential number generator",
        "columns": ["id (UUID, PK)", "doc_type (VARCHAR)", "prefix (VARCHAR)", "year_month (VARCHAR)", "current_number (INT)"],
        "relationships": []
    },
    {
        "table_name": "audit_logs",
        "description": "System-wide immutable change audit log capturing before/after states",
        "columns": ["id (UUID, PK)", "user_id (UUID)", "action (VARCHAR)", "entity_name (VARCHAR)", "created_at (TIMESTAMP)"],
        "relationships": []
    }
]

# --------------------------------------------------------------------------------------
# 4. BACKEND API ROUTER DIRECTORY
# --------------------------------------------------------------------------------------

API_ROUTER_DIRECTORY = {
    "/api/analytics": [
        "GET  /api/analytics/product-matrix -> 4-Quadrant product matrix & freezer dead stock value",
        "GET  /api/analytics/customer-health -> Traffic-light health scores & proactive at-risk alerts",
        "GET  /api/analytics/forecast -> Sales forecast vs actual, month-end projection & executive story",
        "POST /api/analytics/targets -> Set or update monthly revenue target",
        "GET  /api/analytics/receipt/{id} -> Structured 58mm/80mm ESC/POS thermal receipt & UPI QR payload",
        "GET  /api/analytics/drilldown -> Multi-level progressive disclosure metric drilldown"
    ],
    "/api/auth": [
        "POST /api/auth/login-json -> JSON credentials login returning JWT access token",
        "GET  /api/auth/me -> Return current authenticated user profile and roles"
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
        "POST /api/orders -> Create new booking (ORD-XXXX) with live stock reservation check",
        "POST /api/orders/{id}/convert-to-invoice -> 1-Click convert order to tax invoice (INV-XXXX)"
    ],
    "/api/invoices": [
        "GET  /api/invoices -> List GST tax invoices with status and date filters",
        "GET  /api/invoices/{id} -> Get complete invoice details with items and payment allocations",
        "POST /api/invoices -> Create standalone tax invoice (INV-XXXX)"
    ],
    "/api/payments": [
        "GET  /api/payments -> List payment settlements with customer and method filters",
        "POST /api/payments -> Record payment (PAY-XXXX), allocate to open invoices, and credit ledger"
    ],
    "/api/reports": [
        "GET  /api/reports/dashboard -> Commercial dashboard KPIs (Revenue, Receivables, Overdue)",
        "GET  /api/reports/aging -> Overall receivables aging buckets (0-15, 16-30, 31-60, 60+ days)",
        "GET  /api/reports/aging/customers -> Per-customer aging breakdown and credit risk"
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
    "root_layout": "App.jsx (Sidebar Navigation on Desktop, MobileBottomNav on Phone, Header with Live Rayachoty Hotline, Modal Mounts)",
    "pages": {
        "DashboardPage": "Executive Command Canvas: Global Slicers, Forecast Story Widget, 4-Quadrant Product Matrix with Cold Room Dead Stock Alert, Customer Health Traffic Lights, Clickable Drilldown KPI Tiles, Recent Invoices with 1-Click Thermal Print",
        "CustomersPage": "Directory, Search, Balance Badges, +New Customer Modal, CustomerProfileModal (Workspace with Ledger)",
        "CataloguePage": "Category Hero Bar (Fries, Nuggets, Momos, Burgers, Cheese, Sauces, Boxes, Mojitos, Spices), Grid/Table View, Live Stock Badges, Dual Rates (Base+GST), Partner Brands, WhatsApp Price Sheet, Flyer Modal, ProductModal",
        "InventoryPage": "Stock KPI Overview, Low Stock Alerts, ReceiveStockModal (+REC-XXXX), AdjustStockModal (-ADJ-XXXX), StockMovementsDrawer",
        "OrdersPage": "Order Directory, Status Badges, OrderBuilderModal (ORD-XXXX with Live Stock Check), 1-Click Invoice Conversion Trigger",
        "BillingPage": "Invoice Directory, Printable GST Tax Invoice PDF Viewer, Status Badges, Record Settlement Trigger",
        "PaymentsPage": "Payment & Settlement Log, PaymentModal (Auto-allocate to oldest open invoices), UTR verification",
        "ReportsPage": "Receivables Aging Buckets (0-15, 16-30, 31-60, 60+ days), Customer Credit Risk Table, Product Sales Velocity",
        "AuditPage": "System Audit Trail, Entity Change Logs, User Actions, Before/After JSON Diffs"
    },
    "interactive_modals_and_widgets": [
        "GlobalFilterBar.jsx -> Sticky slicers toolbar (Date range, Customer, Category, Baseline comparison)",
        "ForecastStoryWidget.jsx -> Plain-language story, inline target editor, and predictive run-rate numbers",
        "ProductPerformanceMatrix.jsx -> 4-Quadrant matrix with cold room dead stock capital risk banner",
        "CustomerHealthCard.jsx -> Traffic light health scoring and 1-click WhatsApp payment reminders",
        "DrillableMetricModal.jsx -> Power BI progressive disclosure panel with breadcrumb navigation",
        "ThermalReceiptModal.jsx -> ESC/POS 58mm/80mm thermal receipt with dynamic UPI QR code generator",
        "ResponsiveTable.jsx -> Reusable wrapper rendering desktop table and mobile touch cards",
        "MobileBottomNav.jsx -> 1-Handed phone bottom navigation bar",
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
    User([Business Operator / Owner / Admin]) -->|Interacts on Desktop or Phone| Frontend[React 18 + Vite Frontend :3000]
    
    %% Frontend Modals & Pages
    subgraph Frontend Architecture Layer [Port: 3000]
        Frontend --> Slicers[GlobalFilterBar - Sticky Slicers]
        Frontend --> Dash[Dashboard Page - Decision Canvas]
        Frontend --> MobileNav[MobileBottomNav - 1-Handed Mobile Nav]
        Frontend --> Cust[Customers Page]
        Frontend --> Cat[Master Catalogue Page]
        Frontend --> Inv[Inventory Page]
        Frontend --> Ord[Orders Page]
        Frontend --> Bill[Billing Page]
        Frontend --> Pay[Payments Page]
        Frontend --> Rep[Reports & Aging]
        Frontend --> AI_UI[AI Assistant Drawer]
        
        Dash --> ForecastWidget[ForecastStoryWidget - Pacing & Goal]
        Dash --> ProdMatrix[ProductPerformanceMatrix - Winner/Dead Stock]
        Dash --> CustHealth[CustomerHealthCard - DSO & Traffic Lights]
        Dash --> DrillModal[DrillableMetricModal - Breadcrumbs Deep-Dive]
        Dash --> ThermModal[ThermalReceiptModal - 58/80mm & UPI QR]
        
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
        Backend --> ForecastSvc[ForecastingService - 90d Velocity & WMA]
        Backend --> ProdPerfSvc[ProductPerformanceService - Quadrant Intelligence]
        Backend --> CustHealthSvc[CustomerHealthService - DSO & Punctuality]
        Backend --> ThermPrintSvc[ThermalPrintService - ESC/POS & UPI QR]
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
        ForecastSvc --> DB_Targets[(monthly_targets)]
        ProdPerfSvc --> DB_ProdSnap[(product_performance_snapshots)]
        CustHealthSvc --> DB_CustSnap[(customer_health_snapshots)]
        ThermPrintSvc --> DB_Printers[(printer_profiles)]
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
```"""

# --------------------------------------------------------------------------------------
# 7. CLI RUNNER & EXPORT FUNCTIONS
# --------------------------------------------------------------------------------------

def print_ascii_architecture():
    print("=" * 80)
    print("RAIS AGENCIES BUSINESS MANAGEMENT & BILLING PLATFORM -- v2 ARCHITECTURE GRAPH")
    print("=" * 80)
    print(f"Project:     {SYSTEM_METADATA['project_name']} (v{SYSTEM_METADATA['version']})")
    print(f"Domain:      {SYSTEM_METADATA['industry']}")
    print(f"Location:    {SYSTEM_METADATA['location']}")
    print(f"Hotlines:    {', '.join(SYSTEM_METADATA['hotlines'])}")
    print(f"Target:      {SYSTEM_METADATA['target_users']}")
    print(f"Backend:     {SYSTEM_METADATA['tech_stack']['backend']}")
    print(f"Frontend:    {SYSTEM_METADATA['tech_stack']['frontend']}")
    print(f"Hardware:    {SYSTEM_METADATA['tech_stack']['hardware_integration']}")
    print(f"Database:    {SYSTEM_METADATA['database']['engine']} @ {SYSTEM_METADATA['database']['host']}:{SYSTEM_METADATA['database']['port']}")
    print("-" * 80)
    print("\n[1] NON-TECHNICAL OPERATING PIPELINE:")
    for step in OPERATING_MODEL["workflow_pipeline"]:
        print(f"  Step {step['step']:2d} | {step['module']:<24} -> {step['action']}")
    
    print("\n[2] DATABASE ENTITIES & RELATIONAL SCHEMA:")
    for entity in DATABASE_ENTITIES:
        print(f"  * {entity['table_name']:<30} : {entity['description']}")
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
    print("\n  Modals, Slicers & Decision Widgets:")
    for widget in FRONTEND_ARCHITECTURE["interactive_modals_and_widgets"]:
        print(f"    * {widget}")
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
