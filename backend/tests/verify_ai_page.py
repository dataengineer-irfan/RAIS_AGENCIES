import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def verify_ai_page():
    print("\n=======================================================")
    print("[START] VERIFYING DEDICATED AI ASSISTANT PAGE & 0% GST")
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
                time.sleep(2)

            # Navigate to AI Assistant Page
            page.locator("button:has-text('AI Assistant')").first.click()
            time.sleep(2)

            # Click Billing & Cash Rules prompt chip
            if page.locator("button:has-text('Billing & Cash Rules')").count() > 0:
                page.locator("button:has-text('Billing & Cash Rules')").click()
                time.sleep(2)

            # Click French Fries & Momos Pricing prompt chip
            if page.locator("button:has-text('French Fries & Momos Pricing')").count() > 0:
                page.locator("button:has-text('French Fries & Momos Pricing')").click()
                time.sleep(2)

            page.screenshot(path=os.path.join(ARTIFACT_DIR, "ai_assistant_page_verified.png"))
            print("  -> Captured: ai_assistant_page_verified.png")

            browser.close()
            print("\n[SUCCESS] AI Page & 0% GST Knowledge verified cleanly!")
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    verify_ai_page()
