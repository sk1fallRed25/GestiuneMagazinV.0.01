import sys
import os
import re
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_filter_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR AI RECOMMENDATION PRODUCT FILTERS (6AI.1.2) ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. SETUP: Enable module for Magazin Principal via Platform Owner
        setup_context = browser.new_context()
        setup_page = setup_context.new_page()
        store_id = '00000000-0000-0000-0000-000000000001' # Magazin Principal
        
        try:
            safe_print("--- Setup: Enable AI Consultant Module ---")
            setup_page.goto("http://localhost:5174/#/login")
            setup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            setup_page.locator("input[type='text']").fill("admin@owner.com")
            setup_page.locator("input[type='password']").fill("admin123")
            setup_page.locator("button[type='submit']").click()
            setup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            
            setup_res = setup_page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                // Enable module
                const {{ error }} = await supabase.rpc('set_store_module_access', {{
                    p_store_id: '{store_id}',
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Setup AI Filters Test'
                }});
                
                // Enable data prep in consent so snapshot loads
                await supabase.from('store_ai_consent').upsert({{
                    store_id: '{store_id}',
                    ai_consultant_enabled: true,
                    ai_data_preparation_enabled: true
                }});
                
                // Refresh snapshot so recommendations are generated
                await supabase.rpc('refresh_store_ai_snapshot', {{
                    p_store_id: '{store_id}',
                    p_period_days: 30
                }});
                
                if (error) return {{ error: error.message }};
                return {{ success: true }};
            }}""")
            
            if 'error' in setup_res:
                raise Exception(f"Setup failed: {setup_res['error']}")
            safe_print("[PASS] AI Consultant module and operational snapshot initialized.")
            
        except Exception as e:
            safe_print(f"[FAIL] Setup failed: {e}")
            setup_context.close()
            browser.close()
            sys.exit(1)
            
        setup_context.close()
        
        # 2. RUN E2E TEST: Log in as Store Admin
        test_context = browser.new_context(service_workers="block")
        page = test_context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            # Login
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as store administrator.")
            
            # Navigate to AI Consultant
            page.goto("http://localhost:5174/#/ai-consultant")
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=15000)
            safe_print("[PASS] AI Consultant Dashboard loaded successfully.")
            
            # Wait for recommendations section
            page.locator('.bg-white.bg-gradient-to-br').first.wait_for(state="visible", timeout=5000)
            
            # --- Scenario A: Low stock navigation ---
            safe_print("\n--- Scenario A: Low stock navigation ---")
            low_stock_btn = page.locator("a:has-text('Deschide lista cu stoc scăzut')").first
            assert low_stock_btn.is_visible(), "Low stock recommendation button should be visible"
            low_stock_btn.click()
            
            # Wait for navigation and verify url contains aiFilter=low_stock
            page.wait_for_url(re.compile(r"aiFilter=low_stock"), timeout=5000)
            safe_print("[PASS] URL successfully contains 'aiFilter=low_stock'.")
            
            # Verify AI Filter Banner is visible
            banner = page.locator('[data-testid="products-ai-filter-banner"]')
            banner.wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="products-ai-filter-low-stock"]').is_visible(), "Low stock banner title missing"
            safe_print("[PASS] AI Filter Banner is visible for Low Stock.")
            
            # --- Scenario B: No stock navigation ---
            safe_print("\n--- Scenario B: No stock navigation ---")
            page.goto("http://localhost:5174/#/ai-consultant")
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=10000)
            
            no_stock_btn = page.locator("a:has-text('Vezi produse epuizate')").first
            assert no_stock_btn.is_visible(), "No stock recommendation button should be visible"
            no_stock_btn.click()
            
            page.wait_for_url(re.compile(r"aiFilter=no_stock"), timeout=5000)
            safe_print("[PASS] URL successfully contains 'aiFilter=no_stock'.")
            
            banner.wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="products-ai-filter-no-stock"]').is_visible(), "No stock banner title missing"
            safe_print("[PASS] AI Filter Banner is visible for No Stock.")
            
            # --- Scenario C: Dead stock navigation ---
            safe_print("\n--- Scenario C: Dead stock navigation ---")
            page.goto("http://localhost:5174/#/ai-consultant")
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=10000)
            
            dead_stock_btn = page.locator("a:has-text('Vezi produse fără vânzare')").first
            assert dead_stock_btn.is_visible(), "Dead stock recommendation button should be visible"
            dead_stock_btn.click()
            
            page.wait_for_url(re.compile(r"aiFilter=dead_stock"), timeout=5000)
            safe_print("[PASS] URL successfully contains 'aiFilter=dead_stock'.")
            
            banner.wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="products-ai-filter-dead-stock"]').is_visible(), "Dead stock banner title missing"
            
            # Verify fallback explanation text
            fallback_text = banner.inner_text()
            assert "conectarea cu datele AI" in fallback_text, "Fallback limitation warning is missing in Dead Stock banner"
            safe_print("[PASS] Fallback limitation warning is visible in the Dead Stock banner.")
            
            # --- Scenario D: Clear filter ---
            safe_print("\n--- Scenario D: Clear filter ---")
            clear_btn = page.locator('[data-testid="products-ai-filter-clear"]')
            assert clear_btn.is_visible(), "Clear filter button should be visible"
            clear_btn.click()
            
            # Check URL does not contain aiFilter
            page.wait_for_timeout(1000)
            assert "aiFilter" not in page.url, "aiFilter query parameter should be removed"
            assert banner.count() == 0, "AI Filter Banner should disappear"
            safe_print("[PASS] AI Filter removed successfully, banner disappeared.")
            
            # --- Scenario E: Direct URL ---
            safe_print("\n--- Scenario E: Direct URL load ---")
            page.goto("http://localhost:5174/#/produse?aiFilter=low_stock")
            page.wait_for_load_state("networkidle")
            
            banner.wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="products-ai-filter-low-stock"]').is_visible(), "Direct URL did not trigger Low Stock filter"
            safe_print("[PASS] Direct URL successfully loads filter.")
            
            # --- Scenario F: Back to AI Consultant button ---
            safe_print("\n--- Scenario F: Back to AI Consultant navigation ---")
            back_btn = page.locator('[data-testid="products-ai-filter-back-ai"]')
            assert back_btn.is_visible(), "Back to AI button should be visible"
            back_btn.click()
            page.wait_for_url(re.compile(r"ai-consultant"), timeout=5000)
            safe_print("[PASS] Back button navigates to AI Consultant.")
            
        except Exception as e:
            safe_print(f"[FAIL] Test encountered error: {e}")
            page.screenshot(path="screenshot_filter_verification_error.png", full_page=True)
            raise e
            
        finally:
            test_context.close()
            browser.close()

if __name__ == '__main__':
    try:
        run_filter_tests()
        safe_print("\n=== [SUCCESS] ALL AI RECOMMENDATION PRODUCT FILTERS TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
