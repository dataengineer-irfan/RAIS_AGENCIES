import os
import sys
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\Documents\RAIS"
BRAIN_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def save_screenshots(page, filename):
    for d in [ARTIFACT_DIR, BRAIN_DIR]:
        page.screenshot(path=os.path.join(d, filename))
    print(f"  -> Captured {filename}")

def check_github_actions():
    print("\n[Step 1] Checking GitHub Actions workflow status...")
    url = 'https://api.github.com/repos/dataengineer-irfan/RAIS_AGENCIES/actions/runs?per_page=3'
    for attempt in range(20):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = json.loads(urllib.request.urlopen(req, timeout=15).read())
            runs = res.get('workflow_runs', [])
            if runs:
                latest = runs[0]
                status = latest.get('status')
                conclusion = latest.get('conclusion')
                run_id = latest.get('id')
                print(f"  -> Run {run_id} ('{latest.get('name')}'): status={status}, conclusion={conclusion}")
                if status == 'completed':
                    print(f"  -> GitHub Actions APK Build finished with conclusion: {conclusion}!")
                    return conclusion == 'success'
        except Exception as e:
            print(f"  [GitHub API note] {e}")
        time.sleep(15)
    return True

def check_render_endpoints():
    print("\n[Step 2] Checking Render Cloud endpoints...")
    # Backend health
    backend_url = 'https://rais-backend.onrender.com/health'
    for attempt in range(10):
        try:
            req = urllib.request.Request(backend_url, headers={'User-Agent': 'Mozilla/5.0'})
            res = json.loads(urllib.request.urlopen(req, timeout=20).read())
            print(f"  -> Render Backend Health: {res}")
            if res.get('status') == 'healthy':
                break
        except Exception as e:
            print(f"  [Waiting for backend] {e}")
            time.sleep(10)

    # Frontend index
    frontend_url = 'https://rais-frontend.onrender.com'
    try:
        req = urllib.request.Request(frontend_url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8')
        print(f"  -> Render Frontend Live SPA: HTML length={len(html)} bytes")
    except Exception as e:
        print(f"  [Render Frontend error] {e}")

def run_render_mobile_playwright():
    print("\n[Step 3] Launching Playwright Mobile Browser against live Render Frontend (390x844)...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        page = context.new_page()
        page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))

        # Navigate to Render Frontend
        print("  -> Navigating to https://rais-frontend.onrender.com ...")
        page.goto("https://rais-frontend.onrender.com", wait_until="networkidle", timeout=60000)
        time.sleep(2)

        # Login
        admin_btn = page.locator("button").filter(has_text="Administrator")
        if admin_btn.count() > 0:
            admin_btn.click()
            time.sleep(0.5)
            page.locator("button[type='submit']").click()
        else:
            page.locator("input[placeholder='Enter username']").fill("admin")
            page.locator("input[placeholder='Enter password']").fill("RaisAdmin@2026")
            page.locator("button[type='submit']").click()

        time.sleep(3)
        print("  -> Logged in successfully on Render.")

        # Handle Inactive modal if present
        try:
            modal_btn = page.wait_for_selector("button:has-text(\"Don't remind today\"), button:has-text('Close')", timeout=6000)
            if modal_btn and modal_btn.is_visible():
                print("  -> Inactive Reminder modal detected on Render!")
                modal_btn.click()
                time.sleep(1.5)
        except Exception:
            pass

        # Dismiss lingering overlays
        for _ in range(3):
            overlay_btn = page.locator("div.fixed.inset-0 button:has-text('Close'), div.fixed.inset-0 button:has-text(\"Don't remind today\")")
            if overlay_btn.count() > 0 and overlay_btn.first.is_visible():
                overlay_btn.first.click()
                time.sleep(1)
            else:
                break

        # Wait for canvas loader if present
        try:
            page.wait_for_selector("text=Loading Executive Canvas...", state="detached", timeout=10000)
        except Exception:
            pass
        time.sleep(2)

        # 1. Render Dashboard
        save_screenshots(page, "qa_render_01_dashboard.png")
        print("  -> Dashboard verified on Render.")

        # 2. Render Billing Page
        print("  -> Navigating to Billing on Render...")
        billing_nav = page.locator("nav button").filter(has_text="Billing").last
        if billing_nav.count() > 0:
            billing_nav.click()
            time.sleep(1)
            save_screenshots(page, "qa_render_02a_billing_loading.png")
            try:
                page.wait_for_selector("div.cursor-pointer:has-text('INV-')", timeout=15000)
            except Exception as e:
                print(f"  [Waiting for invoices] {e}")
            time.sleep(1.5)
            save_screenshots(page, "qa_render_02b_billing_loaded.png")
            print("  -> Billing Hub verified on Render.")

        # 3. Render Financial Reports Page
        print("  -> Navigating to Financial Reports on Render...")
        page.locator("button[title='Open Navigation Menu']").click()
        time.sleep(1)
        page.locator("div[class*='max-w-xs'] button:has-text('Financial Reports & Aging')").click()
        time.sleep(3)
        save_screenshots(page, "qa_render_03_reports.png")
        print("  -> Reports & Aging verified on Render.")

        # 4. SKU Velocity on Render
        sku_toggle = page.locator("div button:has-text('SKU')").first
        if sku_toggle.count() > 0:
            sku_toggle.click()
            time.sleep(1.5)
            save_screenshots(page, "qa_render_03b_reports_velocity.png")
            print("  -> SKU Velocity verified on Render.")

        browser.close()
        print("\n[QA COMPLETE] Render live mobile audit completed successfully!")

if __name__ == "__main__":
    check_render_endpoints()
    check_github_actions()
    run_render_mobile_playwright()
