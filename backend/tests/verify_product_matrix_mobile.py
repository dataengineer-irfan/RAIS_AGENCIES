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
            "units_sold_30d": 18,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 3960.00,
            "profit_30d": 234.00,
            "margin_pct": 5.9,
            "trend_pct": 28.6,
            "stock_holding_units": 12,
            "stock_holding_value": 2484
        },
        {
            "product_id": "p4",
            "name": "BURGER MAYO 1KG (DELMONTE)",
            "sku": "RAIS-MAY-01",
            "brand": "Del Monte",
            "category_name": "Mayonnaise & Dressings",
            "classification": "WINNER",
            "units_sold_30d": 41,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 7074.00,
            "profit_30d": 650.60,
            "margin_pct": 9.2,
            "trend_pct": 14.1,
            "stock_holding_units": 15,
            "stock_holding_value": 2350
        },
        {
            "product_id": "p5",
            "name": "PIZZA TOPPING 1KG (DELMONTE)",
            "sku": "RAIS-SAU-01",
            "brand": "Del Monte",
            "category_name": "Ketchup & Sauces",
            "classification": "WINNER",
            "units_sold_30d": 31,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 4410.00,
            "profit_30d": 492.00,
            "margin_pct": 11.2,
            "trend_pct": -12.4,
            "stock_holding_units": 8,
            "stock_holding_value": 1012
        },
        {
            "product_id": "p6",
            "name": "MILKY MIST MOZEROLLA DICED CHEESE 2KG",
            "sku": "RAIS-CHS-01",
            "brand": "Milky Mist",
            "category_name": "Cheese & Slices",
            "classification": "WINNER",
            "units_sold_30d": 65,
            "packaging_unit": "2 KG PACKET",
            "revenue_30d": 41800.00,
            "profit_30d": 465.00,
            "margin_pct": 1.1,
            "trend_pct": 35.4,
            "stock_holding_units": 14,
            "stock_holding_value": 8900
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

def verify_mobile():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # iPhone 14 viewport (390 x 844)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2
        )
        page = context.new_page()

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

        print("Navigating to Products tab...", flush=True)
        prod_tab = page.locator("button:has-text('Products')").first
        if prod_tab.count() > 0:
            prod_tab.click()
            time.sleep(1)

        # 1. Capture mobile default Matrix Card view
        shot1 = os.path.join(ARTIFACT_DIR, "mobile_matrix_01_default_cards.png")
        page.screenshot(path=shot1)
        print("Captured 01: Default Mobile Matrix Card View", flush=True)

        # 2. Select Lowest Margin % from Quick Sort Dropdown
        print("Selecting Lowest Margin % on mobile...", flush=True)
        sort_select = page.locator("select[title='Sort products']").first
        if sort_select.count() > 0:
            sort_select.select_option("margin_pct-asc")
            time.sleep(0.5)
            shot2 = os.path.join(ARTIFACT_DIR, "mobile_matrix_02_lowest_margin_cards.png")
            page.screenshot(path=shot2)
            print("Captured 02: Lowest Margin % sorted cards", flush=True)

        # 3. Select Highest Profit
        print("Selecting Highest Profit (INR) on mobile...", flush=True)
        if sort_select.count() > 0:
            sort_select.select_option("profit_30d-desc")
            time.sleep(0.5)
            shot3 = os.path.join(ARTIFACT_DIR, "mobile_matrix_03_highest_profit_cards.png")
            page.screenshot(path=shot3)
            print("Captured 03: Highest Profit cards", flush=True)

        # 4. Switch to High-Density Table View on mobile
        print("Switching to Table view on mobile...", flush=True)
        table_toggle = page.locator("button[title='High-Density Table View']").first
        if table_toggle.count() > 0:
            table_toggle.click()
            time.sleep(0.5)
            shot4 = os.path.join(ARTIFACT_DIR, "mobile_matrix_04_table_view.png")
            page.screenshot(path=shot4)
            print("Captured 04: High-Density Table on mobile", flush=True)

            # Scroll table horizontally to see right side columns (Profit, Margin %, Trend, Stock)
            table_scroll = page.locator("table").locator("xpath=..")
            if table_scroll.count() > 0:
                table_scroll.evaluate("el => el.scrollLeft = 450")
                time.sleep(0.5)
                shot5 = os.path.join(ARTIFACT_DIR, "mobile_matrix_05_table_scrolled_right.png")
                page.screenshot(path=shot5)
                print("Captured 05: Table scrolled right", flush=True)

                table_scroll.evaluate("el => el.scrollLeft = 580")
                time.sleep(0.5)
                shot6 = os.path.join(ARTIFACT_DIR, "mobile_matrix_06_table_scrolled_margin_pct.png")
                page.screenshot(path=shot6)
                print("Captured 06: Table scrolled to Margin %", flush=True)

        browser.close()
        print("All mobile verifications completed successfully!", flush=True)

if __name__ == "__main__":
    verify_mobile()
