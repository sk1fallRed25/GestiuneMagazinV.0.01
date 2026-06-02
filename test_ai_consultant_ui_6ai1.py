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

def run_ui_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR AI CONSULTANT UI/UX POLISH (6AI.1) ===")
    
    # Create screenshots directory
    screenshots_dir = "C:/Users/Stefan/.gemini/antigravity/brain/5f0be3a7-26a3-477e-b2c5-8acc1cb30091/artifacts/6ai1"
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. SETUP: Enable module for Magazin Principal via platform owner
        setup_context = browser.new_context()
        setup_page = setup_context.new_page()
        
        try:
            safe_print("--- Setup: Enable AI Consultant Module ---")
            setup_page.goto("http://localhost:5174/#/login")
            setup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            setup_page.locator("input[type='text']").fill("admin@owner.com")
            setup_page.locator("input[type='password']").fill("admin123")
            setup_page.locator("button[type='submit']").click()
            setup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            
            setup_res = setup_page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
                if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
                const store = stores[0];
                
                const { error } = await supabase.rpc('set_store_module_access', {
                    p_store_id: store.id,
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Setup AI UI E2E Test'
                });
                
                if (error) return { error: error.message };
                return { success: true, storeId: store.id };
            }""")
            
            if 'error' in setup_res:
                raise Exception(f"Setup failed: {setup_res['error']}")
            safe_print("[PASS] Enabled ai_consultant module.")
            
        except Exception as e:
            safe_print(f"[FAIL] Setup failed: {e}")
            setup_context.close()
            browser.close()
            sys.exit(1)
            
        setup_context.close()
        
        # 2. RUN TESTS: Log in as store administrator
        test_context = browser.new_context(service_workers="block")
        test_context.add_init_script("""
            window.electronAPI = {
                isElectron: true,
                writeFiscalNetFile: async (args) => {
                    return { success: true, filePath: 'mock' };
                },
                readFiscalNetResponse: async (args) => {
                    return { success: true, content: 'UR1^12345^0^EMIS CU SUCCES^' };
                }
            };
            window.SGR_CHECKOUT_BACKEND_ENABLED = true;
        """)
        
        page = test_context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in as store administrator.")
            
            # Navigate to AI Consultant
            page.goto("http://localhost:5174/#/ai-consultant")
            
            # SCENARIO A: Loading / Loaded Checks
            safe_print("\n--- Scenario A: Check loading and dashboard elements ---")
            
            # Check if loading skeleton appears or has loaded directly
            is_loading = page.locator('[data-testid="ai-consultant-loading"]').count() > 0
            if is_loading:
                safe_print("[INFO] Dashboard loading skeleton detected. Waiting for load...")
                
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Dashboard loaded successfully (no generic error).")
            
            # SCENARIO B: KPI Cards Checks
            safe_print("\n--- Scenario B: Verify KPI cards existence ---")
            kpi_ids = [
                "ai-kpi-products-active",
                "ai-kpi-stock-value",
                "ai-kpi-sales-30d",
                "ai-kpi-no-stock",
                "ai-kpi-low-stock",
                "ai-kpi-expiry-risk"
            ]
            for kid in kpi_ids:
                card = page.locator(f'[data-testid="{kid}"]')
                assert card.count() > 0, f"KPI Card with testid {kid} was not found"
                val = card.inner_text()
                safe_print(f"[PASS] KPI Card '{kid}' is visible. Inner Text snippet: {val.replace(chr(10), ' | ')[:100]}")

            # SCENARIO C: Recommendations Section Checks
            safe_print("\n--- Scenario C: Verify recommendations section ---")
            rec_sec = page.locator('[data-testid="ai-recommendations-section"]')
            assert rec_sec.count() > 0, "Recommendations section was not found"
            safe_print("[PASS] Recommendations section is visible.")
            
            # SCENARIO D: Product Sections Checks
            safe_print("\n--- Scenario D: Verify detail product sections ---")
            section_ids = [
                "ai-low-stock-section",
                "ai-expiry-risk-section",
                "ai-dead-stock-section",
                "ai-top-selling-section"
            ]
            for sid in section_ids:
                section = page.locator(f'[data-testid="{sid}"]')
                assert section.count() > 0, f"Product section {sid} was not found"
                safe_print(f"[PASS] Product section '{sid}' is visible.")
                
            # SCENARIO E: Refresh Analysis Checks
            safe_print("\n--- Scenario E: Click Refresh Analysis ---")
            refresh_btn = page.locator('[data-testid="ai-refresh-button"]')
            assert refresh_btn.count() > 0, "Refresh button not found"
            refresh_btn.click()
            
            # Page should re-evaluate/load without crash
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Refresh completed successfully without crashes.")
            
            # SCENARIO F: Responsive Visual QA Viewports Check
            safe_print("\n--- Scenario F: Responsive Viewports Visual Verification ---")
            viewports = [
                {"name": "desktop", "width": 1920, "height": 1080},
                {"name": "laptop", "width": 1366, "height": 768},
                {"name": "tablet", "width": 768, "height": 1024},
                {"name": "mobile", "width": 390, "height": 844}
            ]
            
            for vp in viewports:
                page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
                page.wait_for_timeout(1000) # Let layout settle
                screenshot_path = f"{screenshots_dir}/ai_consultant_{vp['name']}.png"
                page.screenshot(path=screenshot_path)
                safe_print(f"[PASS] Screenshot saved for {vp['name']} viewport at {screenshot_path}")
                
        except Exception as err:
            safe_print(f"[FAIL] Exception occurred: {err}")
            page.screenshot(path="screenshot_ui_error.png", full_page=True)
            raise err
            
        finally:
            test_context.close()
            
            # 3. CLEANUP: Disable AI Consultant Module
            cleanup_context = browser.new_context()
            cleanup_page = cleanup_context.new_page()
            
            try:
                safe_print("\n--- Cleanup: Disable AI Consultant Module ---")
                cleanup_page.goto("http://localhost:5174/#/login")
                cleanup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
                cleanup_page.locator("input[type='text']").fill("admin@owner.com")
                cleanup_page.locator("input[type='password']").fill("admin123")
                cleanup_page.locator("button[type='submit']").click()
                cleanup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
                
                cleanup_page.evaluate("""async () => {
                    const supabase = window.supabase;
                    const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
                    if (!stores || stores.length === 0) return;
                    const store = stores[0];
                    await supabase.rpc('set_store_module_access', {
                        p_store_id: store.id,
                        p_module_key: 'ai_consultant',
                        p_enabled: false,
                        p_reason: 'Cleanup AI UI E2E Test'
                    });
                }""")
                safe_print("[PASS] Disabled ai_consultant after test.")
            except Exception as e:
                safe_print(f"[WARN] Cleanup failed: {e}")
            finally:
                cleanup_context.close()
                browser.close()

if __name__ == '__main__':
    try:
        run_ui_tests()
        safe_print("\n=== [SUCCESS] ALL AI CONSULTANT UI/UX POLISH TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
