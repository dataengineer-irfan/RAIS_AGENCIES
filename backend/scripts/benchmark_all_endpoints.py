import time
import requests

BASE_URL = "http://localhost:8001/api"

def get_auth_token():
    try:
        res = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "RaisAdmin@2026"})
        if res.status_code == 200:
            return res.json()["access_token"]
    except Exception as e:
        print("Login failed:", e)
    return None

def benchmark():
    token = get_auth_token()
    if not token:
        print("Could not obtain auth token.")
        return

    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        ("GET", "/reports/dashboard"),
        ("GET", "/reports/aging"),
        ("GET", "/reports/aging/customers"),
        ("GET", "/reports/product-sales"),
        ("GET", "/analytics/forecast"),
        ("GET", "/analytics/customer-health"),
        ("GET", "/analytics/product-matrix"),
        ("GET", "/customers?limit=100"),
        ("GET", "/catalogue/categories"),
        ("GET", "/catalogue/products?limit=500"),
        ("GET", "/inventory/overview"),
        ("GET", "/orders"),
        ("GET", "/invoices"),
        ("GET", "/payments"),
        ("GET", "/audit/logs"),
    ]

    print("=" * 70)
    print(f"{'Endpoint':<35} | {'Cold (ms)':<12} | {'Warm 1 (ms)':<12} | {'Warm 2 (ms)':<12}")
    print("=" * 70)

    for method, path in endpoints:
        url = f"{BASE_URL}{path}"
        
        # Cold request
        t0 = time.perf_counter()
        r1 = requests.request(method, url, headers=headers)
        t1 = time.perf_counter()
        cold_ms = (t1 - t0) * 1000

        # Warm request 1
        t0 = time.perf_counter()
        r2 = requests.request(method, url, headers=headers)
        t1 = time.perf_counter()
        warm1_ms = (t1 - t0) * 1000

        # Warm request 2
        t0 = time.perf_counter()
        r3 = requests.request(method, url, headers=headers)
        t1 = time.perf_counter()
        warm2_ms = (t1 - t0) * 1000

        status = f"[{r1.status_code}]" if r1.status_code != 200 else ""
        print(f"{path:<35} | {cold_ms:8.2f} ms  | {warm1_ms:8.2f} ms  | {warm2_ms:8.2f} ms  {status}")

if __name__ == "__main__":
    benchmark()
