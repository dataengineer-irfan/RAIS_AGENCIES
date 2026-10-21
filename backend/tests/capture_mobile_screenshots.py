import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def capture_mobile():
    print("=" * 60)
    print("CAPTURING MOBILE SCREENSHOTS (LIGHT & DARK THEMES)")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 393, "height": 852},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()

        # Step 1: Navigate to Live Render App
        print("\n[1] Navigating to https://rais-frontend.onrender.com...")
        page.goto("https://rais-frontend.onrender.com", timeout=60000, wait_until="networkidle")

        # Step 2: Sign In
        print("[2] Signing in as admin...")
        if page.locator("input[placeholder='Enter username']").count() > 0:
            page.fill("input[placeholder='Enter username']", "admin")
            page.fill("input[placeholder='Enter password']", "RaisAdmin@2026")
            page.click("button[type='submit']")

        # Wait for dashboard to fully load
        print("[3] Waiting for dashboard data to load...")
        page.wait_for_function(
            "() => !document.body.innerText.includes('Loading Executive Canvas') && document.body.innerText.includes('PROFIT')", 
            timeout=45000
        )
        time.sleep(2)

        # ─── PART A: LIGHT THEME MOBILE SCREENSHOTS ───
        print("\n[4] Setting Theme to LIGHT...")
        page.evaluate("""() => {
            localStorage.setItem('rais_theme', 'light');
            document.documentElement.classList.remove('theme-dark', 'dark');
            document.documentElement.classList.add('theme-light');
        }""")
        time.sleep(1)

        # 1. Dashboard Overview in Light Mode
        print("[Capture 1] Dashboard Overview (Light Mode)...")
        dash_path = os.path.join(ARTIFACT_DIR, "mobile_01_dashboard_light.png")
        page.screenshot(path=dash_path)
        print(f" -> Saved: {dash_path}")

        # 2. Click Profit Card -> Open Profit Deep-Dive Modal in Light Mode
        print("[Capture 2] Opening Profit Modal (Light Mode)...")
        page.evaluate("""() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const span = spans.find(s => s.innerText.trim().toUpperCase() === 'PROFIT' && s.offsetParent !== null);
            if (span) {
                const card = span.closest('.cursor-pointer') || span.parentElement;
                if (card) card.click();
            }
        }""")
        time.sleep(3)
        profit_modal_path = os.path.join(ARTIFACT_DIR, "mobile_02_overall_profit_modal_light.png")
        page.screenshot(path=profit_modal_path)
        print(f" -> Saved: {profit_modal_path}")

        # 3. Drill into Level 2: Click first Category (e.g. Veg Items / Pizza Boxes)
        print("[Capture 3] Drilling into Level 2 Category SKUs (Light Mode)...")
        page.evaluate("""() => {
            const catCards = Array.from(document.querySelectorAll('div[class*=\"cursor-pointer\"]'));
            const cat = catCards.find(c => c.querySelector('h4'));
            if (cat) cat.click();
        }""")
        time.sleep(2.5)
        sku_drilldown_path = os.path.join(ARTIFACT_DIR, "mobile_03_profit_sku_drilldown_light.png")
        page.screenshot(path=sku_drilldown_path)
        print(f" -> Saved: {sku_drilldown_path}")

        # Close Modal
        page.evaluate("""() => {
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Close'));
            if (closeBtn) closeBtn.click();
        }""")
        time.sleep(1.5)

        # 4. Product Intelligence Tab in Light Mode
        print("[Capture 4] Product Intelligence Tab (Light Mode)...")
        page.evaluate("""() => {
            const tabs = Array.from(document.querySelectorAll('button'));
            const prod = tabs.find(t => t.innerText && (t.innerText.includes('Product') || t.innerText.includes('Products')));
            if (prod) prod.click();
        }""")
        time.sleep(3.5)
        prod_intel_path = os.path.join(ARTIFACT_DIR, "mobile_04_product_intelligence_light.png")
        page.screenshot(path=prod_intel_path)
        print(f" -> Saved: {prod_intel_path}")

        # 5. Billing & Invoices Page in Light Mode
        print("[Capture 5] Billing & Invoices Page (Light Mode)...")
        page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const bill = btns.find(b => b.innerText && b.innerText.includes('Billing'));
            if (bill) bill.click();
        }""")
        time.sleep(3.5)
        billing_path = os.path.join(ARTIFACT_DIR, "mobile_05_billing_invoices_light.png")
        page.screenshot(path=billing_path)
        print(f" -> Saved: {billing_path}")

        # 6. Click on first invoice to show Mobile Invoice Detail
        print("[Capture 6] Mobile Invoice Detail (Light Mode)...")
        page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('div[class*=\"cursor-pointer\"]'));
            const inv = cards.find(c => c.querySelector('h4'));
            if (inv) inv.click();
        }""")
        time.sleep(2.5)
        inv_detail_path = os.path.join(ARTIFACT_DIR, "mobile_06_invoice_detail_light.png")
        page.screenshot(path=inv_detail_path)
        print(f" -> Saved: {inv_detail_path}")

        # ─── PART B: DARK THEME MOBILE SCREENSHOTS ───
        print("\n[5] Switching Theme to DARK...")
        page.evaluate("""() => {
            localStorage.setItem('rais_theme', 'dark');
            document.documentElement.classList.remove('theme-light');
            document.documentElement.classList.add('theme-dark', 'dark');
        }""")
        time.sleep(1.5)

        # 7. Billing & Invoices in Dark Mode
        print("[Capture 7] Billing & Invoices (Dark Mode)...")
        billing_dark_path = os.path.join(ARTIFACT_DIR, "mobile_07_billing_invoices_dark.png")
        page.screenshot(path=billing_dark_path)
        print(f" -> Saved: {billing_dark_path}")

        # 8. Return to Dashboard and capture Overall Profit Modal in Dark Mode
        print("[Capture 8] Returning to Home & Opening Profit Modal (Dark Mode)...")
        page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const home = btns.find(b => b.innerText && b.innerText.includes('Home'));
            if (home) home.click();
        }""")
        time.sleep(3)
        page.evaluate("""() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const span = spans.find(s => s.innerText.trim().toUpperCase() === 'PROFIT' && s.offsetParent !== null);
            if (span) {
                const card = span.closest('.cursor-pointer') || span.parentElement;
                if (card) card.click();
            }
        }""")
        time.sleep(3)
        profit_modal_dark_path = os.path.join(ARTIFACT_DIR, "mobile_08_overall_profit_modal_dark.png")
        page.screenshot(path=profit_modal_dark_path)
        print(f" -> Saved: {profit_modal_dark_path}")

        browser.close()
        print("\n" + "=" * 60)
        print("ALL MOBILE SCREENSHOTS CAPTURED SUCCESSFULLY!")
        print("=" * 60)

if __name__ == "__main__":
    capture_mobile()
