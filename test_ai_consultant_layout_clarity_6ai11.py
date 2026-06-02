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

def run_layout_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR AI CONSULTANT LAYOUT & CLARITY HOTFIX (6AI.1.1) ===")
    
    # Create screenshots directory
    screenshots_dir = "C:/Users/Stefan/.gemini/antigravity/brain/5f0be3a7-26a3-477e-b2c5-8acc1cb30091/artifacts/6ai11"
    os.makedirs(screenshots_dir, exist_ok=True)
    
    # Start Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. SETUP: Enable AI Consultant Module
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
                    p_reason: 'Setup AI Layout Clarity Test'
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
            page.locator('[data-testid="ai-consultant-dashboard"]').wait_for(state="visible", timeout=15000)
            safe_print("[PASS] AI Consultant Dashboard is visible.")
            
            # SCENARIO A: Fullscreen Layout checks
            safe_print("\n--- Scenario A: Check container layout and width ---")
            dashboard_element = page.locator('[data-testid="ai-consultant-dashboard"]')
            classes = dashboard_element.evaluate("el => el.className")
            safe_print(f"[INFO] Container classes: {classes}")
            assert "max-w-[1600px]" in classes, "Container is missing max-w-[1600px] class!"
            safe_print("[PASS] Fullscreen container correctly has 'max-w-[1600px]'.")
            
            # SCENARIO B: KPI cards wrapping checks
            safe_print("\n--- Scenario B: Verify KPI cards details ---")
            kpi_element = page.locator('[data-testid="ai-kpi-products-active"]')
            kpi_html = kpi_element.inner_html()
            assert "whitespace-normal" in kpi_html or "break-words" in kpi_html, "KPI Card lacks wrapping support"
            safe_print("[PASS] KPI Card has wrapping CSS classes (no aggressive truncate on label).")
            
            # SCENARIO C: Recommendation Clarity buttons checks
            safe_print("\n--- Scenario C: Check recommendation buttons and descriptions ---")
            rec_section = page.locator('[data-testid="ai-recommendations-section"]')
            rec_html = rec_section.inner_html()
            
            # Check button labels
            assert "Deschide lista cu stoc scăzut" in rec_html or "Vezi produse epuizate" in rec_html or "Vezi produse fără vânzare" in rec_html or "Magazin Optimizat" in rec_html, \
                "Clarified recommendation action labels not found!"
            safe_print("[PASS] Recommendation cards action buttons are verified (clarified action labels).")
            
            # Check impact & recommended action microcopy headers
            if "Magazin Optimizat" not in rec_html:
                assert "Impact Operațional:" in rec_html, "Operational impact section header is missing!"
                assert "Acțiune Recomandată:" in rec_html, "Recommended action section header is missing!"
                safe_print("[PASS] Operational impact and Recommended action blocks are rendered.")
            
            # SCENARIO D: Visual Responsive Screenshots QA
            safe_print("\n--- Scenario D: Capturing screenshots on viewports ---")
            viewports = [
                {"name": "desktop_1920x1080", "width": 1920, "height": 1080},
                {"name": "laptop_1366x768", "width": 1366, "height": 768},
                {"name": "tablet_768x1024", "width": 768, "height": 1024},
                {"name": "mobile_390x844", "width": 390, "height": 844}
            ]
            
            for vp in viewports:
                page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
                page.wait_for_timeout(1000)
                screenshot_path = f"{screenshots_dir}/ai_consultant_{vp['name']}.png"
                page.screenshot(path=screenshot_path)
                safe_print(f"[PASS] Screenshot saved for {vp['name']} at {screenshot_path}")
                
        except Exception as err:
            safe_print(f"[FAIL] Layout E2E failed: {err}")
            page.screenshot(path="screenshot_layout_error.png", full_page=True)
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
                        p_reason: 'Cleanup AI Layout Clarity Test'
                    });
                }""")
                safe_print("[PASS] Disabled ai_consultant module after test.")
            except Exception as e:
                safe_print(f"[WARN] Cleanup failed: {e}")
            finally:
                cleanup_context.close()
                browser.close()

if __name__ == '__main__':
    try:
        run_layout_tests()
        safe_print("\n=== [SUCCESS] ALL AI CONSULTANT LAYOUT & CLARITY TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
