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

def run_consent_ui_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR STORE SETTINGS AI CONSENT UI INTEGRATION (6AI.5) ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. SETUP: Reset consent states and ensure test admin has correct role
        setup_context = browser.new_context()
        setup_page = setup_context.new_page()
        store_id = None  # Will be resolved dynamically
        
        try:
            safe_print("--- Setup: Initialize consent state and user roles ---")
            setup_page.goto("http://localhost:5174/#/login")
            setup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            setup_page.locator("input[type='text']").fill("admin@owner.com")
            setup_page.locator("input[type='password']").fill("admin123")
            setup_page.locator("button[type='submit']").click()
            setup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            
            setup_res = setup_page.evaluate("""async () => {
                const supabase = window.supabase;
                
                // Resolve actual store ID for 'Magazin Principal'
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                // Ensure AI Consultant module is enabled for store
                await supabase.rpc('set_store_module_access', {
                    p_store_id: storeId,
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Setup AI Consent UI Test'
                });
                
                // Force admin@admin.com profile role to 'admin'
                await supabase.from('profiles').update({ role: 'admin' }).eq('email', 'admin@admin.com');
                
                return { success: true, storeId: storeId };
            }""")

            
            if 'error' in setup_res:
                raise Exception(f"Setup failed: {setup_res['error']}")
            store_id = setup_res.get('storeId')
            if not store_id:
                raise Exception("Failed to resolve store_id from setup_res")
            safe_print(f"[PASS] AI Consent state reset and test admin role verified. store_id: {store_id}")
            
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
            safe_print("[PASS] Logged in as Store Admin.")
            
            # Navigate to Store Settings
            page.goto("http://localhost:5174/#/setari-magazin")
            
            # Wait for card to load to ensure get_store_ai_consent executes and the row is created
            card = page.locator('[data-testid="ai-consent-settings-card"]')
            card.wait_for(state="visible", timeout=15000)
            
            # Reset all toggles to false inside test admin context (now that the row is guaranteed to exist)
            page.evaluate(f"""async () => {{
                await window.supabase.from('store_ai_consent').update({{
                    ai_consultant_enabled: false,
                    ai_data_preparation_enabled: false,
                    allow_model_improvement: false,
                    allow_anonymized_benchmarking: false,
                    allow_external_ai_processing: false,
                    allow_cross_store_training: false,
                    consent_version: 'v1',
                    accepted_by_profile_id: null,
                    accepted_at: null,
                    revoked_at: null
                }}).eq('store_id', '{store_id}');
            }}""")
            
            # Reload page to fetch the clean all-false state
            page.reload()
            card.wait_for(state="visible", timeout=15000)
            assert card.is_visible(), "AI Consent settings card should be visible"

            
            # Verify toggles are default false
            toggle_consultant = page.locator('[data-testid="ai-consent-toggle-consultant"]')
            toggle_data_prep = page.locator('[data-testid="ai-consent-toggle-data-preparation"]')
            toggle_improvement = page.locator('[data-testid="ai-consent-toggle-model-improvement"]')
            
            assert toggle_consultant.get_attribute("aria-checked") == "false", "AI Consultant toggle should start false"
            assert toggle_data_prep.get_attribute("aria-checked") == "false", "AI Data Prep toggle should start false"
            assert toggle_improvement.get_attribute("aria-checked") == "false", "Model Improvement toggle should start false"
            safe_print("[PASS] AI Consent settings card loads with all options defaulted to false.")
            
            # Scenario B: Toggle simple setting
            safe_print("\n--- Scenario B: Toggle simple options (AI Consultant & Data Prep) ---")
            toggle_consultant.click()
            page.locator('[data-testid="ai-consent-save-status"]:has-text("Modificări salvate")').wait_for(state="visible", timeout=5000)
            safe_print("[PASS] AI Consultant toggled and saved.")
            
            toggle_data_prep.click()
            page.locator('[data-testid="ai-consent-save-status"]:has-text("Modificări salvate")').wait_for(state="visible", timeout=5000)
            safe_print("[PASS] AI Data Preparation toggled and saved.")
            
            # Reload page to check persistence
            page.reload()
            card.wait_for(state="visible", timeout=15000)
            
            toggle_consultant = page.locator('[data-testid="ai-consent-toggle-consultant"]')
            toggle_data_prep = page.locator('[data-testid="ai-consent-toggle-data-preparation"]')
            assert toggle_consultant.get_attribute("aria-checked") == "true", "AI Consultant toggle should persist true"
            assert toggle_data_prep.get_attribute("aria-checked") == "true", "AI Data Prep toggle should persist true"
            safe_print("[PASS] Simple toggles verified as persisted upon reload.")
            
            # Scenario C: Sensitive toggle confirmation
            safe_print("\n--- Scenario C: Sensitive toggle cancel/confirm flow ---")
            toggle_improvement = page.locator('[data-testid="ai-consent-toggle-model-improvement"]')
            toggle_improvement.click()
            
            # Verify confirmation dialog
            dialog = page.locator('[data-testid="ai-consent-confirm-dialog"]')
            dialog.wait_for(state="visible", timeout=3000)
            assert dialog.is_visible(), "Confirmation dialog must appear for sensitive toggles"
            
            # Activate button should be disabled initially
            activate_btn = page.locator('[data-testid="ai-consent-confirm-activate"]')
            assert activate_btn.is_disabled(), "Activate button should be disabled until checkbox is checked"
            
            # Cancel dialog
            page.locator('button:has-text("Renunță")').click()
            dialog.wait_for(state="detached", timeout=3000)
            assert toggle_improvement.get_attribute("aria-checked") == "false", "Toggle must revert to false if confirmation is cancelled"
            safe_print("[PASS] Cancel dialog flow successfully resets toggle to false.")
            
            # Click again and confirm
            toggle_improvement.click()
            dialog.wait_for(state="visible", timeout=3000)
            
            checkbox = page.locator('[data-testid="ai-consent-confirm-checkbox"]')
            checkbox.click()
            assert activate_btn.is_enabled(), "Activate button should enable once checkbox is checked"
            
            activate_btn.click()
            dialog.wait_for(state="detached", timeout=3000)
            
            # Wait for save success
            page.locator('[data-testid="ai-consent-save-status"]:has-text("Modificări salvate")').wait_for(state="visible", timeout=5000)
            assert toggle_improvement.get_attribute("aria-checked") == "true", "Toggle should update to true on confirmation"
            
            # Reload page to check persistence
            page.reload()
            card.wait_for(state="visible", timeout=15000)
            toggle_improvement = page.locator('[data-testid="ai-consent-toggle-model-improvement"]')
            assert toggle_improvement.get_attribute("aria-checked") == "true", "Model Improvement toggle should persist true after confirmation"
            safe_print("[PASS] Confirmation dialog flow successfully saves and persists sensitive option.")
            
            # Scenario D: Role restrictions - Manager (readonly)
            safe_print("\n--- Scenario D: Role restrictions (Manager) ---")
            
            # Temporarily set role to manager
            manager_context = browser.new_context()
            manager_page = manager_context.new_page()
            manager_page.goto("http://localhost:5174/#/login")
            manager_page.locator("input[type='text']").wait_for(state="visible")
            manager_page.locator("input[type='text']").fill("admin@owner.com")
            manager_page.locator("input[type='password']").fill("admin123")
            manager_page.locator("button[type='submit']").click()
            manager_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible")
            
            # Update role to manager
            manager_page.evaluate(f"""async () => {{
                await window.supabase.from('profiles').update({{ role: 'manager' }}).eq('email', 'admin@admin.com');
            }}""")
            manager_context.close()
            
            # Reload page in the test admin context (now acting as a manager)
            page.reload()
            card.wait_for(state="visible", timeout=15000)
            
            # Verify toggles are disabled
            toggle_consultant = page.locator('[data-testid="ai-consent-toggle-consultant"]')
            assert toggle_consultant.is_disabled(), "Toggles must be disabled for manager role"
            
            # Verify role warning banner
            warning_text = page.locator("text=Doar administratorul magazinului poate modifica aceste setări.")
            assert warning_text.is_visible(), "Warning banner must be displayed for non-admin roles"
            safe_print("[PASS] Role restrictions correctly enforced for manager (readonly mode and warning visible).")
            
            # Scenario E: Role restrictions - Cashier (forbidden settings access)
            safe_print("\n--- Scenario E: Role restrictions (Cashier) ---")
            
            # Set role to cashier
            cashier_context = browser.new_context()
            cashier_page = cashier_context.new_page()
            cashier_page.goto("http://localhost:5174/#/login")
            cashier_page.locator("input[type='text']").wait_for(state="visible")
            cashier_page.locator("input[type='text']").fill("admin@owner.com")
            cashier_page.locator("input[type='password']").fill("admin123")
            cashier_page.locator("button[type='submit']").click()
            cashier_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible")
            
            cashier_page.evaluate(f"""async () => {{
                await window.supabase.from('profiles').update({{ role: 'casier' }}).eq('email', 'admin@admin.com');
            }}""")
            cashier_context.close()
            
            # Reload page
            page.reload()
            page.wait_for_timeout(1000)
            
            # Verify settings access is forbidden entirely
            forbidden_text = page.locator("text=Acces Interzis")
            forbidden_text.wait_for(state="visible", timeout=5000)
            assert forbidden_text.is_visible(), "Settings page should show 'Acces Interzis' for Cashier"
            safe_print("[PASS] Role restrictions correctly enforced for cashier (access forbidden).")
            
        except Exception as e:
            safe_print(f"[FAIL] Test encountered error: {e}")
            page.screenshot(path="screenshot_consent_ui_verification_error.png", full_page=True)
            raise e
            
        finally:
            # 3. CLEANUP: Restore admin role
            cleanup_context = browser.new_context()
            cleanup_page = cleanup_context.new_page()
            try:
                cleanup_page.goto("http://localhost:5174/#/login")
                cleanup_page.locator("input[type='text']").wait_for(state="visible")
                cleanup_page.locator("input[type='text']").fill("admin@owner.com")
                cleanup_page.locator("input[type='password']").fill("admin123")
                cleanup_page.locator("button[type='submit']").click()
                cleanup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible")
                cleanup_page.evaluate(f"""async () => {{
                    await window.supabase.from('profiles').update({{ role: 'admin' }}).eq('email', 'admin@admin.com');
                }}""")
                safe_print("[CLEANUP] Restored admin@admin.com role to admin.")
            except Exception as ex:
                safe_print(f"[WARNING] Cleanup failed to restore user role: {ex}")
            finally:
                cleanup_context.close()
                test_context.close()
                browser.close()

if __name__ == '__main__':
    try:
        run_consent_ui_tests()
        safe_print("\n=== [SUCCESS] ALL STORE SETTINGS AI CONSENT UI TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
