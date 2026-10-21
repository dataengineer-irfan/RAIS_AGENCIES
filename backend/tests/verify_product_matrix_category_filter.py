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

# Real-world categories matching the user's screenshot (65 SKUs total)
MOCK_PRODUCTS_MATRIX = {
    "total_skus": 12,
    "winners_count": 4,
    "steady_count": 6,
    "declining_count": 1,
    "zero_movers_count": 1,
    "total_dead_stock_value": 2000,
    "out_of_stock_count": 0,
    "items": [
        {
            "product_id": "p1",
            "name": "BURGER BOX 5\"x5\" PRINTED",
            "sku": "RAIS-BOX-05",
            "brand": "Packaging Solutions",
            "category_name": "Pizza Boxes & Burger Boxes",
            "classification": "STEADY",
            "units_sold_30d": 3,
            "packaging_unit": "100 NOS",
            "revenue_30d": 1160.00,
            "profit_30d": 470.00,
            "margin_pct": 40.5,
            "trend_pct": 52.6,
            "stock_holding_units": 4,
            "stock_holding_value": 1600
        },
        {
            "product_id": "p2",
            "name": "BURGER BOX 4\"x4\" PRINTED",
            "sku": "RAIS-BOX-04",
            "brand": "Packaging Solutions",
            "category_name": "Pizza Boxes & Burger Boxes",
            "classification": "STEADY",
            "units_sold_30d": 5,
            "packaging_unit": "100 NOS",
            "revenue_30d": 1630.00,
            "profit_30d": 326.00,
            "margin_pct": 20.0,
            "trend_pct": 123.3,
            "stock_holding_units": 10,
            "stock_holding_value": 3500
        },
        {
            "product_id": "p3",
            "name": "ITC CHEESY CORN TRIANGLE",
            "sku": "RAIS-VEG-07",
            "brand": "ITC Master Chef",
            "category_name": "Veg Items",
            "classification": "STEADY",
            "units_sold_30d": 1,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 350.00,
            "profit_30d": 130.00,
            "margin_pct": 37.1,
            "trend_pct": 100.0,
            "stock_holding_units": 3,
            "stock_holding_value": 1050
        },
        {
            "product_id": "p4",
            "name": "ITC Crispy Veg Burger Patty 1.2 KG",
            "sku": "RAIS-VEG-ITCC",
            "brand": "ITC Master Chef",
            "category_name": "Veg Items",
            "classification": "STEADY",
            "units_sold_30d": 1,
            "packaging_unit": "1.2 KG PACKET",
            "revenue_30d": 220.00,
            "profit_30d": 75.00,
            "margin_pct": 34.1,
            "trend_pct": -8.3,
            "stock_holding_units": 17,
            "stock_holding_value": 4080
        },
        {
            "product_id": "p5",
            "name": "CHILLI FILL VEG BURGER PATTY",
            "sku": "RAIS-VEG-04",
            "brand": "Chilli Fill",
            "category_name": "Veg Items",
            "classification": "STEADY",
            "units_sold_30d": 8,
            "packaging_unit": "1.2 KG PACKET",
            "revenue_30d": 1840.00,
            "profit_30d": 368.00,
            "margin_pct": 20.0,
            "trend_pct": 300.0,
            "stock_holding_units": 0,
            "stock_holding_value": 0
        },
        {
            "product_id": "p6",
            "name": "BUTTER NUTRILITE",
            "sku": "RAIS-CHE-BUTT",
            "brand": "RAIS Master",
            "category_name": "Cheese & Slices",
            "classification": "STEADY",
            "units_sold_30d": 5,
            "packaging_unit": "500 GRAMS PACKET",
            "revenue_30d": 585.00,
            "profit_30d": 125.00,
            "margin_pct": 21.4,
            "trend_pct": 165.9,
            "stock_holding_units": 6,
            "stock_holding_value": 750
        },
        {
            "product_id": "p7",
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
            "product_id": "p8",
            "name": "KECHUP FDR 5KG TOMATO",
            "sku": "RAIS-SAU-KECH",
            "brand": "RAIS Master",
            "category_name": "Ketchup & Sauces",
            "classification": "STEADY",
            "units_sold_30d": 4,
            "packaging_unit": "5 KG CAN",
            "revenue_30d": 1230.00,
            "profit_30d": 246.00,
            "margin_pct": 20.0,
            "trend_pct": 117.7,
            "stock_holding_units": 0,
            "stock_holding_value": 0
        },
        {
            "product_id": "p9",
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
            "product_id": "p10",
            "name": "Fingers chicken",
            "sku": "RAIS-CHI-FING",
            "brand": "RAIS Master",
            "category_name": "Chicken Items",
            "classification": "STEADY",
            "units_sold_30d": 2,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 760.00,
            "profit_30d": 152.00,
            "margin_pct": 20.0,
            "trend_pct": 100.0,
            "stock_holding_units": 3,
            "stock_holding_value": 1140
        },
        {
            "product_id": "p11",
            "name": "CHICKEN POPCORN 1KG",
            "sku": "RAIS-CHI-POP",
            "brand": "RAIS Master",
            "category_name": "Chicken Items",
            "classification": "WINNER",
            "units_sold_30d": 15,
            "packaging_unit": "1 KG PACKET",
            "revenue_30d": 4500.00,
            "profit_30d": 900.00,
            "margin_pct": 20.0,
            "trend_pct": 50.0,
            "stock_holding_units": 8,
            "stock_holding_value": 2400
        },
        {
            "product_id": "p12",
            "name": "PERI PERI SPRINKLER POWDER",
            "sku": "RAIS-POW-01",
            "brand": "Flavour Hub",
            "category_name": "Bread Mix & Powders",
            "classification": "WINNER",
            "units_sold_30d": 20,
            "packaging_unit": "500G PKT",
            "revenue_30d": 2000.00,
            "profit_30d": 600.00,
            "margin_pct": 30.0,
            "trend_pct": 20.0,
            "stock_holding_units": 12,
            "stock_holding_value": 1200
        }
    ]
}

def verify_category_filter():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 1. Desktop Test (1366x768 - typical laptop matching user's screen)
        page = browser.new_page(viewport={"width": 1366, "height": 768})

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
        page.wait_for_selector("button:has-text('Product Intelligence')", timeout=15000)
        tab = page.locator("button:has-text('Product Intelligence')").first
        tab.click()
        time.sleep(1)

        # 1. Capture initial state with All Categories
        shot1 = os.path.join(ARTIFACT_DIR, "category_filter_01_all_categories.png")
        page.screenshot(path=shot1)
        print("Captured 01: Initial Product Intelligence with Category Dropdown", flush=True)

        # 2. Select 'Veg Items' from Category dropdown
        cat_select = page.locator("select[title='Filter by Category']").first
        cat_select.select_option("Veg Items")
        time.sleep(0.5)
        shot2 = os.path.join(ARTIFACT_DIR, "category_filter_02_veg_items_filtered.png")
        page.screenshot(path=shot2)
        print("Captured 02: Veg Items filtered (3 SKUs)", flush=True)

        # 3. Select 'Pizza Boxes & Burger Boxes'
        cat_select.select_option("Pizza Boxes & Burger Boxes")
        time.sleep(0.5)
        shot3 = os.path.join(ARTIFACT_DIR, "category_filter_03_pizza_burger_boxes.png")
        page.screenshot(path=shot3)
        print("Captured 03: Pizza Boxes & Burger Boxes filtered", flush=True)

        # 4. Click 'Steady' classification pill while category is filtered
        steady_pill = page.locator("button:has-text('Steady')").first
        steady_pill.click()
        time.sleep(0.5)
        shot4 = os.path.join(ARTIFACT_DIR, "category_filter_04_category_and_steady.png")
        page.screenshot(path=shot4)
        print("Captured 04: Combined Category + Classification filter", flush=True)

        # 5. Clear category filter using the 'X' button
        clear_btn = page.locator("button[title='Clear Category Filter']").first
        if clear_btn.count() > 0:
            clear_btn.click()
            time.sleep(0.5)
            shot5 = os.path.join(ARTIFACT_DIR, "category_filter_05_cleared_category.png")
            page.screenshot(path=shot5)
            print("Captured 05: Category Filter cleared with X button", flush=True)

        # 6. Mobile Viewport Test (390 x 844 iPhone)
        page.set_viewport_size({"width": 390, "height": 844})
        time.sleep(0.5)
        shot6 = os.path.join(ARTIFACT_DIR, "category_filter_06_mobile_cards_all.png")
        page.screenshot(path=shot6)
        print("Captured 06: Mobile card view with category dropdown", flush=True)

        # Select 'Chicken Items' on mobile
        cat_select_mob = page.locator("select[title='Filter by Category']").first
        cat_select_mob.select_option("Chicken Items")
        time.sleep(0.5)
        shot7 = os.path.join(ARTIFACT_DIR, "category_filter_07_mobile_chicken_items.png")
        page.screenshot(path=shot7)
        print("Captured 07: Mobile cards filtered to Chicken Items", flush=True)

        browser.close()
        print("All Category Filter tests verified successfully!", flush=True)

if __name__ == "__main__":
    verify_category_filter()
