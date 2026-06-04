import sys
import os
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_e2e_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR NIR PLACEHOLDER & OFFLINE SAFE MODE (6APP.1) ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        store_id = '00000000-0000-0000-0000-000000000001' # Magazin Principal
        
        # 1. SETUP: Ensure admin role is set to 'admin'
        setup_context = browser.new_context()
        setup_page = setup_context.new_page()
        try:
            safe_print("--- Setup: Verify test admin role is admin ---")
            setup_page.goto("http://localhost:5174/#/login")
            setup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            setup_page.locator("input[type='text']").fill("admin@owner.com")
            setup_page.locator("input[type='password']").fill("admin123")
            setup_page.locator("button[type='submit']").click()
            setup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            
            # Force admin@admin.com profile role to 'admin'
            setup_page.evaluate("""async () => {
                await window.supabase.from('profiles').update({ role: 'admin' }).eq('email', 'admin@admin.com');
            }""")
            safe_print("[PASS] Test admin role set to 'admin'.")
        except Exception as e:
            safe_print(f"[FAIL] Setup failed: {e}")
            setup_context.close()
            browser.close()
            sys.exit(1)
        setup_context.close()

        # 2. RUN TESTS
        # Injecting Electron Mock script before page creation
        test_context = browser.new_context(service_workers="block")
        test_context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.2.3-test',
                isElectron: true
            };
        """)
        
        page = test_context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            # Login as Store Admin
            safe_print("\n--- Logging in as Store Admin ---")
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as Store Admin successfully.")

            # Scenario A: NIR Placeholder UI
            safe_print("\n--- Scenario A: Testing NIR Placeholder UI ---")
            page.goto("http://localhost:5174/#/nir")
            
            # Verify NIR elements
            page.locator('[data-testid="nir-page"]').wait_for(state="visible", timeout=5000)
            assert page.locator('h1:has-text("NIR / Recepție din e-Factura")').is_visible(), "NIR Title missing"
            assert page.locator('p:has-text("Modul pentru import facturi ANAF")').is_visible(), "NIR Subtitle missing"
            
            coming_soon_card = page.locator('[data-testid="nir-coming-soon-card"]')
            assert coming_soon_card.is_visible(), "Coming soon card not visible"
            assert coming_soon_card.locator('text=În dezvoltare').is_visible(), "'În dezvoltare' badge missing"
            assert coming_soon_card.locator('text=Modul în lucru').is_visible(), "'Modul în lucru' heading missing"
            
            feature_list = page.locator('[data-testid="nir-feature-list"]')
            assert feature_list.is_visible(), "Feature list not visible"
            assert feature_list.locator('text=Import XML e-Factura').is_visible(), "Missing listed feature"
            
            import_btn = page.locator('[data-testid="nir-import-disabled-button"]')
            assert import_btn.is_visible(), "Import button missing"
            assert import_btn.is_disabled(), "Import button should be disabled"
            safe_print("[PASS] NIR Page placeholder UI correctly verified.")

            # Scenario B: Settings Page Version Display
            safe_print("\n--- Scenario B: App Version and Runtime Display in Settings & Sidebar ---")
            page.goto("http://localhost:5174/#/setari-magazin")
            
            # Check settings version elements
            page.locator('[data-testid="settings-app-version-label"]').wait_for(state="visible", timeout=5000)
            app_version_text = page.locator('[data-testid="settings-app-version-label"]').inner_text()
            assert app_version_text == "1.2.3-test", f"Expected version 1.2.3-test, got {app_version_text}"
            
            app_runtime_text = page.locator('[data-testid="settings-app-runtime-label"]').inner_text()
            assert app_runtime_text == "Electron Desktop", f"Expected runtime Electron Desktop, got {app_runtime_text}"
            
            # Check sidebar version elements
            sidebar_version_text = page.locator('[data-testid="app-version-label"]').inner_text()
            assert sidebar_version_text == "1.2.3-test", f"Expected sidebar version 1.2.3-test, got {sidebar_version_text}"
            
            sidebar_runtime_text = page.locator('[data-testid="app-runtime-label"]').inner_text()
            assert "electron" in sidebar_runtime_text.lower(), f"Expected electron in sidebar runtime, got {sidebar_runtime_text}"
            
            # Verify network-status-indicator is present since we are currently online
            assert page.locator('[data-testid="network-status-indicator"]').is_visible(), "Online status indicator missing while online"
            safe_print("[PASS] Version and runtime labels verified in settings and sidebar.")

            # Scenario C: Offline safe mode global banner
            safe_print("\n--- Scenario C: Offline Safe Mode Banners ---")
            # Simulate network offline
            test_context.set_offline(True)
            page.wait_for_timeout(1000) # Wait for network status hook to react
            
            # Global offline banner should appear
            page.locator('[data-testid="network-offline-banner"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="network-offline-banner"]').is_visible(), "Global offline banner not shown when offline"
            
            # Online indicator should disappear
            assert not page.locator('[data-testid="network-status-indicator"]').is_visible(), "Online indicator still shown while offline"
            safe_print("[PASS] Global network offline banner verified successfully.")

            # Scenario D: Products page offline guards
            safe_print("\n--- Scenario D: Products page offline guards ---")
            page.goto("http://localhost:5174/#/produse")
            page.locator('[data-testid="products-offline-warning-banner"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="products-offline-warning-banner"]').is_visible(), "Products page offline warning banner missing"
            assert page.locator('[data-testid="products-offline-badge"]').is_visible(), "Products page offline badge missing"
            safe_print("[PASS] Products page offline warnings verified.")

            # Scenario E: Store Settings page offline guards
            safe_print("\n--- Scenario E: Store Settings page offline guards ---")
            page.goto("http://localhost:5174/#/setari-magazin")
            page.locator('[data-testid="settings-offline-warning"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="settings-offline-warning"]').is_visible(), "Settings page offline warning missing"
            safe_print("[PASS] Settings page offline warnings verified.")

            # Scenario F: POS page offline guards
            safe_print("\n--- Scenario F: POS page offline guards ---")
            page.goto("http://localhost:5174/#/pos")
            page.locator('[data-testid="pos-offline-banner"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-offline-banner"]').is_visible(), "POS offline banner missing"
            
            # Check payment panel offline warning
            payment_warning = page.locator('[data-testid="pos-payment-offline-warning"]')
            payment_warning.wait_for(state="visible", timeout=5000)
            assert payment_warning.is_visible(), "POS Payment Panel offline warning missing"
            assert "Sistem offline. Vânzarea nu poate fi finalizată" in payment_warning.inner_text(), "Warning text incorrect"
            
            # Finalize button should be disabled
            finalize_btn = page.locator('button:has-text("ÎNCASEAZĂ")')
            assert finalize_btn.is_disabled(), "POS finalize button should be disabled when offline"
            safe_print("[PASS] POS offline banners and button disabled guards verified.")

            # Scenario G: Reconnecting flow
            safe_print("\n--- Scenario G: Online recovery reconnecting flow ---")
            test_context.set_offline(False)
            page.wait_for_timeout(2000) # Wait for debounce reconnecting timeout
            
            # Navigate back to settings (wrapped in MainLayout) to verify the status indicator
            page.goto("http://localhost:5174/#/setari-magazin")
            
            # Global offline banner should disappear
            page.locator('[data-testid="network-offline-banner"]').wait_for(state="detached", timeout=5000)
            assert not page.locator('[data-testid="network-offline-banner"]').is_visible(), "Global offline banner should be hidden when online"
            
            # Online indicator should reappear
            page.locator('[data-testid="network-status-indicator"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="network-status-indicator"]').is_visible(), "Online indicator should reappear when online"
            safe_print("[PASS] Online recovery verified.")

            # Scenario H: Role restrictions (Cashier has no access to NIR)
            safe_print("\n--- Scenario H: Role Restrictions (Cashier cannot access NIR) ---")
            
            # Open platform owner context to demote role to casier
            admin_context = browser.new_context()
            admin_page = admin_context.new_page()
            admin_page.goto("http://localhost:5174/#/login")
            admin_page.locator("input[type='text']").wait_for(state="visible")
            admin_page.locator("input[type='text']").fill("admin@owner.com")
            admin_page.locator("input[type='password']").fill("admin123")
            admin_page.locator("button[type='submit']").click()
            admin_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible")
            
            # Update role to casier
            admin_page.evaluate("""async () => {
                await window.supabase.from('profiles').update({ role: 'casier' }).eq('email', 'admin@admin.com');
            }""")
            admin_context.close()
            
            # Demote state and reload
            page.reload()
            page.wait_for_timeout(1000)
            
            # Try accessing /nir as cashier
            page.goto("http://localhost:5174/#/nir")
            page.locator("text=Acces Interzis").wait_for(state="visible", timeout=5000)
            assert page.locator("text=Acces Interzis").is_visible(), "NIR page should show 'Acces Interzis' for Cashier"
            safe_print("[PASS] Cashier restricted from accessing NIR.")

        except Exception as e:
            safe_print(f"[FAIL] Test encountered error: {e}")
            page.screenshot(path="screenshot_nir_offline_error.png", full_page=True)
            raise e
            
        finally:
            # 3. CLEANUP: Restore admin role to admin
            cleanup_context = browser.new_context()
            cleanup_page = cleanup_context.new_page()
            try:
                cleanup_page.goto("http://localhost:5174/#/login")
                cleanup_page.locator("input[type='text']").wait_for(state="visible")
                cleanup_page.locator("input[type='text']").fill("admin@owner.com")
                cleanup_page.locator("input[type='password']").fill("admin123")
                cleanup_page.locator("button[type='submit']").click()
                cleanup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible")
                cleanup_page.evaluate("""async () => {
                    await window.supabase.from('profiles').update({ role: 'admin' }).eq('email', 'admin@admin.com');
                }""")
                safe_print("[CLEANUP] Restored admin@admin.com role to admin.")
            except Exception as ex:
                safe_print(f"[WARNING] Cleanup failed to restore user role: {ex}")
            finally:
                cleanup_context.close()
                test_context.close()
                browser.close()

if __name__ == '__main__':
    try:
        run_e2e_tests()
        safe_print("\n=== [SUCCESS] ALL NIR PLACEHOLDER & OFFLINE SAFE MODE TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
