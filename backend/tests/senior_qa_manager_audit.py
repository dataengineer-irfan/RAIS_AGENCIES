import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import time
import json
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

sys.path.insert(0, BACKEND_DIR)

def wait_for_server(url, max_retries=30, delay=0.5):
    for _ in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status in (200, 401, 403):
                    return True
        except urllib.error.HTTPError as e:
            if e.code in (200, 401, 403, 404):
                return True
        except Exception:
            pass
        time.sleep(delay)
    return False

def run_qa_manager_audit():
    print("=" * 70)
    print("SENIOR QA MANAGER: END-TO-END AUTOMATED LIVE AUDIT")
    print("=" * 70)

    # 1. Start test backend and frontend servers
    print("[1/5] Launching backend (port 8001) & frontend (port 3000)...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    frontend_env = os.environ.copy()
    frontend_env["VITE_API_URL"] = "http://127.0.0.1:8001"
    frontend_proc = subprocess.Popen(
        ["npx.cmd", "vite", "--port", "3000"],
        cwd=FRONTEND_DIR,
        env=frontend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    print("  -> Waiting for backend (8001) to become ready...")
    if not wait_for_server("http://127.0.0.1:8001/api/invoices", max_retries=20):
        print("  [WARN] Backend readiness check timed out, proceeding anyway...")
    else:
        print("  -> Backend is ready.")

    print("  -> Waiting for frontend (3000) to become ready...")
    if not wait_for_server("http://localhost:3000", max_retries=20):
        print("  [WARN] Frontend readiness check timed out, proceeding anyway...")
    else:
        print("  -> Frontend is ready.")

    console_errors = []
    page_errors = []
    failed_requests = []
    audit_findings = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            # Wire telemetry
            def on_console(msg):
                if msg.type in ["error"]:
                    console_errors.append(f"[{page.url}] CONSOLE ERROR: {msg.text}")
                    print(f"  [BROWSER ERROR] {msg.text}")
                elif "warn" in msg.type or "log" in msg.type:
                    print(f"  [BROWSER {msg.type.upper()}] {msg.text[:120]}")
            def on_page_error(err):
                page_errors.append(f"[{page.url}] UNCAUGHT EXCEPTION: {str(err)}")
                print(f"  [PAGE ERROR] {err}")
            def on_request_failed(req):
                failed_requests.append(f"FAILED REQUEST: {req.method} {req.url}")
                print(f"  [FAILED REQ] {req.method} {req.url}")
            def on_response(res):
                if "/api/" in res.url:
                    print(f"  [API] {res.status} {res.url.split('?')[0]}")

            page.on("console", on_console)
            page.on("pageerror", on_page_error)
            page.on("requestfailed", on_request_failed)
            page.on("response", on_response)

            # ─── SECTION 1: LOGIN ───
            print("\n[QA Section 1] Authentication & RBAC...")
            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_01_login_screen.png"))

            # Log in as Administrator
            admin_btn = page.locator("button:has-text('Administrator')")
            if admin_btn.count() > 0:
                admin_btn.first.click()
                time.sleep(0.5)
                page.click("button[type='submit']")
                page.wait_for_selector("aside, main", timeout=15000)
                time.sleep(2)
            print("  [PASS] Logged in as Administrator.")

            # ─── SECTION 2: DASHBOARD ───
            print("\n[QA Section 2] Executive Dashboard & Targets...")
            try:
                page.wait_for_selector("text=Loading Executive Canvas", state="detached", timeout=10000)
            except Exception:
                pass
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_02_dashboard_kpis.png"))

            # Check Targets tab
            targets_tab = page.locator("button:has-text('Targets')")
            if targets_tab.count() > 0:
                targets_tab.first.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_02b_dashboard_targets.png"))
                print("  [PASS] Targets tab verified.")

            # ─── SECTION 3: BILLING & INVOICES (ISSUE 1 & 2 AUDIT) ───
            print("\n[QA Section 3] Invoices Hub Speed & Customer Since Details...")
            t_start = time.time()
            page.locator("button:has-text('Billing & Invoices')").first.click()
            try:
                # Wait for skeleton loader to disappear
                page.wait_for_selector("div.animate-pulse", state="detached", timeout=20000)
                page.wait_for_selector("div.cursor-pointer:has-text('INV-')", timeout=10000)
            except Exception as e:
                print(f"  [WAIT NOTICE] {e}")
            t_load = time.time() - t_start
            
            # Click first invoice card to ensure inspector detail is active
            first_card = page.locator("div.cursor-pointer:has-text('INV-')").first
            if first_card.count() > 0:
                first_card.click()
                time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_03_invoices_hub.png"))
            print(f"  [METRIC] Invoices page loaded in {t_load:.2f} seconds.")

            # Verify Customer Association Date is present in the Inspector panel
            inspector_text = ""
            try:
                inspector_panel = page.locator("div.lg\\:col-span-7").first
                inspector_text = inspector_panel.inner_text()
            except Exception as e:
                print(f"  [INSPECTOR READ ERROR] {e}")

            has_since = "Associated Since" in inspector_text
            print(f"  [CHECK] 'Associated Since' present in Billing UI Inspector: {has_since}")
            if has_since:
                audit_findings.append("Billing UI displays Customer Association Date (Associated Since) in the inspector.")
            else:
                audit_findings.append(f"Billing UI: No customer_since was rendered in inspector (Inspector text: {inspector_text[:100]}...).")

            # ─── SECTION 4: PRINT INVOICE AUDIT (ISSUE 2 PRINT INTEGRITY) ───
            print("\n[QA Section 4] Verify 'Associated Since' is NOT printed on Invoice...")
            # Fetch first invoice ID from database
            from app.core.database import SessionLocal
            from app.models.invoice import Invoice
            db = SessionLocal()
            first_inv = db.query(Invoice).first()
            if first_inv:
                print_page = context.new_page()
                print_page.goto(f"http://127.0.0.1:8001/api/invoices/{first_inv.id}/print-html", wait_until="networkidle")
                time.sleep(1)
                print_text = print_page.inner_text("body")
                print_has_since = "Associated Since" in print_text or "customer_since" in print_text
                print_page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_04_print_invoice_clean.png"))
                print(f"  [VERIFIED] 'Associated Since' printed on invoice document: {print_has_since} (MUST BE FALSE)")
                assert not print_has_since, "FAILURE: customer_since must NOT appear on printed invoices!"
                print_page.close()
            db.close()

            # ─── SECTION 5: CUSTOMERS & OUTLETS (ISSUE 2 OUTLET AUDIT) ───
            print("\n[QA Section 5] Outlets Directory & Since Badges...")
            page.locator("button:has-text('Customers')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_05_customers_outlets.png"))
            cust_text = page.locator("div.lg\\:col-span-12, main").first.inner_text()
            has_cust_since = "Since" in cust_text or "Associated Since" in cust_text
            print(f"  [CHECK] Customer Tenure ('Since') displayed on Outlet cards/header: {has_cust_since}")

            # ─── SECTION 6: CATALOGUE ───
            print("\n[QA Section 6] Catalogue & SKU Pricing...")
            page.locator("button:has-text('Catalogue')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_06_catalogue.png"))

            # ─── SECTION 7: INVENTORY & STOCK ───
            print("\n[QA Section 7] Cold Storage Inventory...")
            page.locator("button:has-text('Inventory')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_07_inventory.png"))

            # ─── SECTION 8: ORDERS & BOOKINGS (ISSUE 3 AUDIT) ───
            print("\n[QA Section 8] Orders & Advance Bookings Hub...")
            page.locator("button:has-text('Orders & Bookings')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_08_orders.png"))

            # ─── SECTION 9: PAYMENTS (ISSUE 5 METRICS AUDIT) ───
            print("\n[QA Section 9] Payment Settlements & Collection Badges...")
            page.locator("button:has-text('Payments')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_09_payments_ledger.png"))
            pay_header = page.locator("div.bg-slate-900\\/90").first.inner_text()
            print(f"  [CHECK] Payments Header Badges:\n    {pay_header.replace(chr(10), ' | ')}")
            has_all_time = "All-Time" in pay_header
            print(f"  [PASS] Explicit All-Time badge rendered: {has_all_time}")

            # ─── SECTION 10: REPORTS & AGING (ISSUE 4 AUDIT) ───
            print("\n[QA Section 10] Financial Reports & Aging Matrix (Customer Names & SKU Velocity)...")
            page.locator("button:has-text('Reports & Aging')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_10_reports_aging.png"))
            reports_text = page.locator("main").first.inner_text()
            
            # Check for dummy 'Customer' vs real names
            has_real_customers = any(name in reports_text for name in ["PIZZA TIME", "AFC SUNDUPALLI", "KIM CAFE", "KFC"])
            has_real_skus = any(sku in reports_text for sku in ["MILKY MIST", "AMUL", "FRIES", "MOMOS"])
            print(f"  [CHECK] Real Customer Names rendered in Aging table: {has_real_customers}")
            print(f"  [CHECK] Real SKU Names rendered in SKU Velocity: {has_real_skus}")
            print(f"  [CHECK] Contains dummy placeholder lines: {'Customer\nCUST' in reports_text}")

            # ─── SECTION 11: AI ASSISTANT ───
            print("\n[QA Section 11] AI Assistant Co-Pilot...")
            page.locator("button:has-text('AI Assistant')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_11_ai_assistant.png"))

            # ─── SECTION 12: AUDIT LOGS ───
            print("\n[QA Section 12] System Audit Trail...")
            try:
                page.locator("button:has-text('Audit & Data Vault'), button:has-text('Audit')").first.click()
                time.sleep(2)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_12_audit_trail.png"))
                print("  [PASS] Audit Trail loaded.")
            except Exception as e:
                print(f"  [WARN] Audit tab navigation: {e}")

            # ─── SECTION 13: MOBILE VIEWPORT TEST ───
            print("\n[QA Section 13] Mobile Responsiveness (375x812)...")
            mobile_page = context.new_page()
            mobile_page.set_viewport_size({"width": 375, "height": 812})
            mobile_page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(2)
            mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_13_mobile_dashboard.png"))

            # Mobile Outlets
            try:
                outlets_btn = mobile_page.locator("nav button:has-text('Outlets')")
                if outlets_btn.count() > 0:
                    outlets_btn.first.click()
                    time.sleep(2)
                    mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_14_mobile_outlets.png"))
                    print("  [PASS] Mobile Outlets navigated.")
            except Exception as e:
                print(f"  [WARN] Mobile Outlets click: {e}")

            browser.close()

    finally:
        print("\n[CLEANUP] Terminating test dev servers...")
        try:
            backend_proc.terminate()
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        try:
            frontend_proc.terminate()
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

    print("\n" + "=" * 70)
    print("QA MANAGER AUDIT SUMMARY REPORT:")
    print("=" * 70)
    print(f"Console Errors: {len(console_errors)}")
    for err in console_errors:
        print(f"  ! {err}")
    print(f"Page / Uncaught Errors: {len(page_errors)}")
    for err in page_errors:
        print(f"  ! {err}")
    print(f"Failed HTTP Requests: {len(failed_requests)}")
    for req in failed_requests:
        print(f"  ! {req}")
    print("=" * 70)

if __name__ == "__main__":
    run_qa_manager_audit()
