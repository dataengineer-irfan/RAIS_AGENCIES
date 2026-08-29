from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensures all models are registered in Base
from app.api import auth, customers, catalogue, quotations, orders, invoices, payments, reports, audit, ai
from app.core.exceptions import RaisAppException

# Create database tables
Base.metadata.create_all(bind=engine)

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

# Exception handlers
@app.exception_handler(RaisAppException)
async def rais_exception_handler(request: Request, exc: RaisAppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(catalogue.router, prefix="/api")
app.include_router(quotations.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

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
def health_check():
    return {"status": "healthy"}
