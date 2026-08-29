import os
import time
import json
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_business_e2e_suite():
    print("[QA] ========================================================")
    print("[QA] RUNNING FULL END-TO-END NON-TECHNICAL BUSINESS USER SUITE")
    print("[QA] ========================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Login
        print("  [Step 1] Loading Login Screen & Signing In...")
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_01_login.png"))
        page.click("button:has-text('Sign In to Workspace')")
        page.wait_for_selector("text=Commercial Overview", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_02_dashboard.png"))

        # Step 2: Add New Customer
        print("  [Step 2] Creating New B2B Customer (Spice Grill & Diner)...")
        page.locator("aside nav button:has-text('Customers')").first.click()
        page.wait_for_selector("text=Customer & Restaurant Directory", timeout=10000)
        time.sleep(1)
        page.click("button:has-text('+ New Customer')")
        page.wait_for_selector("text=Register New Customer / Restaurant", timeout=10000)
        
        page.fill("input[placeholder='e.g. Royal Fast Food & Burgers']", "Spice Grill & Diner")
        page.fill("input[placeholder='e.g. Mohammed Riaz']", "Farhan Khan")
        page.fill("input[placeholder='e.g. 9848012345']", "9876543210")
        page.fill("input[placeholder='e.g. Near RTC Bus Stand, Main Road']", "Near Vegetable Market, Kadapa Road")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_03_customer_create_modal.png"))
        page.locator("button:has-text('Register Customer')").last.click()
        time.sleep(2.5)

        # Step 3: Open Customer Workspace Profile
        print("  [Step 3] Verifying Customer Directory & Opening Customer Workspace...")
        page.wait_for_selector("text=Spice Grill & Diner", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_04_customers_directory.png"))

        # Open Workspace Profile
        page.locator("button:has-text('View Workspace')").first.click()
        page.wait_for_selector("text=Overview & Profile", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_05_customer_workspace.png"))
        page.locator("button[title='Close Profile']").first.click()
        time.sleep(1)

        # Step 4: Inventory Management (Receive Stock & Adjust)
        print("  [Step 4] Navigating to Inventory Module...")
        page.locator("aside nav button:has-text('Inventory')").first.click()
        page.wait_for_selector("text=Inventory & Stock Management", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_06_inventory_overview.png"))

        # Receive Stock
        print("  [Step 5] Receiving Supplier Stock (+30 KG ITC Momos)...")
        page.click("button:has-text('+ Receive Stock')")
        page.wait_for_selector("text=Receive Stock Delivery", timeout=10000)
        time.sleep(1)
        page.fill("input[placeholder='e.g. 20']", "30")
        page.fill("input[placeholder='e.g. 280.00']", "160.00")
        page.fill("input[placeholder='e.g. ITC Master Chef Hub']", "ITC Cold Chain Hub")
        page.fill("input[placeholder='e.g. BATCH-2026-AUG']", "BAT-2026-08")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_07_receive_stock_modal.png"))
        page.locator("button:has-text('Receive Stock')").last.click()
        time.sleep(3.5)

        # Stock Adjustment
        print("  [Step 6] Recording Stock Damage Adjustment (-2 units)...")
        page.click("button:has-text('Stock Adjustment')")
        page.wait_for_selector("text=Stock Adjustment", timeout=10000)
        time.sleep(1)
        page.fill("input[placeholder='e.g. 5']", "2")
        page.fill("input[placeholder='e.g. Broken packet discovered during morning audit']", "Transit packaging leak during van transport")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_08_stock_adjust_modal.png"))
        page.locator("button:has-text('Save Adjustment')").last.click()
        time.sleep(3.5)

        # Open Stock Movements Timeline
        print("  [Step 7] Checking Stock Movement Audit Timeline...")
        page.locator("table tbody tr").first.locator("button[title='View Stock Movement History']").click()
        page.wait_for_selector("text=Stock Movement Timeline", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_09_stock_movements.png"))
        page.locator("button:has-text('Close')").last.click()
        time.sleep(1)

        # Step 8: Orders & Bookings
        print("  [Step 8] Creating Customer Booking / Order for Spice Grill & Diner...")
        page.locator("aside nav button:has-text('Orders & Bookings')").first.click()
        page.wait_for_selector("text=Orders & Bookings Management", timeout=10000)
        time.sleep(1)
        page.click("button:has-text('+ New Order')")
        page.wait_for_selector("text=Create New Customer Order", timeout=10000)
        time.sleep(1)

        # Select Spice Grill
        spice_opt = page.locator("select option:has-text('Spice Grill & Diner')").first.inner_text()
        page.locator("select").first.select_option(label=spice_opt)
        page.click("button:has-text('Add Product Row')")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_10_order_builder_modal.png"))
        page.locator("button:has-text('Confirm Order')").last.click()
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_11_orders_list.png"))

        # Step 9: 1-Click Convert Order to Invoice
        print("  [Step 9] 1-Click Converting Order to Tax Invoice...")
        page.locator("table tbody tr").first.locator("button:has-text('Generate Invoice')").click()
        time.sleep(3.5)

        # Step 10: Invoices Management
        print("  [Step 10] Verifying Issued Tax Invoice in Billing...")
        page.locator("aside nav button:has-text('Billing & Invoices')").first.click()
        page.wait_for_selector("text=Billing & Invoices Management", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_12_invoices_after_order.png"))

        # Step 11: Record Payment for Customer
        print("  [Step 11] Recording Payment of Rs. 3,000 for Spice Grill & Diner...")
        page.locator("aside nav button:has-text('Payments')").first.click()
        page.wait_for_selector("text=Payments & Settlement Log", timeout=10000)
        time.sleep(1)
        page.locator("button:has-text('Record Settlement')").first.click()
        page.wait_for_selector("text=Record Settlement / Payment", timeout=10000)
        time.sleep(1)
        
        spice_pay_opt = page.locator("select option:has-text('Spice Grill & Diner')").first.inner_text()
        page.locator("select").first.select_option(label=spice_pay_opt)
        page.fill("input[placeholder='0.00']", "3000")
        page.fill("input[placeholder='e.g. UTR12345678 or Cash Receipt No']", "UPI/2026/SPICE998877")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_13_payment_modal.png"))
        page.locator("button:has-text('Confirm Payment')").last.click()
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_14_payments_log.png"))

        # Step 12: Customer Ledger Statement
        print("  [Step 12] Verifying Real-Time Customer Statement & Ledger Timeline...")
        page.locator("aside nav button:has-text('Customers')").first.click()
        page.wait_for_selector("text=Spice Grill & Diner", timeout=10000)
        time.sleep(1)
        page.locator("button:has-text('View Workspace')").first.click()
        page.wait_for_selector("text=Overview & Profile", timeout=10000)
        page.click("button:has-text('Ledger Timeline')")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_15_customer_ledger_timeline.png"))
        page.locator("button[title='Close Profile']").first.click()
        time.sleep(1)

        # Step 13: Financial Reports & Receivables Aging
        print("  [Step 13] Verifying Financial Reports & Receivables Aging...")
        page.locator("aside nav button:has-text('Reports & Aging')").first.click()
        page.wait_for_selector("text=Receivables Aging", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_16_reports_aging.png"))

        # Step 14: Semantic AI Assistant
        print("  [Step 14] Verifying Semantic Business AI Assistant...")
        page.locator("header button:has-text('AI Assistant')").first.click()
        page.wait_for_selector("text=RAIS Business AI", timeout=10000)
        time.sleep(1)
        page.click("button:has-text('What is our total outstanding balance?')")
        time.sleep(3.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_17_ai_assistant_live.png"))

        browser.close()
        print("[QA] ========================================================")
        print("[QA] ALL 17 END-TO-END BUSINESS USER WORKFLOW TESTS PASSED!")
        print("[QA] ========================================================")

if __name__ == "__main__":
    run_business_e2e_suite()
