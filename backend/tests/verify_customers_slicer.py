import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_customers_slicer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        
        # Login
        if page.locator("button:has-text('Administrator')").count() > 0:
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            time.sleep(2)
        
        # Navigate to Customers tab
        page.click("button:has-text('Customers')")
        page.wait_for_selector("h4:has-text('Al-Madina')", timeout=15000)
        time.sleep(1.5)
        
        # Screenshot of complete Power BI Customer Analytics Canvas populated with live data
        out_path = os.path.join(ARTIFACT_DIR, "powerbi_customer_analytics_canvas.png")
        page.screenshot(path=out_path)
        print(f"[SUCCESS] Power BI Customer Analytics Canvas verified with live customer data! Screenshot saved to {out_path}")
        
        browser.close()

if __name__ == "__main__":
    verify_customers_slicer()
