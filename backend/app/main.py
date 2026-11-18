from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensures all models are registered in Base
from app.api import auth, customers, catalogue, quotations, orders, invoices, payments, inventory, reports, audit, ai, analytics, backup, executive
from app.core.exceptions import RaisAppException

# Create database tables
Base.metadata.create_all(bind=engine)

# Safe schema migrations on startup
from sqlalchemy import text as _text
try:
    with engine.connect() as _conn:
        _conn.execute(_text("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12,2) NULL"))
        _conn.execute(_text("ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) NULL"))
        _conn.execute(_text("ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS supplier_invoice_number VARCHAR(100) NULL"))
        _conn.commit()
except Exception:
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-Grade Business Management & Billing Platform for RAIS Agencies",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers with guaranteed CORS headers
def _get_cors_headers(request: Request):
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    else:
        headers["Access-Control-Allow-Origin"] = "*"
    return headers

@app.exception_handler(RaisAppException)
async def rais_exception_handler(request: Request, exc: RaisAppException):
    content = exc.detail if isinstance(exc.detail, (dict, list, str, int, float, bool)) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(content),
        headers=_get_cors_headers(request)
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.exception(f"Unhandled Server Error: {exc}")
    detail_msg = str(exc) if settings.ENVIRONMENT != "production" else "Internal server error occurred."
    return JSONResponse(
        status_code=500,
        content=jsonable_encoder({"detail": detail_msg, "message": str(exc)}),
        headers=_get_cors_headers(request)
    )

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(catalogue.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(quotations.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(backup.router, prefix="/api")
app.include_router(executive.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "company": settings.COMPANY_NAME,
        "location": settings.COMPANY_ADDRESS,
        "docs": "/api/docs"
    }

@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "rais-backend",
        "uptime": "active",
        "environment": settings.ENVIRONMENT
    }
