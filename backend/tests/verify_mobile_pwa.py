import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_mobile():
    with sync_playwright() as p:
        # Emulate iPhone 14 Pro (393 x 852)
        iphone = p.devices['iPhone 14 Pro']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone)
        page = context.new_page()

        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # Login
        if page.locator("button:has-text('Administrator')").count() > 0:
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            time.sleep(2)

        # 1. Capture Mobile Dashboard
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_dashboard.png"))
        print("[1] Captured: mobile_dashboard.png")

        # 2. Capture Mobile Customers Tab
        page.locator("nav button:has-text('Outlets')").first.click()
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_customers.png"))
        print("[2] Captured: mobile_customers.png")

        # 3. Capture Mobile AI Co-Pilot Tab
        page.locator("nav button:has-text('AI Co-Pilot')").first.click()
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_ai_copilot.png"))
        print("[3] Captured: mobile_ai_copilot.png")

        browser.close()
        print("\n[SUCCESS] Mobile screenshots captured!")

if __name__ == "__main__":
    verify_mobile()
