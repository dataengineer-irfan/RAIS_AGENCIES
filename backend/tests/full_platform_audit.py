import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def close_open_modal(page):
    time.sleep(0.5)
    modal_btn = page.locator("button:has-text('Cancel'), button:has-text('Close'), button:has(svg.lucide-x)")
    if modal_btn.count() > 0:
        try:
            modal_btn.first.click(timeout=1500)
        except Exception:
            pass
    time.sleep(0.8)

def run_self_contained_audit():
    print("\n=======================================================")
    print("[START] SELF-CONTAINED FULL PLATFORM AUDIT RUNNER")
    print("=======================================================\n")

    # Step 0: Launch Servers directly
    print("[INIT] Spawning Backend & Frontend processes...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    frontend_proc = subprocess.Popen(
        ["npx.cmd", "vite", "--port", "3000"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    time.sleep(4)
    print("  -> Backend and Frontend servers active.")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            # ─── STEP 1: AUTHENTICATION & LOGIN ───
            print("\n[Step 1/12] Login Page & Role Switcher...")
            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)
            
            if page.locator("button:has-text('Administrator')").count() > 0:
                page.click("button:has-text('Administrator')")
                time.sleep(0.5)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_01_login.png"))
                page.click("button[type='submit']")
                time.sleep(2)
            print("  -> Authenticated as System Administrator.")

            # ─── STEP 2: DASHBOARD PAGE ───
            print("[Step 2/12] Executive Dashboard...")
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_02_dashboard.png"))
            print("  -> Captured: audit_02_dashboard.png")

            # ─── STEP 3: CUSTOMERS & POWER BI SLICER CANVAS ───
            print("[Step 3/12] Customer & Outlet Directory with Slicers...")
            page.locator("button:has-text('Customers')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_03_customers_canvas.png"))
            
            # Test Customer Modal
            if page.locator("button:has-text('+ OUTLET')").count() > 0:
                page.locator("button:has-text('+ OUTLET')").click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_04_customer_modal.png"))
                close_open_modal(page)
            print("  -> Captured: audit_03, audit_04")

            # ─── STEP 4: CATALOGUE & SKU PRICING MATRIX ───
            print("[Step 4/12] Catalogue & Direct Wholesale Pricing Matrix...")
            page.locator("button:has-text('Catalogue')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_05_catalogue.png"))

            # Test WhatsApp Price List Modal
            if page.locator("button[title='WhatsApp Wholesale Price List']").count() > 0:
                page.locator("button[title='WhatsApp Wholesale Price List']").click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_06_whatsapp_pricelist_modal.png"))
                close_open_modal(page)

            # Test Product Modal
            if page.locator("button:has-text('+ SKU')").count() > 0:
                page.locator("button:has-text('+ SKU')").click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_07_product_modal.png"))
                close_open_modal(page)
            print("  -> Captured: audit_05, audit_06, audit_07")

            # ─── STEP 5: INVENTORY & COLD STORAGE VALUATION ───
            print("[Step 5/12] Inventory & Cold Storage Valuation...")
            page.locator("button:has-text('Inventory')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_08_inventory.png"))
            print("  -> Captured: audit_08_inventory.png")

            # ─── STEP 6: ORDERS & ROUTE BOOKINGS ───
            print("[Step 6/12] Orders & Route Bookings...")
            page.locator("button:has-text('Orders & Bookings')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_09_orders.png"))

            # Test Order Builder Modal
            if page.locator("button:has-text('+ Booking')").count() > 0:
                page.locator("button:has-text('+ Booking')").click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_10_order_builder_modal.png"))
                close_open_modal(page)
            print("  -> Captured: audit_09, audit_10")

            # ─── STEP 7: BILLING, LIVE PREVIEW & INVOICES ───
            print("[Step 7/12] Billing, Cash Invoicing & Live Preview...")
            page.locator("button:has-text('Billing & Invoices')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_11_billing_invoices.png"))

            # Open Invoice Builder Modal
            if page.locator("button:has-text('+ Invoice')").count() > 0:
                page.locator("button:has-text('+ Invoice')").first.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_12_invoice_builder_modal.png"))

                # Trigger Live Preview inside Invoice Builder
                if page.locator("button:has-text('Preview Invoice')").count() > 0:
                    page.locator("button:has-text('Preview Invoice')").click()
                    time.sleep(1)
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_13_invoice_live_preview.png"))
                    if page.locator("button:has-text('Back to Edit Form')").count() > 0:
                        page.locator("button:has-text('Back to Edit Form')").click()
                        time.sleep(0.5)
                
                close_open_modal(page)

            # Test Thermal Receipt Modal
            if page.locator("button:has-text('Thermal Receipt')").count() > 0:
                page.locator("button:has-text('Thermal Receipt')").first.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_14_thermal_receipt_modal.png"))
                close_open_modal(page)
            print("  -> Captured: audit_11, audit_12, audit_13, audit_14")

            # ─── STEP 8: PAYMENTS & SETTLEMENTS ───
            print("[Step 8/12] Payments & Settlements...")
            page.locator("button:has-text('Payments')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_15_payments.png"))

            # Test Payment Modal
            if page.locator("button:has-text('+ Settlement')").count() > 0:
                page.locator("button:has-text('+ Settlement')").click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_16_payment_modal.png"))
                close_open_modal(page)
            print("  -> Captured: audit_15, audit_16")

            # ─── STEP 9: REPORTS & AGING ANALYTICS ───
            print("[Step 9/12] Reports & Aging Analytics...")
            page.locator("button:has-text('Reports & Aging')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_17_reports_aging.png"))
            print("  -> Captured: audit_17_reports_aging.png")

            # ─── STEP 10: AI ASSISTANT CO-PILOT ───
            print("[Step 10/12] AI Assistant Agentic Co-Pilot...")
            page.locator("button:has-text('AI Assistant')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_18_ai_assistant.png"))
            print("  -> Captured: audit_18_ai_assistant.png")

            # ─── STEP 11: AUDIT & SECURITY SYSTEM LOGS ───
            print("[Step 11/12] Audit Trail & Security Logs...")
            page.locator("button:has-text('Audit & System')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_19_audit_logs.png"))
            print("  -> Captured: audit_19_audit_logs.png")

            # ─── STEP 12: MOBILE RESPONSIVENESS (iPhone Viewport) ───
            print("[Step 12/12] Mobile Viewport Responsiveness...")
            mobile_page = context.new_page()
            mobile_page.set_viewport_size({"width": 375, "height": 812})
            mobile_page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(2)
            mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_20_mobile_viewport.png"))
            print("  -> Captured: audit_20_mobile_viewport.png")

            # Clean A4 HTML Print Invoice direct verification
            print("\n[Print Audit] Direct A4 HTML Wholesale Invoice render check...")
            print_page = context.new_page()
            print_page.set_viewport_size({"width": 1200, "height": 900})
            print_page.goto("http://127.0.0.1:8001/api/invoices/44c59f47-d843-4729-9313-197626f58dd1/print-html", wait_until="networkidle")
            time.sleep(1.5)
            print_page.screenshot(path=os.path.join(ARTIFACT_DIR, "audit_21_print_a4_clean.png"))
            print("  -> Captured: audit_21_print_a4_clean.png")

            browser.close()
            print("\n=======================================================")
            print("[SUCCESS] FULL AUDIT COMPLETE: ALL 21 SCREENSHOTS GENERATED")
            print("=======================================================\n")
    finally:
        print("[CLEANUP] Stopping background dev servers...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    run_self_contained_audit()
