import sys
import os
import json
import datetime
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_exception_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR EXCEPTION HANDLING & 24H QUEUE WARNING (6OPS.2) ===")

    # Calculate date 2 days ago in ISO format
    two_days_ago = (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat() + "Z"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Inject Mock Electron API returning an old offline queued sale
        context.add_init_script(f"""
            window.electronAPI = {{
                getAppVersion: async () => '1.0.1',
                isElectron: true,
                log: async (level, ...args) => ({{ success: true }}),
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
                    listOfflineSales: async () => [
                        {{
                            local_sale_id: '99999999-9999-9999-9999-999999999999',
                            store_id: '00000000-0000-0000-0000-000000000001',
                            device_fingerprint: 'test-fingerprint',
                            created_at_local: '{two_days_ago}',
                            status: 'queued',
                            cart_items_json: '[]',
                            payments_json: '[]',
                            totals_json: '{{"grandTotal": 100.00}}',
                            fiscal_status: 'pending_after_sync'
                        }}
                    ],
                    getOfflineSalesSummary: async () => ({{ queuedCount: 1, queuedTotal: 100.00, lastSale: null }})
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
            
            # Verify 24h Sync Warning is visible
            warning = page.locator('[data-testid="diagnostics-24h-sync-warning"]')
            warning.wait_for(state="visible", timeout=10000)
            assert warning.is_visible(), "diagnostics-24h-sync-warning must be visible for sales > 24h"
            
            # Verify initial error count is 0
            error_count = page.locator('[data-testid="diagnostics-error-count"]')
            assert error_count.inner_text() == "0", f"Expected 0 errors, got {error_count.inner_text()}"
            
            # Simulate a global unhandled window error by calling the window.onerror handler directly
            page.evaluate("window.onerror('Simulated Renderer Crash', 'main.js', 1, 1, new Error('Simulated Renderer Crash'))")
            
            # Click the refresh button to trigger an immediate update of the Diagnostics panel
            page.locator('[data-testid="diagnostics-refresh-button"]').click()
            page.wait_for_timeout(500)
            
            # Verify error count incremented to 1
            assert error_count.inner_text() == "1", f"Expected error count to increment to 1, got {error_count.inner_text()}"
            
            safe_print("[PASS] Global exception handling and 24h warning E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Exception handling E2E failed: {e}")
            page.screenshot(path="screenshot_exception_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL EXCEPTION HANDLING TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_exception_tests()
