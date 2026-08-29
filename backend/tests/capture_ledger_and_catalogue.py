import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://localhost:3000")
    page.wait_for_selector("text=RAIS AGENCIES", timeout=10000)
    page.click("button:has-text('Sign In to Workspace')")
    page.wait_for_selector("text=Commercial Overview", timeout=10000)

    # Customers page
    page.click("aside button:has-text('Customers')")
    page.wait_for_selector("text=Royal Fast Food & Burgers", timeout=10000)
    time.sleep(1)
    
    # Click Royal Fast Food (last ledger history button)
    page.get_by_role("button", name="Ledger History").last.click()
    page.wait_for_selector("text=Chronological Statement", timeout=10000)
    page.wait_for_selector("text=INV-202608-00001", timeout=10000)
    time.sleep(1.5)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_07_customer_ledger.png"))

    # Catalogue Page
    page.click("button:has-text('Close Statement')")
    time.sleep(0.5)
    page.click("aside button:has-text('Catalogue')")
    page.wait_for_selector("text=Authoritative RAIS Agencies Catalogue", timeout=10000)
    page.wait_for_selector("text=HUP HUP FRENCH FRIES", timeout=10000)
    time.sleep(2)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "screenshot_08_catalogue.png"))

    browser.close()
    print("Ledger and Catalogue screenshots captured successfully!")
