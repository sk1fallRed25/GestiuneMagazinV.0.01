# -*- coding: utf-8 -*-
import sys
import os
import time
from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:5173"
SCREENSHOT_DIR = os.path.join("artifacts", "6f13")

def sanity_scan_self():
    """
    Enforces DML Safety by scanning the script for forbidden direct database mutation patterns.
    """
    self_path = __file__
    with open(self_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    forbidden = [
        ".from(" + "'stores'" + ").delete",
        ".from(" + '"stores"' + ").delete",
        ".from(" + "'audit_logs'" + ").delete",
        ".from(" + '"audit_logs"' + ").delete",
        ".from(" + "'store_members'" + ").delete",
        ".from(" + '"store_members"' + ").delete",
        ".from(" + "'stores'" + ").insert",
        ".from(" + '"stores"' + ").insert",
        ".from(" + "'stores'" + ").update",
        ".from(" + '"stores"' + ").update",
    ]
    
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        if "sanity_scan_self" in line or "forbidden = [" in line or "def " in line or line.strip().startswith("#"):
            continue
        for pattern in forbidden:
            if pattern in line:
                raise Exception(f"Sanity Check Failed: Forbidden pattern '{pattern}' found at line {idx+1}: {line}")
    print("[PASS] DML Safety Guard: No forbidden direct mutations found in script.")

def capture_responsive_screenshots(page, test_store_id):
    """
    Captures screenshots at the specified viewports for the Magazine tab in Owner Console.
    """
    viewports = [
        {"name": "desktop", "width": 1440, "height": 900},
        {"name": "laptop", "width": 1280, "height": 800},
        {"name": "tablet", "width": 768, "height": 1024},
        {"name": "mobile", "width": 390, "height": 844}
    ]
    
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    print("\n--- Starting Responsive Viewport Screenshots ---")
    for vp in viewports:
        print(f"Setting viewport size to: {vp['width']}x{vp['height']} ({vp['name']})")
        page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
        page.wait_for_timeout(1000)
        
        # Verify UI components are present
        row_selector = f"[data-testid='store-row-{test_store_id}']"
        page.locator(row_selector).wait_for(state="visible", timeout=5000)
        
        # Take screenshot
        screenshot_path = os.path.join(SCREENSHOT_DIR, f"store_lifecycle_{vp['name']}.png")
        page.screenshot(path=screenshot_path)
        print(f"[SAVED] Screenshot for {vp['name']} saved at {screenshot_path}")

def run_test():
    sanity_scan_self()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Log browser console messages safely
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))

        def handle_dialog(dialog):
            print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)
        
        # A. Login Platform Owner
        print("A. Navigating to login...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
        
        print("Logging in as Platform Owner (admin@owner.com)...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        # Verify Platform Administration
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        print("Platform Administration verified.")
        
        # Enter tab Magazine
        print("Switching to 'Magazine' tab...")
        page.locator("button:has-text('Magazine')").first.click()
        page.wait_for_timeout(1000)
        
        # Get IDs from Database via evaluate
        test_store_id = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data } = await supabase.from('stores').select('id').eq('name', 'Magazin Test 12345678 Punct 902').maybeSingle();
            return data ? data.id : null;
        }""")
        
        principal_store_id = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').maybeSingle();
            return data ? data.id : null;
        }""")
        
        if not test_store_id or not principal_store_id:
            raise Exception("Required store records (Magazin Principal or Magazin Test) not found in Database!")
        print(f"Found IDs: Principal={principal_store_id}, Test Store={test_store_id}")
        
        try:
            # B. Lifecycle badges verification
            print("\nB. Verifying lifecycle status badges and visibility...")
            
            principal_badge = page.locator(f"[data-testid='store-lifecycle-badge-{principal_store_id}']")
            principal_badge.wait_for(state="visible", timeout=5000)
            principal_badge_text = principal_badge.inner_text()
            print(f"Principal store status badge: '{principal_badge_text}'")
            assert "Activ" in principal_badge_text, f"Expected 'Activ' for Magazin Principal. Found: {principal_badge_text}"
            
            test_badge = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']")
            test_badge.wait_for(state="visible", timeout=5000)
            test_badge_text = test_badge.inner_text()
            print(f"Test store status badge: '{test_badge_text}'")
            assert "Activ" in test_badge_text, f"Expected 'Activ' for Test Store. Found: {test_badge_text}"
            
            # C. Modal suspend verification
            print("\nC. Verifying Suspend Modal and Reason Validation...")
            
            # Open menu
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Open Suspend Modal
            page.locator(f"[data-testid='store-action-suspend-{test_store_id}']").click()
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            
            # Verify modal components
            assert page.locator("#store-lifecycle-modal h3").inner_text() == "Suspendă magazin", "Action modal title mismatch"
            assert page.locator("textarea#store-lifecycle-reason-input").is_visible(), "Reason textarea is missing"
            
            # Reason validation check
            confirm_btn = page.locator("#store-lifecycle-confirm-btn")
            reason_input = page.locator("#store-lifecycle-reason-input")
            
            print("Testing reason length validation (<3 chars)...")
            reason_input.fill("ab")
            page.wait_for_timeout(200)
            assert confirm_btn.is_disabled(), "Confirm button should be disabled for <3 characters reason"
            
            print("Testing reason length validation (valid reason)...")
            reason_input.fill("E2E suspension test")
            page.wait_for_timeout(200)
            assert not confirm_btn.is_disabled(), "Confirm button should be enabled for valid reason"
            
            # Test Cancel
            print("Testing modal cancellation...")
            page.locator("#store-lifecycle-cancel-btn").click()
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=5000)
            print("Modal canceled successfully.")
            
            # Reopen and execute suspension
            print("Re-opening and executing suspension...")
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(300)
            page.locator(f"[data-testid='store-action-suspend-{test_store_id}']").click()
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            
            page.locator("#store-lifecycle-reason-input").fill("Suspended via E2E Visual QA")
            page.wait_for_timeout(300)
            page.locator("#store-lifecycle-confirm-btn").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            # Verify suspended state
            suspended_badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Test Store Badge after suspend: '{suspended_badge_text}'")
            assert "Suspendat" in suspended_badge_text, f"Status badge did not change to Suspendat. Got: {suspended_badge_text}"
            
            # D. Reactivate Store
            print("\nD. Verifying Reactivate Modal and Action...")
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            page.locator(f"[data-testid='store-action-reactivate-{test_store_id}']").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("Reactivated via E2E Visual QA")
            page.wait_for_timeout(300)
            page.locator("#store-lifecycle-confirm-btn").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            reactivated_badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Test Store Badge after reactivate: '{reactivated_badge_text}'")
            assert "Activ" in reactivated_badge_text, f"Status badge did not change to Activ. Got: {reactivated_badge_text}"
            
            # E. Archive Store
            print("\nE. Verifying Archive Modal and Action...")
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            page.locator(f"[data-testid='store-action-archive-{test_store_id}']").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("Archived via E2E Visual QA")
            page.wait_for_timeout(300)
            page.locator("#store-lifecycle-confirm-btn").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            archived_badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Test Store Badge after archive: '{archived_badge_text}'")
            assert "Arhivat" in archived_badge_text, f"Status badge did not change to Arhivat. Got: {archived_badge_text}"
            
            # F. Reactivate from archive
            print("\nF. Verifying Reactivate from Archive Modal and Action...")
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            page.locator(f"[data-testid='store-action-reactivate-{test_store_id}']").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("Reactivated from archive via E2E Visual QA")
            page.wait_for_timeout(300)
            page.locator("#store-lifecycle-confirm-btn").click()
            
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            reactivated_archive_badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Test Store Badge after reactivate from archive: '{reactivated_archive_badge_text}'")
            assert "Activ" in reactivated_archive_badge_text, f"Status badge did not restore to Activ. Got: {reactivated_archive_badge_text}"
            
            # G. Deletion eligibility modal on Magazin Principal
            print("\nG. Verifying Deletion Eligibility Modal on ineligible Magazin Principal...")
            page.locator(f"[data-testid='store-lifecycle-menu-{principal_store_id}']").click()
            page.wait_for_timeout(500)
            page.locator(f"[data-testid='store-action-check-delete-{principal_store_id}']").click()
            
            page.locator("#store-deletion-eligibility-modal").wait_for(state="visible", timeout=5000)
            
            # Wait for checking animation/state
            page.locator("text=Se analizează").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(500)
            
            # Verify counts, recommended action, and hard delete blocked message
            eligibility_text = page.locator("#store-deletion-eligibility-modal").inner_text()
            print(f"Eligibility Modal text:\n{eligibility_text.encode('ascii', 'replace').decode('ascii')}")
            
            assert "dezactivată" in eligibility_text.lower(), "Hard delete disabled notification missing!"
            assert "arhivarea" in eligibility_text.lower(), "Recommended action to archive is missing!"
            
            # Deletion request button should be hidden on ineligible store
            is_request_btn_visible = page.locator("#store-deletion-request-btn").is_visible()
            assert not is_request_btn_visible, "Deletion Request button must be hidden for ineligible stores!"
            
            # Close deletion eligibility modal
            page.locator("#store-deletion-close-btn").click()
            page.locator("#store-deletion-eligibility-modal").wait_for(state="hidden", timeout=5000)
            print("Eligibility Modal checked and closed.")
            
            # H. Audit logs UI verification
            print("\nH. Verifying Audit Logs UI for registered lifecycle actions...")
            page.locator("button:has-text('Audit Logs')").first.click()
            page.wait_for_timeout(1000)
            
            # Refresh audit logs
            page.locator("button[title='Reîmprospătează audit logs']").click()
            page.wait_for_timeout(1000)
            
            audit_table_text = page.locator("table").inner_text()
            print("Audit Logs Table Content Sample:")
            print("\n".join(audit_table_text.splitlines()[:15]).encode('ascii', 'replace').decode('ascii'))
            
            # Assert audit log records exist for our actions
            assert "Suspendare Magazin" in audit_table_text, "Audit log for Suspendare Magazin missing!"
            assert "Reactivare Magazin" in audit_table_text, "Audit log for Reactivare Magazin missing!"
            assert "Arhivare Magazin" in audit_table_text, "Audit log for Arhivare Magazin missing!"
            print("[PASS] Audit logs display registered transitions correctly.")

            # J. Responsive Visual QA
            # Switch back to Stores tab to take snapshots
            print("\nSwitching back to 'Magazine' tab for responsive visual QA...")
            page.locator("button:has-text('Magazine')").first.click()
            page.wait_for_timeout(1000)
            
            capture_responsive_screenshots(page, test_store_id)
            print("[PASS] Responsive visual screenshots captured.")
            
        finally:
            # I. Cleanup
            print("\nI. Cleanup: Restoring test store state to active via RPC...")
            restore_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { error } = await supabase.rpc('reactivate_store', {
                    p_store_id: id,
                    p_reason: 'Cleanup: Restore test store to active status'
                });
                return { success: error ? false : true, error: error ? error.message : null };
            }""", test_store_id)
            print(f"Cleanup RPC result: {restore_res}")
            
            # Final database state verification
            test_store_final = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('lifecycle_status, active').eq('id', id).single();
                return data;
            }""", test_store_id)
            
            principal_store_final = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('lifecycle_status, active').eq('id', id).single();
                return data;
            }""", principal_store_id)
            
            print(f"Test Store final DB state: {test_store_final}")
            print(f"Principal Store final DB state: {principal_store_final}")
            
            assert test_store_final['lifecycle_status'] == 'active', "Test store state not active after cleanup!"
            assert test_store_final['active'] == True, "Test store active flag not True after cleanup!"
            assert principal_store_final['lifecycle_status'] == 'active', "Principal store state not active after cleanup!"
            assert principal_store_final['active'] == True, "Principal store active flag not True after cleanup!"
            print("[PASS] Database states successfully validated after cleanup.")
            
        print("\n[SUCCESS] E2E Visual QA Test Suite passed completely!")
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n[FAIL] Test failed: {e}")
        sys.exit(1)
