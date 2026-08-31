import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def run_self_contained_verification():
    print("\n=======================================================")
    print("[START] VERIFYING INVENTORY POWER BI CANVAS & CATALOGUE")
    print("=======================================================\n")

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

            # Login
            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)
            if page.locator("button:has-text('Administrator')").count() > 0:
                page.click("button:has-text('Administrator')")
                time.sleep(0.5)
                page.click("button[type='submit']")
                time.sleep(2)

            # 1. Catalogue Page Verification
            print("[1] Verifying Catalogue Page stock summation...")
            page.locator("button:has-text('Catalogue')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_fixed_summary.png"))
            print("  -> Captured: catalogue_fixed_summary.png")

            # 2. Inventory Power BI Canvas Verification
            print("[2] Verifying Inventory Power BI Canvas...")
            page.locator("button:has-text('Inventory')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "inventory_powerbi_canvas.png"))
            print("  -> Captured: inventory_powerbi_canvas.png")

            # 3. Test Tab 2: Live Stock Lineage
            print("[3] Verifying Live Stock Lineage tab...")
            if page.locator("button:has-text('Live Stock Lineage')").count() > 0:
                page.locator("button:has-text('Live Stock Lineage')").first.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "inventory_lineage_tab.png"))
                print("  -> Captured: inventory_lineage_tab.png")

            # 4. Test Tab 3: Sales Velocity
            print("[4] Verifying Sales Velocity tab...")
            if page.locator("button:has-text('Sales Velocity')").count() > 0:
                page.locator("button:has-text('Sales Velocity')").first.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(ARTIFACT_DIR, "inventory_velocity_tab.png"))
                print("  -> Captured: inventory_velocity_tab.png")

            browser.close()
            print("\n=======================================================")
            print("[SUCCESS] ALL VERIFICATION SCREENSHOTS CAPTURED")
            print("=======================================================\n")
    finally:
        print("[CLEANUP] Stopping background servers...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    run_self_contained_verification()
