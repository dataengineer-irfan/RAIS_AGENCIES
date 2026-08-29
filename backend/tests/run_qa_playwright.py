import os
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_qa_suite():
    print("[QA] Starting Playwright End-User Verification Suite...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Login Page
        print("  1. Verifying Login Screen...")
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_01_login.png"))

        # 2. Login as Admin
        print("  2. Logging in as Administrator...")
        page.click("button:has-text('Sign In to Workspace')")
        page.wait_for_selector("text=Commercial Overview", timeout=10000)
        page.wait_for_selector("text=INV-202608-00001", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_02_dashboard.png"))

        # 3. Billing & Invoices
        print("  3. Verifying Billing & Invoices Page...")
        page.click("aside button:has-text('Billing & Invoices')")
        page.wait_for_selector("text=Invoices Management", timeout=10000)
        page.wait_for_selector("text=INV-202608-00001", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_03_billing.png"))

        # 4. Open Invoice Builder
        print("  4. Verifying Invoice Builder...")
        page.click("button:has-text('New Tax Invoice')")
        page.wait_for_selector("text=Create New Tax Invoice", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_04_invoice_builder.png"))
        page.click("button:has-text('Cancel')")
        time.sleep(0.5)

        # 5. Printable Tax Invoice via Backend
        print("  5. Verifying Printable Tax Invoice with UPI QR...")
        login_req = urllib.request.Request(
            "http://localhost:8001/api/auth/login-json",
            data=json.dumps({"username": "admin", "password": "RaisAdmin@2026"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        login_res = json.loads(urllib.request.urlopen(login_req).read().decode())
        auth_token = login_res["access_token"]

        inv_req = urllib.request.Request(
            "http://localhost:8001/api/invoices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        inv_data = json.loads(urllib.request.urlopen(inv_req).read().decode())
        first_inv_id = inv_data[0]["id"]

        print_page = context.new_page()
        print_page.goto(f"http://localhost:8001/api/invoices/{first_inv_id}/print-html")
        print_page.wait_for_selector("text=TAX INVOICE", timeout=10000)
        time.sleep(1)
        print_page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_05_printable_tax_invoice.png"))
        print_page.close()

        # 6. Customers Page
        print("  6. Verifying Customers Directory...")
        page.click("aside button:has-text('Customers')")
        page.wait_for_selector("text=Customer & Restaurant Directory", timeout=10000)
        page.wait_for_selector("text=Royal Fast Food", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_06_customers.png"))

        # 7. Customer Ledger Timeline (Click Royal Fast Food Ledger)
        print("  7. Verifying Customer Statement & Ledger Timeline...")
        # Target the Ledger History button on Royal Fast Food card
        page.click("div:has-text('Royal Fast Food') >> button:has-text('Ledger History')")
        page.wait_for_selector("text=Chronological Statement", timeout=10000)
        page.wait_for_selector("text=INV-202608-00001", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_07_customer_ledger.png"))
        page.click("button:has-text('Close Statement')")
        time.sleep(0.5)

        # 8. Master Catalogue Page (38 SKUs)
        print("  8. Verifying Master Catalogue (38 SKUs)...")
        page.click("aside button:has-text('Catalogue')")
        page.wait_for_selector("text=Authoritative RAIS Agencies Catalogue", timeout=10000)
        page.wait_for_selector("text=HUP HUP FRENCH FRIES", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_08_catalogue.png"))

        # 9. Reports & Aging Page
        print("  9. Verifying Reports & Aging Buckets...")
        page.click("aside button:has-text('Reports & Aging')")
        page.wait_for_selector("text=Receivables Aging", timeout=10000)
        page.wait_for_selector("text=8907.75", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_09_reports_aging.png"))

        # 10. AI Assistant Drawer
        print("  10. Verifying Semantic AI Assistant Drawer...")
        page.click("header button:has-text('AI Assistant')")
        page.wait_for_selector("text=RAIS Business AI", timeout=10000)
        time.sleep(1)
        page.click("button:has-text('What is our total outstanding balance?')")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_10_ai_assistant.png"))

        browser.close()
        print("[QA] SUCCESS! All 10 Playwright End-User Verification Tests PASSED with Screenshots Saved!")

if __name__ == "__main__":
    run_qa_suite()
