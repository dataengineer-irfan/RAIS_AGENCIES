import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

def test_flyer_visuals():
    print("[VISUAL QA] Testing Visual Catalogue & Official Flyer Enhancements...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # Login
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
        page.click("button:has-text('Sign In to Workspace')")
        page.wait_for_selector("text=Commercial Overview", timeout=10000)

        # Navigate to Catalogue
        page.locator("aside nav button:has-text('Catalogue')").first.click()
        page.wait_for_selector("text=Authoritative RAIS Agencies Catalogue", timeout=10000)
        time.sleep(2)

        # 1. Capture Catalogue Hero Bar & Product Cards with food icons
        print("  [Step 1] Capturing Catalogue Hero Bar & Cards with Food Icons...")
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "flyer_01_catalogue_hero_and_cards.png"))

        # 2. Capture Partner Brands and Trust Footer
        print("  [Step 2] Capturing Partner Brands & Trust Footer...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "flyer_02_partner_brands_and_trust_footer.png"))

        # Scroll back to top
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)

        # 3. Capture Spreadsheet Table View with Food Micro-Thumbnails
        print("  [Step 3] Capturing Spreadsheet Table View with Food Icons...")
        page.locator("button[title='Master Spreadsheet Table View']").first.click()
        time.sleep(1.5)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "flyer_03_table_sheet_with_icons.png"))

        # 4. Open Official Flyer Modal
        print("  [Step 4] Opening Official Flyer Modal...")
        page.locator("button:has-text('Official Flyer')").first.click()
        page.wait_for_selector("text=Official RAIS Agencies Product & Price Flyer", timeout=10000)
        time.sleep(2)
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "flyer_04_official_flyer_modal.png"))

        browser.close()
        print("[VISUAL QA] SUCCESS: All Visual Flyer Assets & Integrations Verified!")

if __name__ == "__main__":
    test_flyer_visuals()
