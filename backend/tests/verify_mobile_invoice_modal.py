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
        "city": "Rayachoty",
        "outstanding_balance": "4307.00",
        "credit_limit": "25000.00"
    },
    {
        "id": "cust-002",
        "customer_code": "CUST-0044",
        "business_name": "Cash Counter Sale",
        "phone": "+91 9999999999",
        "city": "Rayachoty",
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
    }
]

def verify_mobile():
    print("Launching Playwright on mobile viewport (390x844 iPhone 13)...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2.0
        )
        page = context.new_page()

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

        # Set auth tokens in localStorage
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

        # Open New Invoice Modal via mobile FAB
        print("Clicking Quick Actions FAB on mobile...", flush=True)
        fab = page.locator("button[title='Quick Actions']").first
        fab.wait_for(timeout=10000)
        fab.click()
        time.sleep(0.3)

        print("Clicking 'New Invoice' from speed dial...", flush=True)
        page.locator("button:has-text('New Invoice')").first.click()
        time.sleep(0.5)

        page.wait_for_selector("text=New Invoice", timeout=10000)
        time.sleep(0.5)

        # Mobile Screenshot 1: Initial state
        shot1_path = os.path.join(ARTIFACT_DIR, "mobile_01_modal_initial.png")
        page.screenshot(path=shot1_path)
        print("Captured Mobile Screenshot 1: Initial state", flush=True)

        # Click customer selector to open searchable dropdown
        print("Opening SearchableCustomerSelect on mobile...", flush=True)
        customer_btn = page.locator("button:has-text('Click to Search & Select Customer')").first
        customer_btn.click()
        time.sleep(0.3)

        # Mobile Screenshot 2: Customer dropdown open
        shot2_path = os.path.join(ARTIFACT_DIR, "mobile_02_customer_dropdown_open.png")
        page.screenshot(path=shot2_path)
        print("Captured Mobile Screenshot 2: Customer dropdown open", flush=True)

        # Select Al-Rehman Foods
        al_rehman_opt = page.locator("[data-customer-item]:has-text('Al-Rehman Foods')").first
        al_rehman_opt.click()
        time.sleep(0.3)

        # Add 2 items via the Quick Picker
        print("Adding items via Quick Picker...", flush=True)
        page.locator("p:has-text('10 Inch Pizza Delivery Boxes')").first.click()
        time.sleep(0.3)
        page.locator("p:has-text('Burger Box Regular Clamshell')").first.click()
        time.sleep(0.3)

        # Scroll down slightly inside the modal to view the line items & settlement section
        scroller = page.locator(".custom-scrollbar.overflow-y-auto").first
        scroller.evaluate("(el) => el.scrollTop = 350")
        time.sleep(0.5)

        # Mobile Screenshot 3: Line items & settlement section
        shot3_path = os.path.join(ARTIFACT_DIR, "mobile_03_line_items_cards.png")
        page.screenshot(path=shot3_path)
        print("Captured Mobile Screenshot 3: Line items cards", flush=True)

        # Enter ₹1,000 in Received Now
        print("Entering 1000 in Received Now...", flush=True)
        received_input = page.locator("input[placeholder*='Enter cash/UPI received']").first
        received_input.fill("1000")
        page.keyboard.press("Tab") # Blur input
        time.sleep(0.5)

        # Check scroll information
        scroll_info = page.evaluate("""() => {
            const scroller = document.querySelector('.custom-scrollbar.overflow-y-auto');
            const outer = document.querySelector('.fixed.inset-0.z-50');
            return {
                inner: scroller ? { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
                outer: outer ? { scrollTop: outer.scrollTop, scrollHeight: outer.scrollHeight, clientHeight: outer.clientHeight } : null,
                windowHeight: window.innerHeight
            };
        }""")
        print("SCROLL INFO:", scroll_info, flush=True)

        # Scroll so that the Counter Collection input AND the Live Settlement Ribbon are clearly visible
        ribbon_text = page.locator("text=INVOICE SETTLED IN FULL").first
        if ribbon_text.count() > 0:
            ribbon_text.scroll_into_view_if_needed()
            time.sleep(0.3)
        else:
            page.evaluate("""() => {
                const scroller = document.querySelector('.custom-scrollbar.overflow-y-auto');
                if (scroller) scroller.scrollTop = scroller.scrollHeight;
            }""")
            time.sleep(0.3)

        # Mobile Screenshot 4: Counter collection with live settlement ribbon & action buttons
        shot4_path = os.path.join(ARTIFACT_DIR, "mobile_04_counter_collection_ribbon.png")
        page.screenshot(path=shot4_path)
        print("Captured Mobile Screenshot 4: Counter collection & ribbon", flush=True)

        # Mobile Screenshot 5: Light Theme Check with Ribbon Visible
        print("Switching to Light Theme...", flush=True)
        page.evaluate("""() => {
            document.documentElement.classList.add('theme-light');
            document.documentElement.classList.remove('theme-dark', 'dark');
            localStorage.setItem('rais_theme', 'light');
        }""")
        time.sleep(0.5)

        # Mobile Screenshot 5: Light Theme Check with Ribbon & Summary Visible
        shot5_path = os.path.join(ARTIFACT_DIR, "mobile_05_light_theme_check.png")
        page.screenshot(path=shot5_path)
        print("Captured Mobile Screenshot 5: Light theme check", flush=True)

        # Mobile Screenshot 6: Light Theme scrolled to top to verify modal header, customer picker, and dates in Light Mode
        quick_picker_header = page.locator("text=Catalogue Quick Picker").first
        if quick_picker_header.count() > 0:
            quick_picker_header.scroll_into_view_if_needed()
            time.sleep(0.5)

        shot6_path = os.path.join(ARTIFACT_DIR, "mobile_06_light_theme_top.png")
        page.screenshot(path=shot6_path)
        print("Captured Mobile Screenshot 6: Light theme top view", flush=True)

        browser.close()
        print("Mobile verification complete!", flush=True)

if __name__ == "__main__":
    verify_mobile()
