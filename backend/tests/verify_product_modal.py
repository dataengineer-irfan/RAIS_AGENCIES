import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_product_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        
        if page.locator("button:has-text('Administrator')").count() > 0:
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            time.sleep(3)
        
        # Navigate to Catalogue page
        page.click("button:has-text('Catalogue')")
        page.wait_for_selector("text=Commercial Product Catalogue Matrix", timeout=12000)
        time.sleep(1.5)
        
        # Click "+ ADD PRODUCT" button
        add_btn = page.locator("button:has-text('ADD PRODUCT')").first
        add_btn.click()
        page.wait_for_selector("text=Add New Catalogue Product", timeout=10000)
        time.sleep(1)
        
        # Take screenshot of open ProductModal
        out_path = os.path.join(ARTIFACT_DIR, "product_modal_verified.png")
        page.screenshot(path=out_path)
        print(f"[SUCCESS] ProductModal opened without errors! Saved screenshot to {out_path}")
        browser.close()

if __name__ == "__main__":
    verify_product_modal()
