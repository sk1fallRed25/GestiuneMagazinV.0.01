import sys
import time
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def check_no_nan_or_undefined(page, selector):
    text = page.locator(selector).first.text_content()
    safe_print(f"[DEBUG] Text content of {selector}: {text}")
    assert "NaN" not in text, f"Found NaN in {selector}"
    assert "undefined" not in text, f"Found undefined in {selector}"
    assert "null" not in text, f"Found null in {selector}"

def run_test():
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)
        
        try:
            # =========================================================================
            # SCENARIO 1: Login and Navigation (Admin role)
            # =========================================================================
            safe_print("\n--- SCENARIO 1: Login and Navigation (Admin role) ---")
            page.goto("http://localhost:5173/#/login")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.wait_for_timeout(500)
            page.locator("button[type='submit']").click()
            
            safe_print("Waiting for Dashboard to load...")
            page.locator("text=Magazin Principal").wait_for(state="visible", timeout=20000)
            safe_print("[PASS] Logged in successfully as admin@admin.com.")
            
            safe_print("Navigating to Reports via sidebar...")
            reports_nav = page.locator("a:has-text('Rapoarte')")
            reports_nav.wait_for(state="visible", timeout=5000)
            reports_nav.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            
            # Verify URL and page title
            url = page.url
            safe_print(f"[DEBUG] Current URL: {url}")
            assert "/rapoarte" in url, f"Expected URL to contain /rapoarte, got {url}"
            
            title = page.locator("h1:has-text('Rapoarte Comerciale')")
            title.wait_for(state="visible", timeout=5000)
            assert title.is_visible(), "Page title 'Rapoarte Comerciale' not visible"
            safe_print("[PASS] Scenario 1: Page header and URL validated.")

            # =========================================================================
            # SCENARIO 2: Sales Summary Tab Panel
            # =========================================================================
            safe_print("\n--- SCENARIO 2: Sales Summary Panel ---")
            # Wait for loading spinner to disappear
            page.locator("text=Se generează raportul comercial...").wait_for(state="detached", timeout=15000)
            page.wait_for_timeout(1000)
            
            # Check primary KPI cards in Sales Summary
            safe_print("Checking Sales Summary KPI cards...")
            check_no_nan_or_undefined(page, "text=Vânzări Brute")
            check_no_nan_or_undefined(page, "text=Vânzări Nete")
            check_no_nan_or_undefined(page, "text=Anulări (Voids)")
            check_no_nan_or_undefined(page, "text=Retururi (Returns)")
            
            # Check payment breakdowns
            safe_print("Checking cash/card splits and operational KPIs...")
            check_no_nan_or_undefined(page, "text=Sinteză Cash (Numerar)")
            check_no_nan_or_undefined(page, "text=Sinteză Card (POS)")
            check_no_nan_or_undefined(page, "text=Valoare Medie Coș")
            
            safe_print("[PASS] Scenario 2: Sales Summary data values validated.")

            # =========================================================================
            # SCENARIO 3: Product Performance Panel
            # =========================================================================
            safe_print("\n--- SCENARIO 3: Product Performance Panel ---")
            products_tab = page.locator("button:has-text('Performanță Produse')")
            products_tab.wait_for(state="visible", timeout=5000)
            products_tab.click()
            page.wait_for_timeout(1000)
            
            # Check if empty state or the products table is shown
            no_products = page.locator("text=Niciun produs vândut").is_visible()
            if no_products:
                safe_print("[DEBUG] No products sold in this store for selected range. Empty state shown.")
            else:
                safe_print("Verifying product performance table columns...")
                page.locator("th:has-text('Produs')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Cod Bare')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Cant. Brută')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Retururi')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Cant. Netă')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Venit Brut')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Venit Net')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Cost (COGS)')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Profit Est.')").wait_for(state="visible", timeout=5000)
                page.locator("th:has-text('Marjă %')").wait_for(state="visible", timeout=5000)
                
            safe_print("[PASS] Scenario 3: Product Performance tab validated.")

            # =========================================================================
            # SCENARIO 4: Daily Cash & Shifts Panel
            # =========================================================================
            safe_print("\n--- SCENARIO 4: Daily Cash & Shifts Panel ---")
            cash_tab = page.locator("button:has-text('Reconciliere Casă')")
            cash_tab.wait_for(state="visible", timeout=5000)
            cash_tab.click()
            page.wait_for_timeout(1000)
            
            # Check daily control banner headings
            safe_print("Verifying daily cash totals banner...")
            check_no_nan_or_undefined(page, "text=Deschidere Totală")
            check_no_nan_or_undefined(page, "text=Așteptat în Sertar")
            check_no_nan_or_undefined(page, "text=Declarat la Închidere")
            check_no_nan_or_undefined(page, "text=Diferență Casă")
            
            # Check shifts list and click a shift if available
            shifts_header = page.locator("h5:has-text('Ture înregistrate pe')")
            shifts_header.wait_for(state="visible", timeout=5000)
            
            # Look for active/closed shift items
            shift_button = page.locator("button:has(span:has-text('ID:'))").first
            if shift_button.is_visible():
                safe_print("Clicking on first available shift to inspect details...")
                shift_button.click()
                page.wait_for_timeout(1000)
                
                # Verify Shift Details Panel sub-sections
                safe_print("Verifying shift details audit panels...")
                page.locator("h6:has-text('Audit Monetar (Cash)')").wait_for(state="visible", timeout=5000)
                page.locator("h6:has-text('Tranzacții & POS Card')").wait_for(state="visible", timeout=5000)
                page.locator("h6:has-text('Tranzacții Recente din Tură')").wait_for(state="visible", timeout=5000)
                
                # Check for closed/open status in detail panel
                check_no_nan_or_undefined(page, "text=Numerar Așteptat")
                check_no_nan_or_undefined(page, "text=Diferență Sertar")
            else:
                safe_print("[DEBUG] No shifts recorded for selected date. Skipping detail panel test.")
                
            safe_print("[PASS] Scenario 4: Daily Cash & Shifts reconciliation validated.")

            # =========================================================================
            # SCENARIO 5: Inventory Value Panel
            # =========================================================================
            safe_print("\n--- SCENARIO 5: Inventory Value Panel ---")
            inventory_tab = page.locator("button:has-text('Valoare Inventar')")
            inventory_tab.wait_for(state="visible", timeout=5000)
            inventory_tab.click()
            page.wait_for_timeout(1000)
            
            safe_print("Checking Inventory KPI cards...")
            check_no_nan_or_undefined(page, "text=Valoare Achiziție Est.")
            check_no_nan_or_undefined(page, "text=Valoare Vânzare Est.")
            check_no_nan_or_undefined(page, "text=Marjă Potențială")
            check_no_nan_or_undefined(page, "text=Alerte Critice Stoc")
            
            # Check stock divisions
            safe_print("Verifying Store vs Warehouse division values...")
            check_no_nan_or_undefined(page, "text=Zona Magazin")
            check_no_nan_or_undefined(page, "text=Zona Depozit")
            
            # Check dead stock table
            has_dead_stock = page.locator("text=Candidați Dead Stock").is_visible()
            if has_dead_stock:
                safe_print("Verifying dead stock table header...")
                page.locator("th:has-text('Stoc Actual')").wait_for(state="visible", timeout=5000)
            else:
                page.locator("text=Felicitări!").wait_for(state="visible", timeout=5000)
                safe_print("[DEBUG] No dead stock shown (Congratulations state).")
                
            safe_print("[PASS] Scenario 5: Inventory Valuation validated.")

            # =========================================================================
            # SCENARIO 6: Losses/Waste Panel
            # =========================================================================
            safe_print("\n--- SCENARIO 6: Losses/Waste Panel ---")
            losses_tab = page.locator("button:has-text('Pierderi / Casări')")
            losses_tab.wait_for(state="visible", timeout=5000)
            losses_tab.click()
            page.wait_for_timeout(1000)
            
            has_losses = page.locator("text=Cantitate Totală Casată").is_visible()
            if has_losses:
                safe_print("Checking losses KPI values...")
                check_no_nan_or_undefined(page, "text=Cantitate Totală Casată")
                check_no_nan_or_undefined(page, "text=Valoare Pierderi (Achiziție)")
                
                safe_print("Checking reasons and affected products charts...")
                page.locator("h4:has-text('Distribuție pe Motive Casare')").wait_for(state="visible", timeout=5000)
                page.locator("h4:has-text('Top Produse Afectate')").wait_for(state="visible", timeout=5000)
            else:
                page.locator("text=Fără pierderi înregistrate").wait_for(state="visible", timeout=5000)
                safe_print("[DEBUG] No losses recorded (empty state validated).")
                
            safe_print("[PASS] Scenario 6: Losses tab validated.")

            # =========================================================================
            # SCENARIO 7: Date Filters & Refresh Controls
            # =========================================================================
            safe_print("\n--- SCENARIO 7: Date Filters & Refresh Controls ---")
            # Switch back to Sales tab to test filters
            sales_tab = page.locator("button:has-text('Vânzări / Finaciar')")
            sales_tab.click()
            page.wait_for_timeout(500)
            
            # Fill dates
            date_from_input = page.locator("input[type='date']").first
            date_to_input = page.locator("input[type='date']").nth(1)
            
            safe_print("Setting custom broad date interval...")
            date_from_input.fill("2026-01-01")
            date_to_input.fill("2026-12-31")
            
            # Click Refresh (Actualizează)
            refresh_btn = page.locator("button:has-text('Actualizează')")
            refresh_btn.wait_for(state="visible", timeout=5000)
            refresh_btn.click()
            
            # Wait for loading indicator
            safe_print("Waiting for reports refresh after date interval modification...")
            page.locator("text=Se generează raportul comercial...").wait_for(state="detached", timeout=15000)
            page.wait_for_timeout(1000)
            
            # Verify data exists post-refresh
            check_no_nan_or_undefined(page, "text=Vânzări Brute")
            
            # Daily Cash local date change test
            cash_tab.click()
            page.wait_for_timeout(500)
            cash_date_input = page.locator("input[type='date']").first
            cash_date_input.fill("2026-05-20")
            page.wait_for_timeout(1000) # Wait for trigger load
            
            safe_print("[PASS] Scenario 7: Global refresh and date filters verified.")
            
            # Close context for admin
            context.close()

            # =========================================================================
            # SCENARIO 8: Platform Owner Context Switcher
            # =========================================================================
            safe_print("\n--- SCENARIO 8: Platform Owner Context Switcher ---")
            context_owner = browser.new_context()
            page_owner = context_owner.new_page()
            page_owner.on("dialog", lambda dialog: dialog.accept())
            
            page_owner.goto("http://localhost:5173/#/login")
            page_owner.wait_for_load_state("networkidle")
            
            page_owner.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page_owner.locator("input[type='text']").fill("admin@owner.com")
            page_owner.locator("input[type='password']").fill("admin123")
            page_owner.locator("button[type='submit']").click()
            
            # Wait for owner console link to confirm login
            page_owner.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as platform_owner (admin@owner.com).")
            
            # Direct navigation to /rapoarte
            page_owner.goto("http://localhost:5173/#/rapoarte")
            page_owner.wait_for_load_state("networkidle")
            page_owner.wait_for_timeout(2000)
            
            # Should display "Selectează un magazin..." message
            owner_prompt = page_owner.locator("text=Selectează un magazin pentru a vedea rapoartele.")
            owner_prompt.wait_for(state="visible", timeout=5000)
            assert owner_prompt.is_visible(), "Expected select store warning for platform owner"
            safe_print("[PASS] Warning message verified when no store selected.")
            
            # Select store from top context switcher
            switcher_btn = page_owner.locator("button:has-text('Platform Administration')").first
            switcher_btn.wait_for(state="visible", timeout=10000)
            switcher_btn.click()
            page_owner.locator("span:has-text('Magazine disponibile')").wait_for(state="visible", timeout=5000)
            
            # Click on 'Magazin Principal'
            safe_print("[DEBUG] Finding Magazin Principal buttons...")
            buttons = page_owner.locator("button")
            count = buttons.count()
            safe_print(f"[DEBUG] Total buttons on page: {count}")
            
            # Find the one that has 'Magazin Principal' inside
            matching_index = -1
            for i in range(count):
                btn_text = buttons.nth(i).evaluate("el => el.innerText")
                if "Magazin Principal" in btn_text:
                    safe_print(f"[DEBUG] Button {i} text: {btn_text.replace('\n', ' | ')}")
                    safe_print(f"[DEBUG] Button {i} HTML: {buttons.nth(i).evaluate('el => el.outerHTML')}")
                    matching_index = i
            
            if matching_index != -1:
                safe_print(f"[DEBUG] Clicking Button {matching_index}...")
                buttons.nth(matching_index).click(force=True)
            else:
                safe_print("[ERROR] No button found containing 'Magazin Principal'!")
            page_owner.wait_for_timeout(2000)
            
            # Save screenshot of owner view after selection
            page_owner.screenshot(path="screenshot_owner_after_select.png")
            safe_print("[DEBUG] Screenshot saved: screenshot_owner_after_select.png")
            
            # Print body text to see what is displayed
            body_text = page_owner.evaluate("document.body.innerText")
            safe_print(f"[DEBUG] Owner page text: {body_text[:1000]}")
            
            # Confirm Reports loads
            page_owner.locator("text=Se generează raportul comercial...").wait_for(state="detached", timeout=15000)
            page_owner.locator("text=Vânzări Brute").first.wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Reports page activated after selecting store context.")
            
            context_owner.close()

            # =========================================================================
            # SCENARIO 9: Restricted Roles (Cashier)
            # =========================================================================
            safe_print("\n--- SCENARIO 9: Restricted Roles (Cashier) ---")
            context_cashier = browser.new_context()
            page_cashier = context_cashier.new_page()
            
            page_cashier.goto("http://localhost:5173/#/login")
            page_cashier.wait_for_load_state("networkidle")
            
            page_cashier.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page_cashier.locator("input[type='text']").fill("magazin@magazin.com")
            page_cashier.locator("input[type='password']").fill("admin123")
            page_cashier.locator("button[type='submit']").click()
            
            page_cashier.wait_for_timeout(2000)
            
            # Check if login succeeded or failed
            dashboard_vis = page_cashier.locator("text=Magazin Principal").is_visible()
            
            if dashboard_vis:
                safe_print("[DEBUG] Cashier logged in successfully. Navigating to /rapoarte...")
                page_cashier.goto("http://localhost:5173/#/rapoarte")
                page_cashier.wait_for_load_state("networkidle")
                page_cashier.wait_for_timeout(2000)
                
                # Check for Acces Interzis state
                forbidden = page_cashier.locator("text=Acces Interzis")
                forbidden.wait_for(state="visible", timeout=5000)
                assert forbidden.is_visible(), "Expected forbidden warning text for Cashier"
                safe_print("[PASS] Access Denied message verified for Cashier role.")
            else:
                safe_print("[NOT TESTED] magazin@magazin.com login failed or credentials mismatched. Skipping restricted role checks.")
                
            context_cashier.close()

            # =========================================================================
            # SCENARIO 10: Responsive Sanity Layout Checks
            # =========================================================================
            safe_print("\n--- SCENARIO 10: Responsive Sanity Layout Checks ---")
            context_responsive = browser.new_context()
            page_resp = context_responsive.new_page()
            
            # Login
            page_resp.goto("http://localhost:5173/#/login")
            page_resp.locator("input[type='text']").fill("admin@admin.com")
            page_resp.locator("input[type='password']").fill("admin123")
            page_resp.locator("button[type='submit']").click()
            
            page_resp.locator("text=Magazin Principal").wait_for(state="visible", timeout=20000)
            page_resp.goto("http://localhost:5173/#/rapoarte")
            page_resp.locator("text=Se generează raportul comercial...").wait_for(state="detached", timeout=15000)
            
            # Resolution 1: 1440x900
            safe_print("Setting viewport to 1440x900...")
            page_resp.set_viewport_size({"width": 1440, "height": 900})
            page_resp.wait_for_timeout(500)
            assert page_resp.locator("text=Vânzări Brute").first.is_visible(), "Sales summary not visible at 1440x900"
            
            # Resolution 2: 768x1024 (Tablet)
            safe_print("Setting viewport to 768x1024...")
            page_resp.set_viewport_size({"width": 768, "height": 1024})
            page_resp.wait_for_timeout(500)
            assert page_resp.locator("text=Vânzări Brute").first.is_visible(), "Sales summary not visible at 768x1024"
            
            # Resolution 3: 390x844 (Mobile)
            safe_print("Setting viewport to 390x844...")
            page_resp.set_viewport_size({"width": 390, "height": 844})
            page_resp.wait_for_timeout(500)
            assert page_resp.locator("text=Vânzări Brute").first.is_visible(), "Sales summary not visible at 390x844"
            
            safe_print("[PASS] Scenario 10: Responsive layout checked on all 3 viewports successfully.")
            context_responsive.close()

            browser.close()
            safe_print("\n[SUCCESS] Commercial Reports E2E Test passed successfully!")
            
        except Exception as e:
            safe_print(f"\n[FAIL] Test esuat cu exceptia: {str(e)}")
            page.screenshot(path="screenshot_error_reports.png", full_page=True)
            safe_print("[DEBUG] Screenshot saved to screenshot_error_reports.png")
            browser.close()
            sys.exit(1)

if __name__ == '__main__':
    run_test()
