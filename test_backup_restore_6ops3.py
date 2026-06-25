import sys
import os
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_backup_restore_tests():
    safe_print("\n=== RUNNING E2E TESTS FOR BACKUP RESTORE FLOW (6OPS.3) ===")

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
                    }),
                    selectBackupFile: async () => ({ success: true, filePath: 'C:\\\\backups\\\\offline_cache_backup_valid.db', cancelled: false }),
                    validateBackupFile: async ({ filePath }) => ({ valid: true }),
                    restoreBackup: async ({ filePath }) => ({ success: true }),
                    relaunchApp: async () => {
                        window.relaunchAppCalled = true;
                        return { success: true };
                    }
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
        
        # Handle the confirmation dialog
        dialog_dismissed = False
        def handle_dialog(dialog):
            nonlocal dialog_dismissed
            safe_print(f"[Dialog] Alert/Confirm message: {dialog.message}")
            dialog.accept()
            dialog_dismissed = True

        page.on("dialog", handle_dialog)
        
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
            
            # Verify Restore Button is visible
            restore_btn = page.locator('[data-testid="diagnostics-restore-backup-button"]')
            restore_btn.wait_for(state="visible", timeout=10000)
            
            # Click "Restore Backup"
            restore_btn.click()
            
            # Wait for relaunch check
            page.wait_for_timeout(2500) # Re-launch has a setTimeout of 1500ms in the code
            
            # Assert dialog was shown & accepted
            assert dialog_dismissed, "Confirmation dialog was not shown/dismissed."
            
            # Assert relaunchApp was called
            relaunch_called = page.evaluate("window.relaunchAppCalled || false")
            assert relaunch_called, "app relaunch was not triggered after database restoration."
            
            safe_print("[PASS] Backup restore E2E verification passed successfully.")
            
        except Exception as e:
            safe_print(f"[FAIL] Backup restore E2E failed: {e}")
            page.screenshot(path="screenshot_backup_restore_error.png")
            context.close()
            browser.close()
            sys.exit(1)
            
        context.close()
        browser.close()
        
    safe_print("=== [SUCCESS] ALL BACKUP RESTORE FLOW TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_backup_restore_tests()
