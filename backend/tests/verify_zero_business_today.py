import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\affra\.gemini\antigravity\brain\77a71a1d-aa25-40e9-828c-83a8fe686020"

MOCK_USER = {
    "id": "admin-1",
    "username": "admin",
    "role": "ADMIN",
    "full_name": "RAIS System Admin"
}

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        mock_dashboard_data = {
            "total_revenue_month": 45000.0,
            "total_outstanding": 38401.50,
            "total_overdue": 30007.50,
            "total_invoices_count": 0,
            "open_invoices_count": 5,
            "active_customers_count": 32,
            "total_products_count": 65,
            "overall_profit": 46485.10,
            "overall_loss": 0.0,
            "revenue_periods": {
                "today": {
                    "revenue": 0.0,
                    "invoices_count": 0,
                    "collections": 0.0,
                    "cash_collected": 0.0,
                    "upi_collected": 0.0,
                    "payments_count": 0,
                    "label": "Today"
                },
                "yesterday": {
                    "revenue": 11766.0,
                    "invoices_count": 12,
                    "collections": 3585.0,
                    "cash_collected": 18.0,
                    "upi_collected": 3585.0,
                    "payments_count": 6,
                    "label": "Yesterday"
                },
                "this_week": {
                    "revenue": 45000.0,
                    "invoices_count": 35,
                    "collections": 25000.0,
                    "cash_collected": 5000.0,
                    "upi_collected": 20000.0,
                    "payments_count": 20,
                    "label": "This Week"
                },
                "all_time": {
                    "revenue": 250000.0,
                    "invoices_count": 180,
                    "collections": 190000.0,
                    "cash_collected": 40000.0,
                    "upi_collected": 150000.0,
                    "payments_count": 120,
                    "label": "All Time"
                }
            },
            "today_comparison": {
                "today_revenue": 0.0,
                "yesterday_revenue": 11766.0,
                "today_collections": 0.0,
                "today_cash": 0.0,
                "today_upi": 0.0,
                "yesterday_collections": 3585.0,
                "diff_amount": -11766.0,
                "pct": -100.0,
                "trend": "down"
            },
            "daily_trend_7d": [
                {"date": "2026-10-16", "day_label": "Fri", "revenue": 8500.0, "collections": 4200.0},
                {"date": "2026-10-17", "day_label": "Sat", "revenue": 12400.0, "collections": 6100.0},
                {"date": "2026-10-18", "day_label": "Sun", "revenue": 9200.0, "collections": 3500.0},
                {"date": "2026-10-19", "day_label": "Mon", "revenue": 15000.0, "collections": 8000.0},
                {"date": "2026-10-20", "day_label": "Tue", "revenue": 14200.0, "collections": 7500.0},
                {"date": "2026-10-21", "day_label": "Wed", "revenue": 11766.0, "collections": 3585.0},
                {"date": "2026-10-22", "day_label": "Thu", "revenue": 0.0, "collections": 0.0}
            ],
            "recent_invoices": [
                # 12 invoices from yesterday (2026-10-21), none for today (2026-10-22)
                {
                    "id": f"inv-{i}",
                    "invoice_number": f"INV-20261021-{i:03d}",
                    "customer_name": f"Outlets Demo {i}",
                    "customer_id": f"cust-{i}",
                    "customer_city": "Rayachoty",
                    "customer_phone": "9347453135",
                    "invoice_date": "2026-10-21",
                    "total_amount": 980.50,
                    "outstanding_amount": 0.0,
                    "status": "PAID",
                    "items_preview": ["2x French Fries 6mm"]
                }
                for i in range(1, 13)
            ],
            "recent_payments": [
                {
                    "id": f"pay-{i}",
                    "payment_number": f"PAY-20261021-{i:03d}",
                    "customer_name": f"Outlets Demo {i}",
                    "customer_id": f"cust-{i}",
                    "payment_date": "2026-10-21",
                    "amount": 597.50,
                    "payment_method": "UPI"
                }
                for i in range(1, 7)
            ],
            "top_selling_products": [
                {
                    "product_id": "p-1",
                    "product_name": "MILKY MIST MOZZARELLA DICED CHEESE",
                    "sku": "RAIS-CHS-01",
                    "quantity_sold": 34,
                    "total_revenue": 30679.0,
                    "current_stock": 2,
                    "min_stock_alert": 10,
                    "category_id": "cat-dairy"
                }
            ]
        }

        def handle_route(route):
            url = route.request.url
            if "auth/login" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "access_token": "mock-token-xyz",
                    "token_type": "bearer",
                    "user": MOCK_USER
                }))
            elif "auth/me" in url or "users/me" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_USER))
            elif "reports/dashboard" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_dashboard_data))
            elif "categories" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([
                    {"id": "cat-dairy", "name": "Dairy & Cheese", "is_active": True}
                ]))
            elif "customers" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([
                    {"id": f"cust-{i}", "business_name": f"Outlets Demo {i}", "outstanding_balance": 1200.0, "status": "ACTIVE"}
                    for i in range(1, 10)
                ]))
            elif "analytics" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({}))
            else:
                route.fulfill(status=200, content_type="application/json", body=json.dumps([]))

        page.route("**/api/**", handle_route)

        print("Navigating to preview frontend...")
        page.goto("http://localhost:5173", timeout=30000, wait_until="networkidle")

        page.evaluate("""() => {
            localStorage.setItem('rais_token', 'mock-token-xyz');
            localStorage.setItem('rais_user', JSON.stringify({
                id: 'admin-1',
                username: 'admin',
                role: 'ADMIN',
                full_name: 'RAIS System Admin'
            }));
        }""")
        page.reload(wait_until="networkidle")
        time.sleep(1.5)

        # Screenshot 1: Today selected with Zero Business
        print("Capturing Today Slicer screenshot with 0 Business...")
        shot1 = os.path.join(ARTIFACT_DIR, "verified_zero_business_today.png")
        page.screenshot(path=shot1, full_page=False)

        page_content = page.content()
        assert "₹0.00" in page_content, "Expected ₹0.00 displayed for Today's Revenue and Collections!"
        assert "0 Bills" in page_content, "Expected '0 Bills' displayed on Revenue card!"
        assert "0 Rec" in page_content, "Expected '0 Rec' displayed on Collections card!"
        assert "No invoices recorded for this period." in page_content, "Expected empty state for Today's invoices!"

        print("SUCCESS! Today's Revenue correctly displays Rs.0.00 (0 Bills), Collections Rs.0.00 (0 Rec).", flush=True)

        # Now click 'Yesterday' to confirm multi-period slicer still displays yesterday's 12 bills and collections!
        print("Clicking 'Yesterday' slicer button...", flush=True)
        yest_btn = page.locator("button:has-text('Yesterday')").first
        yest_btn.click()
        time.sleep(1)

        shot2 = os.path.join(ARTIFACT_DIR, "verified_yesterday_business_12bills.png")
        page.screenshot(path=shot2, full_page=False)

        page_content_yest = page.content()
        assert "11,766.00" in page_content_yest, "Expected Rs.11,766.00 for Yesterday's Revenue!"
        assert "12 Bills" in page_content_yest, "Expected '12 Bills' on Yesterday's Revenue card!"
        assert "3,585.00" in page_content_yest, "Expected Rs.3,585.00 for Yesterday's Collections!"

        print("SUCCESS! Yesterday slicer correctly displays Rs.11,766.00 (12 Bills) and Rs.3,585.00 (6 Rec).", flush=True)

        # 3. Mobile Viewport Test (375x812 - iPhone)
        print("Testing Mobile Viewport (375x812)...", flush=True)
        mobile_page = browser.new_page(viewport={"width": 375, "height": 812})
        mobile_page.route("**/api/**", handle_route)
        mobile_page.goto("http://localhost:5173", timeout=30000, wait_until="networkidle")
        mobile_page.evaluate("""() => {
            localStorage.setItem('rais_token', 'mock-token-xyz');
            localStorage.setItem('rais_user', JSON.stringify({
                id: 'admin-1',
                username: 'admin',
                role: 'ADMIN',
                full_name: 'RAIS System Admin'
            }));
        }""")
        mobile_page.reload(wait_until="networkidle")
        time.sleep(1.5)

        shot3 = os.path.join(ARTIFACT_DIR, "verified_zero_business_today_mobile.png")
        mobile_page.screenshot(path=shot3, full_page=False)

        m_content = mobile_page.content()
        assert "₹0.00" in m_content, "Expected ₹0.00 in mobile view!"
        assert "0 Bills" in m_content, "Expected 0 Bills in mobile view!"
        print("SUCCESS! Mobile view displays zero business correctly.", flush=True)

        browser.close()

if __name__ == "__main__":
    run()
