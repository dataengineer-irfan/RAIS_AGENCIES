import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000")
    page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
    page.click("button:has-text('Sign In to Workspace')")
    page.wait_for_selector("text=Commercial Overview", timeout=10000)
    
    # Go to catalogue
    page.locator("aside nav button:has-text('Catalogue')").first.click()
    page.wait_for_selector("text=Authoritative RAIS Agencies Catalogue", timeout=10000)
    time.sleep(2)
    
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalogue_07_grid_loaded.png"))
    print("SUCCESS: Captured catalogue_07_grid_loaded.png")
    browser.close()
