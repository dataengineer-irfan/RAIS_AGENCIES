import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020"

MOCK_USER = {
    "id": "user-001",
    "username": "admin",
    "role": "ADMIN",
    "full_name": "Antigravity Admin"
}

MOCK_PRODUCTS_MATRIX = {
    "total_skus": 8,
    "winners_count": 8,
    "steady_count": 0,
    "declining_count": 0,
    "zero_movers_count": 0,
    "total_dead_stock_value": 0,
    "out_of_stock_count": 0,
    "items": [
        {
            "product_id": "p1",
            "name": "DELMONTE KETCHUP (8 GRAM PKT)",
            "sku": "RAIS-SAU-02",
            "brand": "Del Monte",
            "category_name": "Ketchup & Sauces",
            "classification": "WINNER",
            "units_sold_30d": 78,
            "packaging_unit": "1 PACKET",
            "revenue_30d": 5794.90,
            "profit_30d": 22.90,
            "margin_pct": 0.4,
            "trend_pct": 72.9,
            "stock_holding_units": 34,
            "stock_holding_value": 2550
        },
        {
            "product_id": "p2",
            "name": "MILKY MIST MOZEROLLA DICED CHEESE 1KG",
            "sku": "RAIS-CHS-02",
            "brand": "Milky Mist",
            "category_name": "Cheese & Slices",
            "classification": "WINNER",
            "units_sold_30d": 32,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 14467.00,
            "profit_30d": 131.00,
            "margin_pct": 0.9,
            "trend_pct": -5.8,
            "stock_holding_units": 0,
            "stock_holding_value": 0
        },
        {
            "product_id": "p3",
            "name": "DELMONT TANDOORI MAYO",
            "sku": "RAIS-SAU-04",
            "brand": "Del Monte",
            "category_name": "Ketchup & Sauces",
            "classification": "WINNER",
            "units_sold_30d": 24,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 7144.00,
            "profit_30d": 424.00,
            "margin_pct": 5.9,
            "trend_pct": 95.1,
            "stock_holding_units": 10,
            "stock_holding_value": 3000
        },
        {
            "product_id": "p4",
            "name": "SIGNATURE TORTILLAH 10 INCHES",
            "sku": "RAIS-CHK-01",
            "brand": "Signature",
            "category_name": "Veg Items",
            "classification": "WINNER",
            "units_sold_30d": 52,
            "packaging_unit": "1 PACKET",
            "revenue_30d": 5041.00,
            "profit_30d": 465.00,
            "margin_pct": 9.2,
            "trend_pct": 358.3,
            "stock_holding_units": 19,
            "stock_holding_value": 1900
        },
        {
            "product_id": "p5",
            "name": "MILKY MIST MOZEROLLA DICED CHEESE 2KG",
            "sku": "RAIS-CHS-01",
            "brand": "Milky Mist",
            "category_name": "Cheese & Slices",
            "classification": "WINNER",
            "units_sold_30d": 51,
            "packaging_unit": "2 KG PACKET",
            "revenue_30d": 46137.00,
            "profit_30d": 492.00,
            "margin_pct": 1.1,
            "trend_pct": 364.9,
            "stock_holding_units": 2,
            "stock_holding_value": 1820
        },
        {
            "product_id": "p6",
            "name": "BURGER BUN",
            "sku": "RAIS-VEG-BURG",
            "brand": "RAIS Master",
            "category_name": "Veg Items",
            "classification": "WINNER",
            "units_sold_30d": 581,
            "packaging_unit": "1",
            "revenue_30d": 5821.50,
            "profit_30d": 650.60,
            "margin_pct": 11.2,
            "trend_pct": 98.7,
            "stock_holding_units": 469,
            "stock_holding_value": 4690
        },
        {
            "product_id": "p7",
            "name": "CHICKEN BOX 4\"x5\"x8\"",
            "sku": "RAIS-BOX-02",
            "brand": "Packaging Solutions",
            "category_name": "Pizza Boxes & Burger Boxes",
            "classification": "WINNER",
            "units_sold_30d": 5,
            "packaging_unit": "100 NOS",
            "revenue_30d": 2660.00,
            "profit_30d": 760.00,
            "margin_pct": 28.6,
            "trend_pct": 100.0,
            "stock_holding_units": 7,
            "stock_holding_value": 3780
        },
        {
            "product_id": "p8",
            "name": "DELMONTE CREAMY CHEESE SAUCE",
            "sku": "RAIS-SAU-05",
            "brand": "Del Monte",
            "category_name": "Ketchup & Sauces",
            "classification": "WINNER",
            "units_sold_30d": 22,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 4180.00,
            "profit_30d": 770.00,
            "margin_pct": 18.4,
            "trend_pct": 176.8,
            "stock_holding_units": 21,
            "stock_holding_value": 3990
        }
    ]
}

def verify_sorting():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop 1440x900
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        def handle_route(route):
            url = route.request.url
            if "auth/login" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "access_token": "mock-token-xyz",
                    "token_type": "bearer",
                    "user": MOCK_USER
                }))
            elif "auth/me" in url or "users/me" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_USER))
            elif "analytics/product-matrix" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_PRODUCTS_MATRIX))
            elif "categories" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
            elif "customers" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
            elif "kpi" in url or "summary" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"open_invoices_count": 0, "total_revenue": 100000}))
            elif "dashboard" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"total_revenue": 100000}))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([]))

        page.route("**/api/**", handle_route)
        page.goto("http://localhost:5173", timeout=30000, wait_until="networkidle")

        page.evaluate("""() => {
            localStorage.setItem('rais_token', 'mock-token-xyz');
            localStorage.setItem('rais_user', JSON.stringify({
                id: 'user-001',
                username: 'admin',
                role: 'ADMIN',
                full_name: 'Antigravity Admin'
            }));
        }""")
        page.reload(wait_until="networkidle")
        time.sleep(1)

        # Switch to Product Intelligence tab
        print("Clicking Product Intelligence tab...", flush=True)
        tab = page.locator("button:has-text('Product Intelligence')").first
        tab.click()
        time.sleep(1)

        # Select 'Lowest Margin %' from the Quick Sort Dropdown
        print("Sorting by Lowest Margin %...", flush=True)
        sort_select = page.locator("select[title='Sort products']").first
        sort_select.select_option("margin_pct-asc")
        time.sleep(0.5)

        # Screenshot 1: Lowest Margin % sorted table
        shot1 = os.path.join(ARTIFACT_DIR, "product_matrix_01_lowest_margin_pct.png")
        page.screenshot(path=shot1)
        print("Captured Screenshot 1: Lowest Margin %", flush=True)

        # Select 'Highest Margin %' from the Quick Sort Dropdown
        print("Sorting by Highest Margin %...", flush=True)
        sort_select.select_option("margin_pct-desc")
        time.sleep(0.5)

        # Screenshot 2: Highest Margin % sorted table
        shot2 = os.path.join(ARTIFACT_DIR, "product_matrix_02_highest_margin_pct.png")
        page.screenshot(path=shot2)
        print("Captured Screenshot 2: Highest Margin %", flush=True)

        # Select 'Highest Profit (INR)' from the Quick Sort Dropdown
        print("Sorting by Highest Profit (INR)...", flush=True)
        sort_select.select_option("profit_30d-desc")
        time.sleep(0.5)

        # Screenshot 3: Highest Profit (INR) sorted table
        shot3 = os.path.join(ARTIFACT_DIR, "product_matrix_03_highest_profit_inr.png")
        page.screenshot(path=shot3)
        print("Captured Screenshot 3: Highest Profit (INR)", flush=True)

        # Test clicking column header 'Margin %' directly
        print("Clicking 'Margin %' column header to sort ascending...", flush=True)
        margin_header = page.locator("th:has-text('Margin %')").first
        margin_header.click()
        time.sleep(0.5)

        shot4 = os.path.join(ARTIFACT_DIR, "product_matrix_04_header_click_margin_pct.png")
        page.screenshot(path=shot4)
        print("Captured Screenshot 4: Clicked Margin % header", flush=True)

        browser.close()
        print("Product matrix verification complete!", flush=True)

if __name__ == "__main__":
    verify_sorting()
