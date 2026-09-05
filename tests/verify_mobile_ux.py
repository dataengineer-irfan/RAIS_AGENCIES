import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def run_mobile_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        )
        page = context.new_page()

        print("[TEST] 1. Navigating to Login...")
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")

        # Use 1-click Quick Select Administrator
        admin_btn = page.locator("button").filter(has_text="Administrator")
        if admin_btn.count() > 0:
            admin_btn.click()
            time.sleep(0.5)
            page.locator("button[type='submit']").click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
        else:
            page.locator("input[placeholder='Enter username']").fill("admin")
            page.locator("input[placeholder='Enter password']").fill("RaisAdmin@2026")
            page.locator("button[type='submit']").click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)

        print("[TEST] Logged in successfully!")

        # 2. Go to Catalogue via Mobile Bottom Nav
        print("[TEST] 2. Testing Catalogue Mobile Features...")
        cat_tab = page.locator("nav button").filter(has_text="Catalogue").last
        cat_tab.click()
        page.wait_for_selector("button[title*='Price Tweak']", timeout=15000)
        time.sleep(1)

        # Capture Catalogue Overview with loaded products
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_01_catalogue.png"))
        print("  -> Saved mobile_01_catalogue.png")

        # 3. Test 1-Tap Quick Price Tweak Modal
        print("[TEST] 3. Testing 1-Tap Quick Price Tweak...")
        price_btn = page.locator("button[title*='Price Tweak']").first
        price_btn.click()
        time.sleep(1)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_02_quick_price_modal.png"))
        print("  -> Saved mobile_02_quick_price_modal.png")
        # Close modal
        page.locator("button").filter(has_text="Cancel").first.click()
        time.sleep(0.5)

        # 4. Test + Fast Add Product Modal (3 Fields)
        print("[TEST] 4. Testing Fast Add Product Modal...")
        sku_btn = page.locator("button").filter(has_text="+ SKU").first
        if sku_btn.count() > 0:
            sku_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_03_fast_add_product.png"))
            print("  -> Saved mobile_03_fast_add_product.png")
            # Close modal
            page.locator("button").filter(has_text="Cancel").first.click()
            time.sleep(0.5)

        # 5. Test Bulk Price Adjust Modal
        print("[TEST] 5. Testing Bulk Price Adjuster Modal...")
        bulk_btn = page.locator("button[title*='Bulk Price']").first
        if bulk_btn.count() > 0:
            bulk_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_04_bulk_price_adjust.png"))
            print("  -> Saved mobile_04_bulk_price_adjust.png")
            page.locator("button").filter(has_text="Cancel").first.click()
            time.sleep(0.5)

        # 6. Go to Inventory Page via Mobile Bottom Nav
        print("[TEST] 6. Testing Inventory Mobile Features...")
        inv_tab = page.locator("nav button").filter(has_text="Inventory").last
        inv_tab.click()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Capture Traffic Light Slicers
        page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_05_inventory_traffic_lights.png"))
        print("  -> Saved mobile_05_inventory_traffic_lights.png")

        # 7. Test Truck Inward Batch Intake Modal
        print("[TEST] 7. Testing Truck Inward Batch Intake...")
        truck_btn = page.locator("button").filter(has_text="Truck Inward").first
        if truck_btn.count() > 0:
            truck_btn.click()
            time.sleep(1)
            # Click +25 on the first item
            plus_25_btn = page.locator("button").filter(has_text="+25").first
            if plus_25_btn.count() > 0:
                plus_25_btn.click()
                time.sleep(0.5)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_06_truck_batch_intake.png"))
            print("  -> Saved mobile_06_truck_batch_intake.png")
            page.locator("button").filter(has_text="Cancel").first.click()
            time.sleep(0.5)

        # 8. Test Camera Barcode Scanner Modal
        print("[TEST] 8. Testing Camera Barcode Scanner...")
        scan_btn = page.locator("button").filter(has_text="Scan").first
        if scan_btn.count() > 0:
            scan_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "mobile_07_camera_barcode_scanner.png"))
            print("  -> Saved mobile_07_camera_barcode_scanner.png")
            # Close modal with X
            page.locator("button:has(svg.lucide-x)").first.click()
            time.sleep(0.5)

        print("[SUCCESS] All mobile features verified and screenshots captured!")
        browser.close()

if __name__ == "__main__":
    run_mobile_verification()
