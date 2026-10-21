import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def verify_dropdown():
    print("Testing Customer Dropdown in New Invoice Modal...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1.5
        )
        page = context.new_page()

        print("Navigating to https://rais-frontend.onrender.com...")
        page.goto("https://rais-frontend.onrender.com", timeout=60000, wait_until="networkidle")

        print("Signing in as admin...")
        if page.locator("input[placeholder='Enter username']").count() > 0:
            page.fill("input[placeholder='Enter username']", "admin")
            page.fill("input[placeholder='Enter password']", "RaisAdmin@2026")
            page.click("button[type='submit']")

        print("Waiting for dashboard...")
        page.wait_for_function("() => !document.body.innerText.includes('Loading Executive Canvas')", timeout=45000)
        time.sleep(2)

        # Open New Invoice Modal via the sidebar or top button
        print("Clicking '+ CREATE INVOICE' button...")
        page.click("button:has-text('CREATE INVOICE')")
        time.sleep(2)

        # Wait for modal to be visible
        page.wait_for_selector("text=New Invoice", timeout=10000)
        time.sleep(1)

        # Screenshot the Customer dropdown container inside the modal
        cust_select = page.locator(".fixed.inset-0 select").first
        cust_select.scroll_into_view_if_needed()
        time.sleep(1)

        screenshot_path = os.path.join(ARTIFACT_DIR, "customer_dropdown_fixed.png")
        page.screenshot(path=screenshot_path)
        print(f"Saved modal screenshot to {screenshot_path}")

        # Check select styles
        computed = cust_select.evaluate("""(sel) => {
            const style = window.getComputedStyle(sel);
            const firstOpt = sel.querySelectorAll('option')[1];
            const optStyle = firstOpt ? window.getComputedStyle(firstOpt) : null;
            return {
                selectBg: style.backgroundColor,
                selectColor: style.color,
                selectBorder: style.borderColor,
                optionBg: optStyle ? optStyle.backgroundColor : null,
                optionColor: optStyle ? optStyle.color : null,
                firstCustomerText: firstOpt ? firstOpt.innerText : null
            };
        }""")
        print("Computed Styles:", computed)

if __name__ == "__main__":
    verify_dropdown()
