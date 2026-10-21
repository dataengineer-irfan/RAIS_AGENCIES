import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

MOCK_USER = {
    "id": "user-001",
    "username": "admin",
    "role": "ADMIN",
    "full_name": "Antigravity Admin"
}

MOCK_CUSTOMERS = [
    {
        "id": "cust-001",
        "customer_code": "CUST-0012",
        "business_name": "Al-Rehman Foods & Cafe",
        "phone": "+91 9876543210",
        "outstanding_balance": "4307.00",
        "credit_limit": "25000.00"
    },
    {
        "id": "cust-002",
        "customer_code": "CUST-0044",
        "business_name": "Cash Counter Sale",
        "phone": "+91 9999999999",
        "outstanding_balance": "0.00",
        "credit_limit": "0.00"
    }
]

MOCK_PRODUCTS = [
    {
        "id": "prod-001",
        "sku": "PIZZA-BOX-10",
        "name": "10 Inch Pizza Delivery Boxes (50 pcs)",
        "brand": "Standard Pack",
        "base_price": "250.00",
        "current_stock": 450,
        "packaging_unit": "PKT",
        "min_stock_alert": 20
    },
    {
        "id": "prod-002",
        "sku": "BURGER-BOX-REG",
        "name": "Burger Box Regular Clamshell (100 pcs)",
        "brand": "Standard Pack",
        "base_price": "300.00",
        "current_stock": 280,
        "packaging_unit": "PKT",
        "min_stock_alert": 20
    },
    {
        "id": "prod-003",
        "sku": "FRIES-POUCH-M",
        "name": "French Fries Paper Pouch Medium",
        "brand": "EcoWrap",
        "base_price": "180.00",
        "current_stock": 600,
        "packaging_unit": "PKT",
        "min_stock_alert": 50
    }
]

def verify():
    print("Launching Playwright on laptop viewport (1366x768)...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 1366, "height": 768},
            device_scale_factor=1.0
        )
        page = context.new_page()

        # Intercept and mock API routes
        def handle_route(route):
            url = route.request.url
            if "auth/token" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "access_token": "mock-token-xyz",
                    "token_type": "bearer",
                    "user": MOCK_USER
                }))
            elif "auth/me" in url or "users/me" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_USER))
            elif "customers" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_CUSTOMERS))
            elif "products" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_PRODUCTS))
            elif "categories" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
            elif "dashboard" in url or "summary" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"total_revenue": 100000}))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({}))

        page.route("**/api/**", handle_route)

        print("Navigating to http://localhost:5173...", flush=True)
        page.goto("http://localhost:5173", timeout=30000, wait_until="networkidle")

        # Set localStorage token directly to bypass login
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

        # Check for login form if still present
        if page.locator("input[placeholder='Enter username']").count() > 0:
            page.fill("input[placeholder='Enter username']", "admin")
            page.fill("input[placeholder='Enter password']", "RaisAdmin@2026")
            page.click("button[type='submit']")
            time.sleep(1)

        # Open New Invoice Modal
        print("Clicking '+ CREATE INVOICE'...", flush=True)
        create_btn = page.locator("button:has-text('CREATE INVOICE')").first
        create_btn.wait_for(timeout=10000)
        create_btn.click()
        time.sleep(1)

        page.wait_for_selector("text=New Invoice", timeout=10000)
        time.sleep(0.5)

        # 1. Search & Select customer "Al-Rehman Foods" (has ₹4,307 balance)
        print("Selecting Al-Rehman Foods...", flush=True)
        customer_btn = page.locator("button:has-text('Click to Search & Select Customer')").first
        customer_btn.click()
        time.sleep(0.3)

        al_rehman_opt = page.locator("[data-customer-item]:has-text('Al-Rehman Foods')").first
        al_rehman_opt.click()
        time.sleep(0.5)

        # Tap products from Catalogue Quick Picker on the left!
        print("Adding 10 Inch Pizza Delivery Boxes (Rs. 250) via Quick Picker...", flush=True)
        pizza_box_card = page.locator("p:has-text('10 Inch Pizza Delivery Boxes')").first
        pizza_box_card.click()
        time.sleep(0.3)

        print("Adding Burger Box Regular (Rs. 300) via Quick Picker...", flush=True)
        burger_box_card = page.locator("p:has-text('Burger Box Regular Clamshell')").first
        burger_box_card.click()
        time.sleep(0.5)

        # Total bill is now Rs. 250 + Rs. 300 = Rs. 550!
        # Screenshot 1: Laptop Viewport with 2 rows - full modal in view without scrolling
        shot1_path = os.path.join(ARTIFACT_DIR, "laptop_modal_2_rows_no_scroll.png")
        page.screenshot(path=shot1_path)
        print(f"Captured Screenshot 1 (2 rows layout on laptop): {shot1_path}", flush=True)

        # Check scroll container dimensions
        scroller_metrics = page.evaluate("""() => {
            const scroller = document.querySelector('.custom-scrollbar.overflow-y-auto');
            if (!scroller) return null;
            return {
                scrollHeight: scroller.scrollHeight,
                clientHeight: scroller.clientHeight,
                scrollTop: scroller.scrollTop,
                needsScroll: scroller.scrollHeight > scroller.clientHeight
            };
        }""")
        print("Scroller metrics:", scroller_metrics, flush=True)

        # 2. Test Issue 2: Customer bill is Rs. 550, existing balance is Rs. 4,307, customer pays Rs. 1,000
        print("Entering Rs. 1,000 in Received Now...", flush=True)
        received_input = page.locator("input[placeholder*='Enter cash/UPI received']").first
        received_input.fill("1000")
        time.sleep(0.5)

        # Screenshot 2: Counter Collection with Surplus calculation
        shot2_path = os.path.join(ARTIFACT_DIR, "laptop_counter_collection_surplus_1000.png")
        page.screenshot(path=shot2_path)
        print(f"Captured Screenshot 2 (Counter collection Rs. 1,000 calculation): {shot2_path}", flush=True)

        # Extract text from the calculation ribbon
        ribbon = page.locator(".bg-emerald-500\\/10.border-emerald-500\\/25").first
        if ribbon.count() > 0:
            print("Live Settlement Ribbon Text:", flush=True)
            print(ribbon.inner_text().replace('\u20b9', 'Rs. '), flush=True)

        submit_btn = page.locator("button[type='submit']").last
        if submit_btn.count() > 0:
            print("Submit button text:", submit_btn.inner_text().replace('\u20b9', 'Rs. '), flush=True)

        browser.close()
        print("Verification completed successfully!", flush=True)

if __name__ == "__main__":
    verify()
