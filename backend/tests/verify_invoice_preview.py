import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_invoice_preview():
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
        
        # Navigate to Billing page
        page.click("button:has-text('Billing')")
        page.wait_for_selector("text=Master-Detail Invoicing", timeout=12000)
        time.sleep(1)
        
        # Click "+ CREATE INVOICE" button
        create_btn = page.locator("button:has-text('CREATE INVOICE')").first
        create_btn.click()
        page.wait_for_selector("text=Create Commercial Wholesale Invoice", timeout=8000)
        time.sleep(1)
        
        # Check that Invoice Date and Due Date match (Cash same-day)
        date_inputs = page.locator("input[type='date']")
        inv_date_val = date_inputs.nth(0).input_value()
        due_date_val = date_inputs.nth(1).input_value()
        print(f"[VERIFY] Invoice Date: {inv_date_val}, Due Date: {due_date_val}")
        assert inv_date_val == due_date_val, f"Dates do not match: {inv_date_val} vs {due_date_val}"
        
        # Screenshot of form with cash terms
        out_form_path = os.path.join(ARTIFACT_DIR, "invoice_builder_cash_mode.png")
        page.screenshot(path=out_form_path)
        print(f"[OK] Builder form verified with matching dates & cash terms. Screenshot saved to {out_form_path}")
        
        # Click "Preview Invoice"
        preview_btn = page.locator("button:has-text('Preview Invoice')")
        preview_btn.click()
        page.wait_for_selector("text=Invoice Live Preview", timeout=8000)
        time.sleep(1)
        
        # Take screenshot of live invoice preview
        out_prev_path = os.path.join(ARTIFACT_DIR, "invoice_live_preview.png")
        page.screenshot(path=out_prev_path)
        print(f"[OK] Invoice Live Preview verified! Screenshot saved to {out_prev_path}")
        
        browser.close()

if __name__ == "__main__":
    verify_invoice_preview()
