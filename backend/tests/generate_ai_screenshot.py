import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\7c0063e9-3ed5-4cd3-8b52-0515e8cd26cc"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000")
    page.click("button:has-text('Sign In to Workspace')")
    page.wait_for_selector("text=Commercial Overview", timeout=10000)
    time.sleep(1)
    
    # Click AI button in header
    page.locator("header button:has-text('AI Assistant')").first.click()
    page.wait_for_selector("text=RAIS Business AI", timeout=10000)
    time.sleep(1)
    
    # Click quick prompt
    page.locator("button:has-text('What is our total outstanding balance?')").first.click()
    time.sleep(3)
    
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "qa_17_ai_assistant_live.png"))
    print("SUCCESS: Generated qa_17_ai_assistant_live.png")
    browser.close()
