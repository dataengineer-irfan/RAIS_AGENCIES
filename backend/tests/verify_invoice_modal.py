import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_invoice_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        
        if page.locator("button:has-text('Administrator')").count() > 0:
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            page.wait_for_selector("text=Executive Command & Decision Overview", timeout=15000)
        
        time.sleep(2)
        
        # Click "+ CREATE INVOICE" in top bar
        create_btn = page.locator("button:has-text('CREATE INVOICE')").first
        create_btn.click()
        page.wait_for_selector("text=Create New Tax Invoice", timeout=10000)
        time.sleep(1.5)
        
        # Save screenshot
        out_path = os.path.join(ARTIFACT_DIR, "invoice_modal_prepopulated.png")
        page.screenshot(path=out_path)
        print(f"[SUCCESS] Saved screenshot to {out_path}")
        browser.close()

if __name__ == "__main__":
    verify_invoice_modal()
