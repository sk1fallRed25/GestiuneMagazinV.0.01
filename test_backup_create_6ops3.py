import sys
import os
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_backup_create_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR MANUAL BACKUP CREATION (6OPS.3) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Inject Mock Electron API
        context.add_init_script("""
            let backupCount = 5;
            let totalSize = 512000;
            
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
                        count: backupCount,
                        totalSize: totalSize,
                        lastBackup: '2026-06-25T18:00:00.000Z'
                    }),
                    createBackup: async () => {
                        backupCount += 1;
                        totalSize += 102400;
                        return { success: true, filename: 'offline_cache_backup_test.db' };
                    },
                    openBackupFolder: async () => ({ success: true })
                },
                health: {
                    check: async () => ({
                        overallStatus: 'GREEN',
                        sqlite: { status: 'GREEN', message: 'OK' },
                        backup: { status: 'GREEN', message: 'OK', lastBackup: '2026-06-25T18:00:00.000Z' },
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
            
            # Verify Backup Panel is visible
            backup_panel = page.locator('[data-testid="diagnostics-backup-recovery-panel"]')
            backup_panel.wait_for(state="visible", timeout=10000)
            
            # Check Initial Backup Count
            count_elem = page.locator('[data-testid="backup-count"]')
            assert "5 fișiere" in count_elem.inner_text(), f"Expected '5 fișiere', got '{count_elem.inner_text()}'"
            
            # Click "Creează Backup Acum"
            btn = page.locator('[data-testid="diagnostics-create-backup-button"]')
            btn.click()
            
            # Wait for count to increment
            page.wait_for_timeout(1000)
            
            # Verify Backup Count has updated
            assert "6 fișiere" in count_elem.inner_text(), f"Expected '6 fișiere', got '{count_elem.inner_text()}'"
            
            safe_print("[PASS] Manual backup creation E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Manual backup creation E2E failed: {e}")
            page.screenshot(path="screenshot_backup_create_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL MANUAL BACKUP CREATION TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_backup_create_tests()
