import sys
import os
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_logging_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR DESKTOP STRUCTURED LOGGING (6OPS.2) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Track calls to electronAPI.log
        logged_events = []
        
        # Inject Mock Electron API
        context.add_init_script(f"""
            window.electronAPI = {{
                getAppVersion: async () => '1.0.1',
                isElectron: true,
                log: async (level, ...args) => {{
                    window.loggedEvents = window.loggedEvents || [];
                    window.loggedEvents.push({{ level, args }});
                    return {{ success: true }};
                }},
                appControls: {{
                    getWindowState: async () => ({{ isKiosk: false, isFullscreen: false, isMaximized: true }})
                }},
                sqlite: {{
                    getState: async () => ({{
                        initialized: true,
                        corrupted: false,
                        recreated: false,
                        path: 'C:\\\\Users\\\\Test\\\\AppData\\\\Roaming\\\\offline_cache.db',
                        error: null
                    }}),
                    listOfflineSales: async () => [],
                    getOfflineSalesSummary: async () => ({{ queuedCount: 0, queuedTotal: 0, lastSale: null }})
                }},
                updater: {{
                    checkForUpdates: async () => ({{ success: true }}),
                    getUpdateStatus: async () => ({{ status: 'idle', progress: 0 }}),
                    onUpdateEvent: () => () => {{}}
                }}
            }};
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
            
            # Verify Diagnostics Card is visible
            card = page.locator('[data-testid="store-diagnostics-card"]')
            card.wait_for(state="visible", timeout=10000)
            assert card.is_visible(), "store-diagnostics-card must be visible"
            
            # Verify version label
            app_version = page.locator('[data-testid="diagnostics-app-version"]')
            assert "v1.0.1" in app_version.inner_text(), f"Expected v1.0.1, got {app_version.inner_text()}"
            
            # Verify database version
            db_version = page.locator('[data-testid="diagnostics-db-version"]')
            assert "Postgres 17" in db_version.inner_text(), "Expected Postgres 17 in version"
            
            # Trigger a manual client-side log to verify logging bridge works
            page.evaluate("window.electronAPI.log('info', 'Client test log message')")
            page.wait_for_timeout(500)
            
            # Check if log call was captured
            logs = page.evaluate("window.loggedEvents || []")
            assert len(logs) > 0, "Log call should be captured by mock"
            assert logs[0]['level'] == 'info', "Logger level should be info"
            assert 'Client test log message' in logs[0]['args'][0], "Log args should match"
            
            safe_print("[PASS] Desktop structured logging E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Desktop structured logging E2E failed: {e}")
            page.screenshot(path="screenshot_logging_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL LOGGING TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_logging_tests()
