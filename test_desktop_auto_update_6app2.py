import sys
import os
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_auto_update_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR DESKTOP AUTO-UPDATE (6APP.2) ===")

    # Scenario A: Static Configuration Checks
    safe_print("\n--- Scenario A: Checking static configurations in package.json ---")
    try:
        pkg_path = "package.json"
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        
        # 1. Check appId and productName
        assert pkg.get("build", {}).get("appId") == "com.gestiunemagazin.app", "appId must be 'com.gestiunemagazin.app'"
        assert pkg.get("build", {}).get("productName") == "Sistem Gestiune Magazin", "productName must be 'Sistem Gestiune Magazin'"
        
        # 2. Check targets
        targets = pkg.get("build", {}).get("win", {}).get("target", [])
        assert "nsis" in targets, "build win target must include 'nsis'"
        assert "portable" in targets, "build win target must include 'portable'"
        
        # 3. Check nsis configs
        nsis = pkg.get("build", {}).get("nsis", {})
        assert nsis.get("oneClick") is False, "nsis oneClick must be false"
        assert nsis.get("allowToChangeInstallationDirectory") is True, "nsis allowToChangeInstallationDirectory must be true"
        
        # 4. Check publish provider
        publish = pkg.get("build", {}).get("publish", {})
        assert publish.get("provider") == "github", "publish provider must be 'github'"
        assert publish.get("owner") == "sk1fallRed25", "publish owner must be 'sk1fallRed25'"
        
        # 5. Check electron-updater in dependencies
        assert "electron-updater" in pkg.get("dependencies", {}), "electron-updater must be in package.json dependencies"
        
        safe_print("[PASS] Static configurations in package.json verified successfully.")
    except Exception as e:
        safe_print(f"[FAIL] Scenario A failed: {e}")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Scenario B & C: UI updater, IPC, and event simulations
        safe_print("\n--- Scenario B & C: Testing UI Updater Panel, Preload & Event Simulations ---")
        context = browser.new_context()
        
        # Inject Mock Electron API
        context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.2.3-test',
                isElectron: true,
                updater: {
                    checkForUpdates: async () => {
                        window.mockUpdaterCallbacks['updater:checking-for-update']();
                        return { success: true };
                    },
                    downloadUpdate: async () => {
                        window.mockUpdaterCallbacks['updater:download-progress'](null, { percent: 10 });
                        return { success: true };
                    },
                    installUpdateAndRestart: async () => {
                        window.installTriggered = true;
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
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        
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
            page.locator('[data-testid="app-update-panel"]').wait_for(state="visible", timeout=5000)
            
            # Verify version displays correctly
            version_label = page.locator('[data-testid="app-update-current-version"]')
            assert version_label.inner_text() == "1.2.3-test", f"Expected version 1.2.3-test, got {version_label.inner_text()}"
            
            # Verify status displays idle
            status_label = page.locator('[data-testid="app-update-status"]')
            assert "Nu s-a verificat" in status_label.inner_text(), "Expected 'Nu s-a verificat' status"
            
            # Check Check Button exists
            check_btn = page.locator('[data-testid="app-update-check-button"]')
            assert check_btn.is_visible(), "Check update button should be visible"
            
            # Click Check Button and verify checking state
            check_btn.click()
            page.wait_for_timeout(500)
            assert "Se verifică actualizările" in status_label.inner_text(), "Expected status 'Se verifică actualizările...'"
            
            # Simulate Update Available Event
            page.evaluate("window.mockUpdaterCallbacks['updater:update-available'](null, { version: '1.2.4-test' })")
            page.wait_for_timeout(500)
            assert "Actualizare nouă disponibilă!" in status_label.inner_text(), "Expected status 'Actualizare nouă disponibilă!'"
            
            # Download button should now be visible
            download_btn = page.locator('[data-testid="app-update-download-button"]')
            assert download_btn.is_visible(), "Download button should be visible when update is available"
            
            # Click Download Button and verify downloading progress state
            download_btn.click()
            page.wait_for_timeout(500)
            assert "Se descarcă actualizarea... (10%)" in status_label.inner_text(), "Expected status 'Se descarcă actualizarea... (10%)'"
            
            # Simulate progress to 65%
            page.evaluate("window.mockUpdaterCallbacks['updater:download-progress'](null, { percent: 65 })")
            page.wait_for_timeout(500)
            assert "Se descarcă actualizarea... (65%)" in status_label.inner_text(), "Expected status 'Se descarcă actualizarea... (65%)'"
            
            # Simulate downloaded
            page.evaluate("window.mockUpdaterCallbacks['updater:update-downloaded'](null, {})")
            page.wait_for_timeout(500)
            assert "Actualizare descărcată. Gata de instalare!" in status_label.inner_text(), "Expected status 'Actualizare descărcată. Gata de instalare!'"
            
            # Install button should now be visible
            install_btn = page.locator('[data-testid="app-update-install-button"]')
            assert install_btn.is_visible(), "Install button should be visible when downloaded"
            
            safe_print("[PASS] UI Update Center status transitions and events verified successfully.")

            # Scenario D: POS Safety Guards
            safe_print("\n--- Scenario D: Testing POS Cart Safety Guards ---")
            
            # Mock window.confirm to auto-confirm install
            page.evaluate("window.confirm = () => true")
            page.evaluate("window.alert = (msg) => { window.lastAlert = msg; }")
            
            # Clear any cart in localStorage first
            page.evaluate("localStorage.removeItem('pos_cart')")
            
            # Click Install when cart is empty -> install should be triggered
            page.evaluate("window.installTriggered = false")
            install_btn.click()
            page.wait_for_timeout(500)
            triggered = page.evaluate("window.installTriggered")
            assert triggered is True, "Install should have been triggered when cart is empty"
            
            # Put active items in POS cart
            page.evaluate("""
                localStorage.setItem('pos_cart', JSON.stringify([
                    { productId: 'p1', name: 'Paine', quantity: 2, price: 1.5 }
                ]))
            """)
            
            # Click Install when cart is NOT empty -> install should be blocked and show error
            page.evaluate("window.installTriggered = false")
            install_btn.click()
            page.wait_for_timeout(500)
            
            # Check alert was shown or installation blocked
            triggered = page.evaluate("window.installTriggered")
            assert triggered is False, "Install should be BLOCKED when cart is not empty"
            alert_msg = page.evaluate("window.lastAlert")
            assert "Finalizează sau golește coșul înainte de instalarea update-ului." in alert_msg, f"Expected alert message about cart, got '{alert_msg}'"
            
            # Clear cart for cleanup
            page.evaluate("localStorage.removeItem('pos_cart')")
            safe_print("[PASS] POS Cart Safety Guard blocked update installation correctly.")
            
        except Exception as e:
            safe_print(f"[FAIL] Scenario B/C/D failed: {e}")
            page.screenshot(path="screenshot_auto_update_error.png")
            context.close()
            browser.close()
            sys.exit(1)
        
        context.close()

        # Scenario E: Browser Fallback Checks
        safe_print("\n--- Scenario E: Testing Browser Fallback (Without Electron API) ---")
        browser_context = browser.new_context() # Normal context, no Electron mocks
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
            browser_page.locator('[data-testid="app-update-panel"]').wait_for(state="visible", timeout=10000)
            
            # Check fallback message is visible
            fallback_msg = browser_page.locator("text=Auto-update este disponibil exclusiv în aplicația desktop")
            fallback_msg.wait_for(state="visible", timeout=10000)
            
            # Action buttons should be hidden in browser mode
            assert not browser_page.locator('[data-testid="app-update-check-button"]').is_visible(), "Check button should not be visible in browser mode"
            
            safe_print("[PASS] Browser fallback warnings verified successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Scenario E failed: {e}")
            browser_page.screenshot(path="screenshot_browser_fallback_error.png")
            browser_context.close()
            browser.close()
            sys.exit(1)

        browser_context.close()
        browser.close()

    safe_print("\n=== [SUCCESS] ALL AUTO-UPDATE INTEGRATION TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_auto_update_tests()
