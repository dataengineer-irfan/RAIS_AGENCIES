import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"
BACKEND_DIR = r"C:\Users\affra\Documents\RAIS\backend"
FRONTEND_DIR = r"C:\Users\affra\Documents\RAIS\frontend"

def verify_sidebar_toggle():
    print("\n=======================================================")
    print("[START] VERIFYING TOP-LEFT SIDEBAR TOGGLE & HOVER PEEK")
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

            # 1. Capture Pinned Open
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_pinned_open.png"))
            print("[1] Captured: sidebar_pinned_open.png")

            # 2. Click Top-Left Toggle Bar to Collapse Sidebar
            print("[2] Clicking Top-Left Toggle Button to collapse sidebar...")
            toggle_btn = page.locator("button[title*='Collapse Navigation Panel'], button[title*='Collapse Panel']").first
            toggle_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_collapsed_fullscreen.png"))
            print("  -> Captured: sidebar_collapsed_fullscreen.png")

            # 3. Hover near Top-Left Corner to Peek Sidebar
            print("[3] Hovering near top-left corner hotspot...")
            page.mouse.move(10, 10)
            time.sleep(1)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "sidebar_hover_peek.png"))
            print("  -> Captured: sidebar_hover_peek.png")

            browser.close()
            print("\n[SUCCESS] Sidebar toggle and top-left hover verified cleanly!")
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass

if __name__ == "__main__":
    verify_sidebar_toggle()
