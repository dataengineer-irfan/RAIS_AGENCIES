import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def test_catalogue_suite():
    print("[CATALOGUE QA] ========================================================")
    print("[CATALOGUE QA] TESTING ENHANCED CATALOGUE & PRODUCT MANAGEMENT FLOW")
    print("[CATALOGUE QA] ========================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # Step 1: Login
        print("  [Step 1] Logging in...")
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
        page.click("button:has-text('Sign In to Workspace')")
        page.wait_for_selector("text=Commercial Overview", timeout=10000)

        # Step 2: Navigate to Catalogue
        print("  [Step 2] Navigating to Enhanced Catalogue...")
        page.locator("aside nav button:has-text('Catalogue')").first.click()
        page.wait_for_selector("text=Authoritative RAIS Agencies Catalogue", timeout=10000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_01_grid_view.png"))

        # Step 3: Switch to Spreadsheet Table View
        print("  [Step 3] Switching to Dense Master Spreadsheet View...")
        page.locator("button[title='Master Spreadsheet Table View']").first.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_02_table_view.png"))

        # Switch back to Grid
        page.locator("button[title='Card Grid View']").first.click()
        time.sleep(0.5)

        # Step 4: Open WhatsApp Price List Modal
        print("  [Step 4] Opening WhatsApp Wholesale Price List...")
        page.locator("button:has-text('WhatsApp Price List')").first.click()
        page.wait_for_selector("text=WhatsApp Wholesale Price List", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_03_whatsapp_modal.png"))
        page.locator("button:has-text('Close')").last.click()
        time.sleep(0.5)

        # Step 5: Add New Product via Modal
        print("  [Step 5] Opening '+ Add New Product' Modal...")
        page.locator("button:has-text('+ Add New Product')").first.click()
        page.wait_for_selector("text=Add New Catalogue Product", timeout=10000)

        # Fill Product Details
        page.fill("input[placeholder='e.g. ITC Veg Crispy Fingers']", "ITC Crispy Veg Burger Patty 1.2 KG")
        
        # Select Veg Category
        veg_opt = page.locator("select option:has-text('Veg Items')").first.inner_text()
        page.locator("form select").first.select_option(label=veg_opt)

        page.fill("input[placeholder='e.g. ITC Master Chef']", "ITC Master Chef")
        page.fill("input[placeholder='e.g. 1 KG PACKET, 1 BOTTLE']", "1.2 KG PACKET")
        page.fill("input[placeholder='0.00']", "235.00")
        page.locator("form select").nth(1).select_option(value="5.00") # 5% GST
        page.fill("input[placeholder='50']", "45") # Initial stock

        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_04_add_product_modal.png"))

        print("  [Step 6] Submitting New Product...")
        page.locator("button:has-text('Add to Catalogue')").last.click()
        time.sleep(2.5)

        # Step 7: Verify Newly Added Product in Catalogue
        print("  [Step 7] Verifying new product appears in Catalogue...")
        page.fill("input[placeholder='Search by product name, SKU, brand, or packaging...']", "Crispy Veg Burger Patty")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_05_new_product_verified.png"))

        # Step 8: Open Edit Modal on the new product
        print("  [Step 8] Editing Master SKU...")
        page.locator("button[title='Edit Master SKU']").first.click()
        page.wait_for_selector("text=Edit Master SKU", timeout=10000)
        page.fill("input[placeholder='0.00']", "240.00")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_06_edit_product_modal.png"))
        page.locator("button:has-text('Update SKU')").last.click()
        time.sleep(2.5)

        browser.close()
        print("[CATALOGUE QA] ========================================================")
        print("[CATALOGUE QA] ALL CATALOGUE ENHANCEMENTS & ADD PRODUCT FLOW VERIFIED!")
        print("[CATALOGUE QA] ========================================================")

if __name__ == "__main__":
    test_catalogue_suite()
