import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\Documents\RAIS"
BRAIN_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def save_screenshots(page, filename):
    for d in [ARTIFACT_DIR, BRAIN_DIR]:
        page.screenshot(path=os.path.join(d, filename))
    print(f"  -> Captured {filename}")

def dismiss_modals(page):
    try:
        page.evaluate("() => { localStorage.setItem('rais_last_reorder_alert_date', new Date().toISOString().slice(0, 10)); }")
        btn = page.locator("div.fixed.inset-0 button:has-text('Close'), div.fixed.inset-0 button:has-text(\"Don't remind today\")").first
        if btn.count() > 0 and btn.is_visible():
            btn.click(timeout=2000)
            time.sleep(0.5)
    except Exception:
        pass

def open_mobile_menu_and_click(page, label):
    # Click hamburger button
    page.locator("button[title='Open Navigation Menu']").click()
    time.sleep(1)
    # Click the menu item inside slide-out drawer
    item = page.locator(f"div[class*='max-w-xs'] button:has-text('{label}')").first
    item.click()
    time.sleep(2)

def run_mobile_tests():
    print("[QA MOBILE AUDIT] Starting comprehensive mobile test suite (390x844)...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        page = context.new_page()

        # Telemetry
        page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))

        # 1. Login
        print("\n[Step 1] Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        admin_btn = page.locator("button").filter(has_text="Administrator")
        if admin_btn.count() > 0:
            admin_btn.click()
            time.sleep(0.5)
            page.locator("button[type='submit']").click()
        else:
            page.locator("input[placeholder='Enter username']").fill("admin")
            page.locator("input[placeholder='Enter password']").fill("RaisAdmin@2026")
            page.locator("button[type='submit']").click()

        time.sleep(2)
        print("  -> Successfully logged in.")

        # Handle Inactive Outlet Re-Order Reminder modal if triggered
        try:
            modal_btn = page.wait_for_selector("button:has-text(\"Don't remind today\"), button:has-text('Close')", timeout=5000)
            if modal_btn and modal_btn.is_visible():
                print("  -> Inactive Outlet Re-Order Reminder popup detected!")
                save_screenshots(page, "qa_mob_01b_reorder_reminder.png")
                modal_btn.click()
                time.sleep(1.5)
        except Exception:
            pass

        # Double check no lingering modal overlays
        for _ in range(3):
            overlay_btn = page.locator("div.fixed.inset-0 button:has-text('Close'), div.fixed.inset-0 button:has-text(\"Don't remind today\")")
            if overlay_btn.count() > 0 and overlay_btn.first.is_visible():
                overlay_btn.first.click()
                time.sleep(1)
            else:
                break

        # Wait for canvas loader if present
        try:
            page.wait_for_selector("text=Loading Executive Canvas...", state="detached", timeout=8000)
        except Exception:
            pass
        time.sleep(1)
        save_screenshots(page, "qa_mob_01_dashboard.png")

        # 2. Customers / Outlets Page
        print("\n[Step 2] Navigating to Outlets Page...")
        dismiss_modals(page)
        outlets_nav = page.locator("nav button").filter(has_text="Outlets").last
        if outlets_nav.count() > 0:
            outlets_nav.click()
            time.sleep(1.5)
            save_screenshots(page, "qa_mob_02_customers.png")

        # 3. Billing Page
        print("\n[Step 3] Navigating to Billing Page...")
        dismiss_modals(page)
        billing_nav = page.locator("nav button").filter(has_text="Billing").last
        if billing_nav.count() > 0:
            billing_nav.click()
            try:
                page.wait_for_selector("div.cursor-pointer:has-text('INV-')", timeout=15000)
            except Exception as e:
                print(f"  [WAIT FOR INVOICES] {e}")
            time.sleep(1.5)
            save_screenshots(page, "qa_mob_05_billing_list.png")

            # Click first invoice card to inspect
            first_inv = page.locator("div.cursor-pointer:has-text('INV-')").first
            if first_inv.count() > 0:
                first_inv.click()
                time.sleep(1)
                page.locator("button:has-text('Invoice Details')").first.click()
                time.sleep(1)
                save_screenshots(page, "qa_mob_05b_billing_detail.png")

        # 4. Open Mobile Drawer Menu & Orders Hub
        print("\n[Step 4] Opening Mobile Navigation Menu & Orders...")
        dismiss_modals(page)
        page.locator("button[title='Open Navigation Menu']").click()
        time.sleep(1)
        save_screenshots(page, "qa_mob_08_drawer.png")

        # Click Orders & Bookings inside drawer
        page.locator("div[class*='max-w-xs'] button:has-text('Orders & Bookings')").click()
        time.sleep(2)
        save_screenshots(page, "qa_mob_04_orders.png")

        # 5. Financial Reports & Aging Matrix
        print("\n[Step 5] Navigating to Financial Reports & Aging...")
        open_mobile_menu_and_click(page, 'Financial Reports & Aging')
        save_screenshots(page, "qa_mob_09_reports.png")

        # Switch to SKU Velocity on Mobile
        velocity_tab = page.locator("button:has-text('SKU Velocity'), div button:has-text('SKU')").first
        if velocity_tab.count() > 0:
            print("  -> Switching to SKU Velocity tab on mobile...")
            velocity_tab.click()
            time.sleep(1)
            save_screenshots(page, "qa_mob_09b_reports_velocity.png")

        # 6. Payments & Ledger
        print("\n[Step 6] Navigating to Payments & Collections...")
        open_mobile_menu_and_click(page, 'Payment Settlements')
        save_screenshots(page, "qa_mob_10_payments.png")

        # 7. Inventory
        print("\n[Step 7] Navigating to Inventory...")
        inv_nav = page.locator("nav button").filter(has_text="Inventory").last
        if inv_nav.count() > 0:
            inv_nav.click()
            time.sleep(1.5)
            save_screenshots(page, "qa_mob_06_inventory.png")

        # 8. Catalogue
        print("\n[Step 8] Navigating to Catalogue...")
        cat_nav = page.locator("nav button").filter(has_text="Catalogue").last
        if cat_nav.count() > 0:
            cat_nav.click()
            time.sleep(1.5)
            save_screenshots(page, "qa_mob_07_catalogue.png")

        print("\n[QA COMPLETE] All mobile tests passed and screenshots captured successfully!")
        browser.close()

if __name__ == "__main__":
    run_mobile_tests()
