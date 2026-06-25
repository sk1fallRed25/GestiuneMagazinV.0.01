import sys
import os
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_healthcheck_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR HEALTH CHECK SERVICE (6OPS.3) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Inject Mock Electron API
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
                        corrupted: false,
                        recreated: false,
                        path: 'C:\\\\Users\\\\Test\\\\AppData\\\\Roaming\\\\offline_cache.db',
                        error: null
                    }),
                    listOfflineSales: async () => [],
                    getOfflineSalesSummary: async () => ({ queuedCount: 0, queuedTotal: 0, lastSale: null }),
                    getBackupInfo: async () => ({
                        count: 5,
                        totalSize: 512000,
                        lastBackup: '2026-06-25T18:00:00.000Z'
                    })
                },
                health: {
                    check: async () => ({
                        overallStatus: 'YELLOW',
                        sqlite: { status: 'GREEN', message: 'OK' },
                        backup: { status: 'YELLOW', message: 'Last backup is older than 24h' },
                        disk: { status: 'GREEN', message: 'OK', freeBytes: 1024*1024*1024 },
                        writeAccess: { status: 'GREEN', message: 'OK' }
                    })
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
            
            # Verify overall status is YELLOW
            overall_status = page.locator('[data-testid="health-overall-status"]')
            overall_status.wait_for(state="visible", timeout=10000)
            assert "AVERTISMENT" in overall_status.inner_text().upper(), f"Expected 'SISTEM AVERTISMENT' (YELLOW), got '{overall_status.inner_text()}'"
            
            # Check individual statuses
            sqlite_status = page.locator('[data-testid="health-sqlite-status"]')
            backup_status = page.locator('[data-testid="health-backup-status"]')
            disk_status = page.locator('[data-testid="health-disk-status"]')
            write_status = page.locator('[data-testid="health-write-status"]')
            
            assert sqlite_status.inner_text() == 'GREEN', f"Expected SQLite status 'GREEN', got '{sqlite_status.inner_text()}'"
            assert backup_status.inner_text() == 'YELLOW', f"Expected Backup status 'YELLOW', got '{backup_status.inner_text()}'"
            assert disk_status.inner_text() == 'GREEN', f"Expected Disk status 'GREEN', got '{disk_status.inner_text()}'"
            assert write_status.inner_text() == 'GREEN', f"Expected Write status 'GREEN', got '{write_status.inner_text()}'"
            
            safe_print("[PASS] Health check service E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Health check service E2E failed: {e}")
            page.screenshot(path="screenshot_healthcheck_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL HEALTH CHECK SERVICE TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_healthcheck_tests()
