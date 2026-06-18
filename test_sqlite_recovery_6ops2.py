import sys
import os
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_sqlite_recovery_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR SQLITE CORRUPTION RECOVERY (6OPS.2) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Inject Mock Electron API simulating a RECREATED database after corruption
        context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.0.1',
                isElectron: true,
                log: async (level, ...args) => ({ success: true }),
                appControls: {
                    getWindowState: async () => ({ isKiosk: false, isFullscreen: false, isMaximized: true })
                },
                sqlite: {
                    getState: async () => ({
                        initialized: true,
                        corrupted: true,
                        recreated: true,
                        path: 'C:\\\\Users\\\\Test\\\\AppData\\\\Roaming\\\\offline_cache.db',
                        error: 'SQLite Error: file is not a database'
                    }),
                    listOfflineSales: async () => [],
                    getOfflineSalesSummary: async () => ({ queuedCount: 0, queuedTotal: 0, lastSale: null })
                },
                updater: {
                    checkForUpdates: async () => ({ success: true }),
                    getUpdateStatus: async () => ({ status: 'idle', progress: 0 }),
                    onUpdateEvent: () => () => {}
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
            
            # Navigate to Store Settings
            page.goto("http://localhost:5174/#/setari-magazin")
            page.locator("text=Se încarcă setările magazinului...").wait_for(state="detached", timeout=10000)
            
            # Verify SQLite Status Badge indicates Recreated
            sqlite_status = page.locator('[data-testid="diagnostics-sqlite-status"]')
            sqlite_status.wait_for(state="visible", timeout=10000)
            assert "RESTAURAT" in sqlite_status.inner_text().upper(), f"Expected 'Restaurat' status, got '{sqlite_status.inner_text()}'"
            
            safe_print("[PASS] SQLite corruption recovery status display E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] SQLite corruption recovery E2E failed: {e}")
            page.screenshot(path="screenshot_sqlite_recovery_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL SQLITE RECOVERY TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_sqlite_recovery_tests()
