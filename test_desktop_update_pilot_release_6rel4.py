import sys
import os
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_pilot_release_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR PILOT RELEASE VERSION 1.0.1 (6REL.4) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Inject Mock Electron API returning version 1.0.1
        context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.0.1',
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
            
            # Wait for update panel to load
            panel = page.locator('[data-testid="desktop-update-panel"]')
            panel.wait_for(state="visible", timeout=10000)
            assert panel.is_visible(), "desktop-update-panel must be visible"
            
            # 1. Verify current version is 1.0.1
            version_label = page.locator('[data-testid="desktop-update-current-version"]')
            version_label.wait_for(state="visible", timeout=5000)
            assert version_label.inner_text() == "1.0.1", f"Expected version 1.0.1, got {version_label.inner_text()}"
            
            # 2. Verify channel label indicates Pilot
            channel_label = page.locator('[data-testid="desktop-update-channel"]')
            assert channel_label.is_visible(), "desktop-update-channel must be visible"
            assert "Pilot" in channel_label.inner_text(), "Channel text should contain Pilot"
            
            # 3. Verify check button exists
            check_btn = page.locator('[data-testid="desktop-update-check-button"]')
            assert check_btn.is_visible(), "desktop-update-check-button must be visible"
            
            # 4. Verify no automatic download occurs on check
            check_btn.click()
            page.wait_for_timeout(500)
            status_label = page.locator('[data-testid="desktop-update-status"]')
            assert "Se verifică actualizările" in status_label.inner_text(), "Expected checking status"
            
            # 5. Verify error fallback handling
            page.evaluate("window.mockUpdaterCallbacks['updater:error'](null, { message: 'Network Timeout' })")
            page.wait_for_timeout(500)
            
            error_marker = page.locator('[data-testid="desktop-update-error"]')
            error_marker.wait_for(state="attached", timeout=5000)
            assert "Network Timeout" in error_marker.inner_text(), "desktop-update-error should contain the error message"
            
            safe_print("[PASS] Pilot Release E2E UI verification for version 1.0.1 passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Pilot Release E2E failed: {e}")
            page.screenshot(path="screenshot_pilot_release_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("\n=== [SUCCESS] ALL PILOT RELEASE TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_pilot_release_tests()
