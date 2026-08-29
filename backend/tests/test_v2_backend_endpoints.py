import sys
import requests

# Enable UTF-8 print
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://localhost:8001/api"

def test_v2_api():
    print("[TEST] Testing v2 Backend Intelligence Endpoints...")
    
    # 1. Login
    res = requests.post(f"{BASE_URL}/auth/login-json", json={"username": "admin", "password": "RaisAdmin@2026"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  [OK] Login successful, token acquired.")

    # 2. Product Matrix
    res = requests.get(f"{BASE_URL}/analytics/product-matrix", headers=headers)
    assert res.status_code == 200, f"Product matrix failed: {res.text}"
    matrix = res.json()
    print(f"  [OK] Product Matrix: {matrix['total_skus']} SKUs, Winners: {matrix['winners_count']}, Zero-Movers: {matrix['zero_movers_count']}, Dead Stock Value: Rs. {matrix['total_dead_stock_value']:,.2f}")

    # 3. Customer Health
    res = requests.get(f"{BASE_URL}/analytics/customer-health", headers=headers)
    assert res.status_code == 200, f"Customer health failed: {res.text}"
    health = res.json()
    print(f"  [OK] Customer Health: Healthy: {health['healthy_count']}, Watch: {health['watch_count']}, At Risk: {health['at_risk_count']}")

    # 4. Sales Forecast vs Actual
    res = requests.get(f"{BASE_URL}/analytics/forecast", headers=headers)
    assert res.status_code == 200, f"Forecast failed: {res.text}"
    forecast = res.json()
    print(f"  [OK] Forecast: Projected Month-End Rs. {forecast['projected_month_end']:,.2f} vs Target Rs. {forecast['target_revenue']:,.2f}")

    # 5. Set Monthly Target
    res = requests.post(f"{BASE_URL}/analytics/targets", json={"year_month": "2026-08", "target_amount": 50000.0}, headers=headers)
    assert res.status_code == 200, f"Target update failed: {res.text}"
    print(f"  [OK] Monthly Target updated: {res.json()['message']}")

    # 6. Thermal Receipt for an invoice
    invoices_res = requests.get(f"{BASE_URL}/invoices", headers=headers)
    if invoices_res.json():
        inv_id = invoices_res.json()[0]["id"]
        res = requests.get(f"{BASE_URL}/analytics/receipt/{inv_id}?paper_width=58", headers=headers)
        assert res.status_code == 200, f"Thermal receipt failed: {res.text}"
        receipt = res.json()
        print(f"  [OK] Thermal Receipt: Generated for {receipt['invoice_meta']['invoice_number']}, UPI QR: {receipt['upi']['upi_qr_string'][:40]}...")

    # 7. Metric Drilldown
    res = requests.get(f"{BASE_URL}/analytics/drilldown?metric=revenue&level=category", headers=headers)
    assert res.status_code == 200, f"Drilldown failed: {res.text}"
    drilldown = res.json()
    print(f"  [OK] Multi-Level Drilldown: {len(drilldown['items'])} category breakdown items returned.")

    print("[TEST] ALL v2 BACKEND INTELLIGENCE ENDPOINTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_v2_api()
