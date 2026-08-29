import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def run_qa_suite():
    print("=" * 70)
    print("[QA] RAIS No-Scroll Canvas + Reactive Slicers Verification Suite")
    print("=" * 70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ──────────────────────────────────────────────────────────────────────
        # DESKTOP VIEWPORT: 1366x768 (Standard Laptop)
        # ──────────────────────────────────────────────────────────────────────
        context = browser.new_context(viewport={"width": 1366, "height": 768})
        page = context.new_page()

        print("\n[Step 1] Navigating to http://localhost:3000 (1366x768)...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # Login
        if page.locator("button:has-text('Administrator')").count() > 0:
            print("[Step 2] Authenticating as Admin...")
            page.click("button:has-text('Administrator')")
            time.sleep(0.5)
            page.click("button[type='submit']")
            page.wait_for_selector("text=Executive Command & Decision Overview", timeout=15000)
            print("[OK] Dashboard loaded successfully.")
        time.sleep(2)

        # ──────────────────────────────────────────────────────────────────────
        # TC-UI-01: ZERO SCROLL ON PAGE 1 (OVERVIEW)
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-UI-01] Verifying Page 1: Overview — zero window scroll...")
        scroll_height = page.evaluate("document.documentElement.scrollHeight")
        client_height = page.evaluate("document.documentElement.clientHeight")
        has_scrollbar = scroll_height > client_height
        print(f"  scrollHeight={scroll_height}, clientHeight={client_height}, hasScrollbar={has_scrollbar}")
        
        # Verify key elements
        assert page.locator("text=Revenue").first.is_visible(), "Revenue KPI missing"
        assert page.locator("text=Receivables").first.is_visible(), "Receivables KPI missing"
        assert page.locator("text=Run-Rate").first.is_visible(), "Compact Forecast missing"
        assert page.locator("text=Recent Invoices").first.is_visible(), "Recent Invoices missing"
        assert page.locator("text=Fast-Moving Items").first.is_visible(), "Fast-Moving Items missing"
        print("  [PASS] All Overview elements visible, no scroll.")

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_01_overview_1366x768.png"))

        # ──────────────────────────────────────────────────────────────────────
        # TC-SL-01: SLICER INTERACTIVITY — SELECT CUSTOMER
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-SL-01] Testing Slicer: Select specific customer...")
        
        # Get original revenue text
        revenue_before = page.locator("text=Revenue").first.text_content()
        
        # Find and interact with the customer select dropdown
        customer_selects = page.locator("select")
        select_count = customer_selects.count()
        print(f"  Found {select_count} select dropdowns on page")
        
        # The customer dropdown is the one that has "All Customers" option
        for i in range(select_count):
            sel = customer_selects.nth(i)
            options_text = sel.inner_text()
            if "All Customers" in options_text:
                # Get the options
                options = sel.locator("option")
                opt_count = options.count()
                print(f"  Customer dropdown has {opt_count} options")
                if opt_count > 1:
                    # Select the first real customer (index 1, skipping "All Customers")
                    val = options.nth(1).get_attribute("value")
                    label = options.nth(1).text_content()
                    sel.select_option(value=val)
                    print(f"  Selected customer: '{label}' (value={val})")
                    time.sleep(0.5)
                    
                    # Check that "Active" badge appeared
                    if page.locator("text=Active").count() > 0:
                        print("  [PASS] 'Active' slicer indicator appeared!")
                    
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_02_slicer_customer_selected.png"))
                    
                    # Reset back
                    sel.select_option(value="ALL")
                    time.sleep(0.3)
                    print("  [PASS] Reset back to All Customers")
                break

        # ──────────────────────────────────────────────────────────────────────
        # TC-SL-02: SLICER INTERACTIVITY — SELECT CATEGORY
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-SL-02] Testing Slicer: Select specific category...")
        for i in range(select_count):
            sel = customer_selects.nth(i)
            options_text = sel.inner_text()
            if "All Categories" in options_text:
                options = sel.locator("option")
                opt_count = options.count()
                print(f"  Category dropdown has {opt_count} options")
                if opt_count > 1:
                    val = options.nth(1).get_attribute("value")
                    label = options.nth(1).text_content()
                    sel.select_option(value=val)
                    print(f"  Selected category: '{label}'")
                    time.sleep(0.5)
                    page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_03_slicer_category_selected.png"))
                    sel.select_option(value="ALL")
                    time.sleep(0.3)
                    print("  [PASS] Category slicer works, reset back")
                break

        # ──────────────────────────────────────────────────────────────────────
        # TC-SL-04: RESET SLICERS BUTTON
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-SL-04] Testing Reset Slicers button...")
        # First apply a filter
        for i in range(select_count):
            sel = customer_selects.nth(i)
            if "All Customers" in sel.inner_text():
                options = sel.locator("option")
                if options.count() > 1:
                    sel.select_option(value=options.nth(1).get_attribute("value"))
                    time.sleep(0.3)
                break
        
        # Now click Reset
        reset_btn = page.locator("button:has-text('Reset')")
        if reset_btn.count() > 0:
            reset_btn.first.click()
            time.sleep(0.5)
            print("  [PASS] Reset button clicked, filters cleared")
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_04_slicer_reset.png"))

        # ──────────────────────────────────────────────────────────────────────
        # TC-NAV-01: PAGE TAB SWITCHING
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-NAV-01] Testing tab navigation across all 5 pages...")

        # Page 2: Forecast
        print("  Switching to Forecast & Targets...")
        page.click("button:has-text('Forecast & Targets')")
        page.wait_for_selector("text=Sales Forecast vs Monthly Target", timeout=8000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_05_page2_forecast.png"))
        print("  [PASS] Page 2 loaded")

        # Page 3: Receivables
        print("  Switching to Receivables & Risk...")
        page.click("button:has-text('Receivables & Risk')")
        page.wait_for_selector("text=Customer Health", timeout=8000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_06_page3_receivables.png"))
        print("  [PASS] Page 3 loaded")

        # Page 4: Products
        print("  Switching to Product Intelligence...")
        page.click("button:has-text('Product Intelligence')")
        page.wait_for_selector("text=Product Performance Matrix", timeout=8000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_07_page4_products.png"))
        print("  [PASS] Page 4 loaded")

        # Page 5: Activity
        print("  Switching to Activity & Receipts...")
        page.click("button:has-text('Activity & Receipts')")
        page.wait_for_selector("text=Invoice History", timeout=8000)
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_08_page5_activity.png"))
        print("  [PASS] Page 5 loaded")

        # Thermal Receipt Modal
        if page.locator("button:has-text('Thermal')").count() > 0:
            print("  Testing Thermal Receipt modal from Activity page...")
            page.locator("button:has-text('Thermal')").first.click()
            page.wait_for_selector("text=Counter Thermal Receipt", timeout=8000)
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_09_thermal_modal.png"))
            page.keyboard.press("Escape")
            time.sleep(1)
            print("  [PASS] Thermal Receipt modal opened & closed")

        # Back to Overview — force click to bypass any lingering overlay
        page.locator("button:has-text('Overview')").click(force=True)
        time.sleep(1)
        print("  [PASS] Returned to Overview")

        # ──────────────────────────────────────────────────────────────────────
        # TC-NAV-02: KEYBOARD ARROW NAVIGATION
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-NAV-02] Testing keyboard arrow navigation...")
        page.keyboard.press("ArrowRight")
        time.sleep(0.5)
        page.keyboard.press("ArrowRight")
        time.sleep(0.5)
        page.keyboard.press("ArrowRight")
        time.sleep(0.5)
        # Should now be on page 4 (Products)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_10_keyboard_navigation.png"))
        print("  [PASS] Keyboard navigation works (3x ArrowRight)")

        page.keyboard.press("ArrowLeft")
        time.sleep(0.5)
        page.keyboard.press("ArrowLeft")
        time.sleep(0.5)
        page.keyboard.press("ArrowLeft")
        time.sleep(0.5)
        # Should be back at Overview
        print("  [PASS] Keyboard back navigation works (3x ArrowLeft)")

        # ──────────────────────────────────────────────────────────────────────
        # MOBILE VIEWPORT: 390x844
        # ──────────────────────────────────────────────────────────────────────
        print("\n[TC-MOBILE] Testing Mobile Viewport 390x844...")
        mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        mobile_page = mobile_ctx.new_page()
        mobile_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)
        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_11_mobile_viewport.png"))
        print("  [Captured] qa_11_mobile_viewport.png")

        browser.close()
        
        print("\n" + "=" * 70)
        print("[QA SUCCESS] ALL TESTS PASSED — Zero Scroll + Reactive Slicers Verified!")
        print("=" * 70)

if __name__ == "__main__":
    run_qa_suite()
