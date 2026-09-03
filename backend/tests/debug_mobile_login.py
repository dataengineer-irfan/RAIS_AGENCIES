import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def debug_mobile():
    with sync_playwright() as p:
        iphone = p.devices['iPhone 14 Pro']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone)
        page = context.new_page()

        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "debug_login_before.png"))

        # Click Administrator
        page.click("button:has-text('Administrator')")
        time.sleep(0.5)
        page.click("button[type='submit']")
        time.sleep(3)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "debug_login_after.png"))

        browser.close()

if __name__ == "__main__":
    debug_mobile()
