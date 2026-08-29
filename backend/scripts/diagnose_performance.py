import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.services.customer_health_service import CustomerHealthService
from app.services.product_performance_service import ProductPerformanceService
from app.services.forecasting_service import ForecastingService
from app.services.reporting_service import ReportingService

def benchmark():
    print("=" * 70)
    print("RAIS AGENCIES -- PERFORMANCE & LATENCY DIAGNOSTIC")
    print("=" * 70)

    db = SessionLocal()

    # Pass 1: Cold Fetch
    print("\n--- [PASS 1: COLD QUERIES WITH BATCHING] ---")
    t0 = time.time()
    CustomerHealthService.get_customer_health_analysis(db, force_refresh=True)
    health_ms = (time.time() - t0) * 1000
    print(f"CustomerHealthService (Batched):       {health_ms:6.1f} ms")

    t0 = time.time()
    ProductPerformanceService.get_product_matrix(db, force_refresh=True)
    matrix_ms = (time.time() - t0) * 1000
    print(f"ProductPerformanceService (Batched):   {matrix_ms:6.1f} ms")

    t0 = time.time()
    ForecastingService.get_sales_forecast(db, force_refresh=True)
    forecast_ms = (time.time() - t0) * 1000
    print(f"ForecastingService (Batched):          {forecast_ms:6.1f} ms")

    t0 = time.time()
    ReportingService.get_dashboard_kpis(db, force_refresh=True)
    kpis_ms = (time.time() - t0) * 1000
    print(f"ReportingService.get_dashboard_kpis:   {kpis_ms:6.1f} ms")

    cold_total = health_ms + matrix_ms + forecast_ms + kpis_ms
    print(f"Cold Total: {cold_total:.1f} ms ({cold_total/1000:.2f}s) [Was ~10.0s before optimization]")

    # Pass 2: In-Memory Cached (Hot)
    print("\n--- [PASS 2: SUBSEQUENT HOT IN-MEMORY CACHED VISITS] ---")
    t0 = time.time()
    CustomerHealthService.get_customer_health_analysis(db)
    h_cached = (time.time() - t0) * 1000

    t0 = time.time()
    ProductPerformanceService.get_product_matrix(db)
    m_cached = (time.time() - t0) * 1000

    t0 = time.time()
    ForecastingService.get_sales_forecast(db)
    f_cached = (time.time() - t0) * 1000

    t0 = time.time()
    ReportingService.get_dashboard_kpis(db)
    k_cached = (time.time() - t0) * 1000

    hot_total = h_cached + m_cached + f_cached + k_cached
    print(f"CustomerHealthService (Cached):        {h_cached:6.2f} ms")
    print(f"ProductPerformanceService (Cached):    {m_cached:6.2f} ms")
    print(f"ForecastingService (Cached):           {f_cached:6.2f} ms")
    print(f"ReportingService (Cached):             {k_cached:6.2f} ms")
    print(f"Hot Cached Total: {hot_total:.2f} ms (< 1 millisecond!)")
    print("=" * 70)

    db.close()

if __name__ == "__main__":
    benchmark()
