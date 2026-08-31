import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def verify_sidebar_toggle_loaded():
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
                time.sleep(3)

            # Navigate to Customers Page
            page.locator("button:has-text('Customers')").first.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_pinned_open.png"))
            print("[1] Captured: sidebar_pinned_open.png")

            # Click Top-Left Toggle Bar to Collapse Sidebar
            toggle_btn = page.locator("button[title*='Collapse Navigation Panel'], button[title*='Collapse Panel']").first
            toggle_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_collapsed_fullscreen.png"))
            print("[2] Captured: sidebar_collapsed_fullscreen.png")

            # Hover near top-left corner hotspot (0, 0)
            page.mouse.move(15, 15)
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_hover_peek.png"))
            print("[3] Captured: sidebar_hover_peek.png")

            browser.close()
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    verify_sidebar_toggle_loaded()
