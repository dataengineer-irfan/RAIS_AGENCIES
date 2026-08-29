import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def run_powerbi_canvas_tests():
    print("[QA] Starting Power BI-Style Paginated Canvas Verification Suite...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1366, "height": 768})
        page = context.new_page()

        # Step 1: Navigate & Login
        print("  [Step 1] Navigating to http://localhost:3000 (1366x768)...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        if page.locator("button:has-text('Administrator')").count() > 0:
            print("  [Step 2] Authenticating as Admin...")
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            page.wait_for_selector("text=Executive Command & Decision Overview", timeout=15000)
            print("  [OK] Dashboard loaded.")

        time.sleep(2)

        # -------------------------------------------------------------
        # PAGE 1: OVERVIEW
        # -------------------------------------------------------------
        print("  [Page 1] Verifying Page 1: Overview Canvas...")
        assert page.locator("text=Month Revenue").count() > 0, "Revenue KPI missing"
        assert page.locator("text=Receivables").count() > 0, "Receivables KPI missing"
        assert page.locator("text=Run-Rate Story").count() > 0, "Compact Forecast missing"
        assert page.locator("text=Recent Invoices").count() > 0, "Recent Invoices missing"
        assert page.locator("text=Fast-Moving Items").count() > 0, "Fast moving missing"

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_01_page_overview_1366.png"))
        print("  [Captured] canvas_01_page_overview_1366.png")

        # -------------------------------------------------------------
        # PAGE 2: FORECAST & TARGETS (Test Tab Click)
        # -------------------------------------------------------------
        print("  [Page 2] Switching to Page 2: Forecast & Targets...")
        page.click("button:has-text('Forecast & Targets')")
        page.wait_for_selector("text=Sales Forecast vs Monthly Target", timeout=8000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_02_page_forecast_targets.png"))
        print("  [Captured] canvas_02_page_forecast_targets.png")

        # -------------------------------------------------------------
        # PAGE 3: RECEIVABLES & RISK (Test Tab Click)
        # -------------------------------------------------------------
        print("  [Page 3] Switching to Page 3: Receivables & Risk...")
        page.click("button:has-text('Receivables & Risk')")
        page.wait_for_selector("text=Customer Health & Proactive Early Warning", timeout=8000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_03_page_receivables_risk.png"))
        print("  [Captured] canvas_03_page_receivables_risk.png")

        # -------------------------------------------------------------
        # PAGE 4: PRODUCT INTELLIGENCE (Test Tab Click)
        # -------------------------------------------------------------
        print("  [Page 4] Switching to Page 4: Product Intelligence...")
        page.click("button:has-text('Product Intelligence')")
        page.wait_for_selector("text=Product Performance Matrix & Dead Stock Intelligence", timeout=8000)
        time.sleep(1.5)
        assert page.locator("text=Cold Room Capital Risk").count() > 0
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_04_page_product_intelligence.png"))
        print("  [Captured] canvas_04_page_product_intelligence.png")

        # -------------------------------------------------------------
        # PAGE 5: ACTIVITY & RECEIPTS (Test Tab Click)
        # -------------------------------------------------------------
        print("  [Page 5] Switching to Page 5: Activity & Receipts...")
        page.click("button:has-text('Activity & Receipts')")
        page.wait_for_selector("text=Invoice History & Counter Thermal Slips", timeout=8000)
        time.sleep(1.5)
        assert page.locator("text=Recent Collections & Settlements").count() > 0
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_05_page_activity_receipts.png"))
        print("  [Captured] canvas_05_page_activity_receipts.png")

        # Test Thermal Slip Modal trigger from Activity page
        if page.locator("button:has-text('Thermal')").count() > 0:
            print("  [Modal Test] Triggering 58mm Thermal Receipt modal from Activity Page...")
            page.locator("button:has-text('Thermal')").first.click()
            page.wait_for_selector("text=Counter Thermal Receipt", timeout=8000)
            time.sleep(1.5)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_06_thermal_slip_modal.png"))
            print("  [Captured] canvas_06_thermal_slip_modal.png")
            page.keyboard.press("Escape")
            time.sleep(0.5)

        # -------------------------------------------------------------
        # MOBILE VIEWPORT TEST (390x844)
        # -------------------------------------------------------------
        print("  [Mobile] Testing Mobile Viewport with Dot Navigation...")
        mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        mobile_page = mobile_ctx.new_page()
        mobile_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)
        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "canvas_07_mobile_paginated_overview.png"))
        print("  [Captured] canvas_07_mobile_paginated_overview.png")

        browser.close()
        print("\n[QA SUCCESS] ALL POWER BI CANVAS VERIFICATION TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_powerbi_canvas_tests()
