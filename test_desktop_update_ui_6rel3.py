import sys
import os
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_desktop_update_ui_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR DESKTOP UPDATE UI (6REL.3) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test 1: Desktop Mode Layout & TestIDs
        safe_print("\n--- Test 1: Verifying desktop update UI layout & custom testids ---")
        context = browser.new_context()
        
        # Inject Mock Electron API
        context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.0.0-pilot.1',
                isElectron: true,
                updater: {
                    checkForUpdates: async () => {
                        window.mockUpdaterCallbacks['updater:checking-for-update']();
                        return { success: true };
                    },
                    downloadUpdate: async () => {
                        return { success: true };
                    },
                    installUpdateAndRestart: async () => {
                        return { success: true };
                    },
                    getUpdateStatus: async () => ({ status: 'idle', progress: 0 }),
                    onUpdateEvent: (channel, callback) => {
                        window.mockUpdaterCallbacks = window.mockUpdaterCallbacks || {};
                        window.mockUpdaterCallbacks[channel] = callback;
                        return () => {};
                    }
                }
            };
        """)
        
        page = context.new_page()
        
        try:
            # Login
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            
            # Go to Store Settings
            page.goto("http://localhost:5174/#/setari-magazin")
            
            # Wait for settings loading to detach
            page.locator("text=Se încarcă setările magazinului...").wait_for(state="detached", timeout=10000)
            
            # Wait for panel to load
            panel = page.locator('[data-testid="desktop-update-panel"]')
            panel.wait_for(state="visible", timeout=10000)
            assert panel.is_visible(), "desktop-update-panel must be visible"
            
            # 1. Verify current version testid and text
            version_label = page.locator('[data-testid="desktop-update-current-version"]')
            version_label.wait_for(state="visible", timeout=5000)
            assert version_label.inner_text() == "1.0.0-pilot.1", f"Expected version 1.0.0-pilot.1, got {version_label.inner_text()}"
            
            # 2. Verify channel label testid and text
            channel_label = page.locator('[data-testid="desktop-update-channel"]')
            assert channel_label.is_visible(), "desktop-update-channel must be visible"
            assert "Pilot" in channel_label.inner_text(), "Channel text should contain Pilot"
            
            # 3. Verify status label testid and text
            status_label = page.locator('[data-testid="desktop-update-status"]')
            assert status_label.is_visible(), "desktop-update-status must be visible"
            assert "Nu s-a verificat" in status_label.inner_text(), "Expected 'Nu s-a verificat' status"
            
            # 4. Verify check updates button testid
            check_btn = page.locator('[data-testid="desktop-update-check-button"]')
            assert check_btn.is_visible(), "desktop-update-check-button must be visible"
            
            # Click Check Button and verify checking state
            check_btn.click()
            page.wait_for_timeout(500)
            assert "Se verifică actualizările" in status_label.inner_text(), "Expected status 'Se verifică actualizările...'"
            
            # 5. Simulate update available and verify desktop-update-available testid
            page.evaluate("window.mockUpdaterCallbacks['updater:update-available'](null, { version: '1.0.1-pilot.1' })")
            page.wait_for_timeout(500)
            
            available_marker = page.locator('[data-testid="desktop-update-available"]')
            available_marker.wait_for(state="attached", timeout=5000)
            assert available_marker.is_hidden(), "desktop-update-available element is hidden but must be attached to DOM"
            
            # 6. Simulate error and verify desktop-update-error testid
            page.evaluate("window.mockUpdaterCallbacks['updater:error'](null, { message: 'Conexiune refuzată' })")
            page.wait_for_timeout(500)
            
            error_marker = page.locator('[data-testid="desktop-update-error"]')
            error_marker.wait_for(state="attached", timeout=5000)
            assert "Conexiune refuzată" in error_marker.inner_text(), "desktop-update-error should contain the error message"
            
            safe_print("[PASS] Desktop Mode layout, labels, and custom testids verified successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Test 1 failed: {e}")
            page.screenshot(path="screenshot_desktop_update_ui_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        
        # Test 2: Browser Mode Layout (Fallback Warnings)
        safe_print("\n--- Test 2: Verifying browser fallback warning (without Electron API) ---")
        browser_context = browser.new_context()
        browser_page = browser_context.new_page()
        
        try:
            # Login
            browser_page.goto("http://localhost:5174/#/login")
            browser_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            browser_page.locator("input[type='text']").fill("admin@admin.com")
            browser_page.locator("input[type='password']").fill("admin123")
            browser_page.locator("button[type='submit']").click()
            browser_page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            
            # Go to Store Settings
            browser_page.goto("http://localhost:5174/#/setari-magazin")
            
            # Wait for loader to disappear
            browser_page.locator("text=Se încarcă setările magazinului...").wait_for(state="detached", timeout=10000)
            
            # Wait for panel to be visible
            panel = browser_page.locator('[data-testid="desktop-update-panel"]')
            panel.wait_for(state="visible", timeout=10000)
            
            # Check fallback message is visible
            fallback_msg = browser_page.locator("text=Auto-update este disponibil exclusiv în aplicația desktop")
            fallback_msg.wait_for(state="visible", timeout=10000)
            
            # Action buttons should be hidden in browser mode
            assert not browser_page.locator('[data-testid="desktop-update-check-button"]').is_visible(), "Check button should not be visible in browser mode"
            
            safe_print("[PASS] Browser Mode fallback warnings verified successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Test 2 failed: {e}")
            browser_page.screenshot(path="screenshot_desktop_update_ui_browser_error.png")
            browser_context.close()
            browser.close()
            sys.exit(1)
            
        browser_context.close()
        browser.close()

    safe_print("\n=== [SUCCESS] ALL DESKTOP UPDATE UI TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_desktop_update_ui_tests()
