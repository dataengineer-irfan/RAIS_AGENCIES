import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def verify_print_html():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        
        # Navigate to latest invoice print HTML
        page.goto("http://localhost:3000/api/invoices/44c59f47-d843-4729-9313-197626f58dd1/print-html", wait_until="networkidle")
        time.sleep(1)
        
        # Verify Wholesale Invoice header
        assert page.locator("text=WHOLESALE INVOICE").count() > 0, "WHOLESALE INVOICE header missing"
        assert page.locator("text=TAX INVOICE").count() == 0, "TAX INVOICE badge should not be present"
        assert page.locator("th:has-text('GST')").count() == 0, "GST column header should not be present"
        assert page.locator("text=GST / Tax:").count() == 0, "GST / Tax line should not be present"
        
        # Take screenshot of clean A4 print HTML
        out_path = os.path.join(ARTIFACT_DIR, "invoice_print_html_clean.png")
        page.screenshot(path=out_path)
        print(f"[SUCCESS] Print HTML verified clean with zero GST! Saved screenshot to {out_path}")
        browser.close()

if __name__ == "__main__":
    verify_print_html()
