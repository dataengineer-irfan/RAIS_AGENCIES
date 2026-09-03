import os
import sys
import time
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def wait_for_service(url, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    print(f"Service ready at {url}")
                    return True
        except Exception:
            time.sleep(0.5)
    print(f"Warning: Timed out waiting for {url}")
    return False

def capture_mobile_showcase():
    print("\n=======================================================")
    print("[START] CAPTURING COMPLETE MOBILE SHOWCASE (IPHONE 14)")
    print("=======================================================\n")

    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=BACKEND_DIR
    )

    frontend_proc = subprocess.Popen(
        ["npx.cmd", "vite", "--port", "3000"],
        cwd=FRONTEND_DIR
    )

    print("Waiting for backend & frontend to initialize...")
    wait_for_service("http://127.0.0.1:8001/api/openapi.json", timeout=30)
    wait_for_service("http://127.0.0.1:3000", timeout=30)
    time.sleep(2)

    try:
        with sync_playwright() as p:
            iphone = p.devices['iPhone 14 Pro']
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(**iphone)
            page = context.new_page()

            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)

            # 1. Login Page
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_01_login.png"))
            print("[1] Captured: mobile_01_login.png")

            # 2. Login as admin
            page.fill("input[placeholder='Enter username']", "admin")
            page.fill("input[placeholder='Enter password']", "RaisAdmin@2026")
            time.sleep(0.5)
            page.click("button[type='submit']")

            # Wait for main screen & bottom nav
            page.wait_for_selector("nav.md\\:hidden", timeout=15000)
            
            # Wait for Dashboard to finish loading
            try:
                page.wait_for_selector("text=Loading Executive Canvas...", state="detached", timeout=10000)
            except Exception:
                pass
            time.sleep(3)

            # 2. Dashboard
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_02_dashboard.png"))
            print("[2] Captured: mobile_02_dashboard.png")

            # 3. Outlets (Customers)
            page.locator("nav.md\\:hidden button:has-text('Outlets')").click()
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_03_outlets.png"))
            print("[3] Captured: mobile_03_outlets.png")

            # 4. Catalogue
            page.locator("nav.md\\:hidden button:has-text('Catalogue')").click()
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_04_catalogue.png"))
            print("[4] Captured: mobile_04_catalogue.png")

            # 5. Inventory
            page.locator("nav.md\\:hidden button:has-text('Inventory')").click()
            time.sleep(3)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_05_inventory.png"))
            print("[5] Captured: mobile_05_inventory.png")

            # 6. Billing
            page.locator("nav.md\\:hidden button:has-text('Billing')").click()
            time.sleep(1)
            try:
                page.wait_for_selector(".animate-pulse", state="detached", timeout=8000)
            except Exception:
                pass
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_06_billing.png"))
            print("[6] Captured: mobile_06_billing.png")

            # 7. AI Co-Pilot
            page.locator("nav.md\\:hidden button:has-text('AI Co-Pilot')").click()
            time.sleep(2)
            if page.locator("button:has-text('French Fries & Momos Pricing')").count() > 0:
                page.locator("button:has-text('French Fries & Momos Pricing')").click()
                time.sleep(4)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_07_ai_copilot.png"))
            print("[7] Captured: mobile_07_ai_copilot.png")

            browser.close()
            print("\n[SUCCESS] All mobile showcase screenshots captured successfully!")
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    capture_mobile_showcase()
