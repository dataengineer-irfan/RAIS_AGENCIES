import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def capture_mobile():
    with sync_playwright() as p:
        iphone = p.devices['iPhone 14 Pro']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone)
        page = context.new_page()

        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # 1. Login
        if page.locator("button:has-text('Administrator')").count() > 0:
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            page.wait_for_selector("header", timeout=10000)
            time.sleep(2)

        # 2. Dashboard
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_dashboard_ready.png"))
        print("[1] Captured: mobile_dashboard_ready.png")

        # 3. Outlets / Customers
        page.locator("nav button:has-text('Outlets')").click()
        time.sleep(2)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_customers_ready.png"))
        print("[2] Captured: mobile_customers_ready.png")

        # 4. Inventory
        page.locator("nav button:has-text('Inventory')").click()
        time.sleep(2)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_inventory_ready.png"))
        print("[3] Captured: mobile_inventory_ready.png")

        # 5. Billing
        page.locator("nav button:has-text('Billing')").click()
        time.sleep(2)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_billing_ready.png"))
        print("[4] Captured: mobile_billing_ready.png")

        # 6. AI Co-Pilot
        page.locator("nav button:has-text('AI Co-Pilot')").click()
        time.sleep(2)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_ai_ready.png"))
        print("[5] Captured: mobile_ai_ready.png")

        browser.close()
        print("\n[SUCCESS] All mobile screenshots captured!")

if __name__ == "__main__":
    capture_mobile()
