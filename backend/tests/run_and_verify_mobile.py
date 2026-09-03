import os
import sys
import time
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def wait_for_service(url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status in [200, 404]:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def run_tour():
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=BACKEND_DIR
    )

    frontend_proc = subprocess.Popen(
        ["npx.cmd", "vite", "--port", "3000"],
        cwd=FRONTEND_DIR
    )

    wait_for_service("http://127.0.0.1:8001/docs", timeout=15)
    wait_for_service("http://127.0.0.1:3000", timeout=15)
    time.sleep(2)

    try:
        with sync_playwright() as p:
            iphone = p.devices['iPhone 14 Pro']
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(**iphone)
            page = context.new_page()

            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)

            # 1. Capture Mobile Login
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_01_login.png"))
            print("[1] Captured: mobile_01_login.png")

            # 2. Login as Administrator
            page.fill("input[placeholder='Enter username']", "admin")
            page.fill("input[placeholder='Enter password']", "RaisAdmin@2026")
            time.sleep(0.5)
            page.click("button[type='submit']")
            page.wait_for_selector("nav.md\\:hidden", timeout=10000)
            time.sleep(2)

            # 3. Capture Mobile Dashboard
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_02_dashboard.png"))
            print("[2] Captured: mobile_02_dashboard.png")

            # 4. Outlets Tab
            page.locator("nav.md\\:hidden button:has-text('Outlets')").click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_03_outlets.png"))
            print("[3] Captured: mobile_03_outlets.png")

            # 5. Catalogue Tab
            page.locator("nav.md\\:hidden button:has-text('Catalogue')").click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_04_catalogue.png"))
            print("[4] Captured: mobile_04_catalogue.png")

            # 6. Inventory Tab
            page.locator("nav.md\\:hidden button:has-text('Inventory')").click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_05_inventory.png"))
            print("[5] Captured: mobile_05_inventory.png")

            # 7. AI Co-Pilot Tab
            page.locator("nav.md\\:hidden button:has-text('AI Co-Pilot')").click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_06_ai.png"))
            print("[6] Captured: mobile_06_ai.png")

            browser.close()
            print("\n[SUCCESS] All mobile viewport screenshots captured successfully!")
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    run_tour()
