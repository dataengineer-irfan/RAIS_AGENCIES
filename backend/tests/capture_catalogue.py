import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def capture_catalogue_fixed():
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

    time.sleep(5)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            page.goto("http://localhost:3000", wait_until="networkidle")
            time.sleep(1)
            if page.locator("button:has-text('Administrator')").count() > 0:
                page.click("button:has-text('Administrator')")
                time.sleep(0.5)
                page.click("button[type='submit']")
                page.wait_for_load_state("networkidle")
                time.sleep(2)

            page.locator("button:has-text('Catalogue')").first.click()
            time.sleep(3)
            # Wait for data table rows to render
            page.wait_for_selector("tr:has-text('SKUs')", timeout=8000)
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_fixed_summary.png"))
            print("  -> Captured: catalogue_fixed_summary.png")
            browser.close()
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    capture_catalogue_fixed()
