# -*- coding: utf-8 -*-
import sys
import os
import time
from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:5173"

def sanity_scan_self():
    """
    Enforces DML Safety by scanning the script for forbidden direct database mutation patterns.
    """
    self_path = __file__
    with open(self_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Segmented strings to avoid triggering the scanner on its own definition
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
    print("[PASS] DML Safety Guard: No forbidden direct mutations (.delete, .insert, .update) found in script.")

def run_test():
    sanity_scan_self()
    
    with sync_playwright() as p:
        # Launch browser headlessly
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Log browser console messages safely
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))

        def handle_dialog(dialog):
            print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)
        
        # 1. Login as Platform Owner
        print("1. Navigating to login...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
        
        print("2. Logging in as admin@owner.com...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        # Wait for dashboard to load
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        print("Logged in successfully as Platform Owner.")

        # Go to Stores tab
        print("Switching to 'Magazine' tab...")
        page.locator("button:has-text('Magazine')").first.click()
        page.wait_for_timeout(1000)

        # Get test store ID for cleanup purposes
        test_store_id = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data } = await supabase.from('stores').select('id').eq('name', 'Magazin Test 12345678 Punct 902').maybeSingle();
            return data ? data.id : null;
        }""")
        
        if not test_store_id:
            raise Exception("Test store 'Magazin Test 12345678 Punct 902' not found in database! Make sure DB is populated.")
        print(f"Test Store ID: {test_store_id}")

        principal_store_id = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').maybeSingle();
            return data ? data.id : null;
        }""")
        
        if not principal_store_id:
            raise Exception("Store 'Magazin Principal' not found in database!")
        print(f"Principal Store ID: {principal_store_id}")

        try:
            # -----------------------------------------------------------------
            # TEST SCENARIO 1: Suspend Store
            # -----------------------------------------------------------------
            print("\n--- SCENARIO 1: Suspend Store ---")
            
            # Locate the test store row
            row_selector = f"[data-testid='store-row-{test_store_id}']"
            page.locator(row_selector).wait_for(state="visible", timeout=10000)
            
            # Click options menu button
            print("Opening lifecycle options menu...")
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Click Suspendă magazin
            print("Clicking 'Suspenda magazin'...")
            page.locator(f"[data-testid='store-action-suspend-{test_store_id}']").click()
            
            # Modal check
            print("Verifying StoreLifecycleActionModal is visible...")
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            
            # Fill reason
            print("Entering suspension reason...")
            page.locator("#store-lifecycle-reason-input").fill("E2E Test: Temporary suspension validation")
            page.wait_for_timeout(500)
            
            # Confirm
            print("Confirming action...")
            page.locator("#store-lifecycle-confirm-btn").click()
            
            # Wait for modal to disappear
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            # Verify status badge is "Suspendat"
            badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Current badge text: '{badge_text}'")
            assert "Suspendat" in badge_text, f"Store status did not transition to Suspendat! Found: '{badge_text}'"
            print("[PASS] Store suspended successfully.")

            # -----------------------------------------------------------------
            # TEST SCENARIO 2: Reactivate Store
            # -----------------------------------------------------------------
            print("\n--- SCENARIO 2: Reactivate Store ---")
            
            # Open menu again
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Click Reactivează magazin
            print("Clicking 'Reactiveaza magazin'...")
            page.locator(f"[data-testid='store-action-reactivate-{test_store_id}']").click()
            
            # Modal check
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("E2E Test: Reactivating suspended store")
            page.wait_for_timeout(500)
            
            page.locator("#store-lifecycle-confirm-btn").click()
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            # Verify status badge is "Activ"
            badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Current badge text: '{badge_text}'")
            assert "Activ" in badge_text, f"Store status did not transition to Activ! Found: '{badge_text}'"
            print("[PASS] Store reactivated successfully.")

            # -----------------------------------------------------------------
            # TEST SCENARIO 3: Archive Store
            # -----------------------------------------------------------------
            print("\n--- SCENARIO 3: Archive Store ---")
            
            # Open menu again
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Click Arhivează magazin
            print("Clicking 'Arhiveaza magazin'...")
            page.locator(f"[data-testid='store-action-archive-{test_store_id}']").click()
            
            # Modal check
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("E2E Test: Archiving test store")
            page.wait_for_timeout(500)
            
            page.locator("#store-lifecycle-confirm-btn").click()
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            # Verify status badge is "Arhivat"
            badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Current badge text: '{badge_text}'")
            assert "Arhivat" in badge_text, f"Store status did not transition to Arhivat! Found: '{badge_text}'"
            print("[PASS] Store archived successfully.")

            # -----------------------------------------------------------------
            # TEST SCENARIO 4: Reactivate from Archive
            # -----------------------------------------------------------------
            print("\n--- SCENARIO 4: Reactivate from Archive ---")
            
            # Open menu again
            page.locator(f"[data-testid='store-lifecycle-menu-{test_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Click Reactivează magazin
            print("Clicking 'Reactiveaza magazin'...")
            page.locator(f"[data-testid='store-action-reactivate-{test_store_id}']").click()
            
            # Modal check
            page.locator("#store-lifecycle-modal").wait_for(state="visible", timeout=5000)
            page.locator("#store-lifecycle-reason-input").fill("E2E Test: Reactivating archived store")
            page.wait_for_timeout(500)
            
            page.locator("#store-lifecycle-confirm-btn").click()
            page.locator("#store-lifecycle-modal").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(1000)
            
            # Verify status badge is "Activ"
            badge_text = page.locator(f"[data-testid='store-lifecycle-badge-{test_store_id}']").inner_text()
            print(f"Current badge text: '{badge_text}'")
            assert "Activ" in badge_text, f"Store status did not transition to Activ! Found: '{badge_text}'"
            print("[PASS] Store reactivated from Archive successfully.")

            # -----------------------------------------------------------------
            # TEST SCENARIO 5: Deletion Eligibility for Magazin Principal
            # -----------------------------------------------------------------
            print("\n--- SCENARIO 5: Deletion Eligibility for Magazin Principal ---")
            
            # Locate Magazin Principal row
            owner_selector = f"[data-testid='store-row-{principal_store_id}']"
            page.locator(owner_selector).wait_for(state="visible", timeout=10000)
            
            # Click options menu button
            print("Opening lifecycle options menu on Magazin Principal...")
            page.locator(f"[data-testid='store-lifecycle-menu-{principal_store_id}']").click()
            page.wait_for_timeout(500)
            
            # Click Verifică eligibilitate
            print("Clicking 'Verifica eligibilitate'...")
            page.locator(f"[data-testid='store-action-check-delete-{principal_store_id}']").click()
            
            # Modal check
            print("Verifying StoreDeletionEligibilityModal is visible...")
            page.locator("#store-deletion-eligibility-modal").wait_for(state="visible", timeout=5000)
            
            # Wait for dependency checking loading state to finish
            print("Waiting for eligibility checks to finish...")
            page.locator("text=Se analizează").wait_for(state="hidden", timeout=10000)
            page.wait_for_timeout(500)
            
            # Verify recommended action and blocking of deletion request button
            modal_text = page.locator("#store-deletion-eligibility-modal").inner_text()
            print(f"Eligibility Modal text summary:\n{modal_text.encode('ascii', 'replace').decode('ascii')}")
            
            assert "arhivarea" in modal_text.lower(), "Recommended action to archive not presented in modal!"
            
            # Assert deletion request button is not visible or disabled
            is_req_btn_visible = page.locator("#store-deletion-request-btn").is_visible()
            print(f"Deletion Request button visible: {is_req_btn_visible}")
            assert not is_req_btn_visible, "Deletion Request button should be hidden on ineligible store!"
            
            # Close eligibility modal
            print("Closing eligibility modal...")
            page.locator("#store-deletion-close-btn").click()
            page.locator("#store-deletion-eligibility-modal").wait_for(state="hidden", timeout=5000)
            print("[PASS] Deletion eligibility correctly handled for active commercial store.")

        finally:
            # -----------------------------------------------------------------
            # CLEANUP RESTORATION
            # -----------------------------------------------------------------
            print("\n--- CLEANUP: Restoring test store state via RPC ---")
            restore_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { error } = await supabase.rpc('reactivate_store', {
                    p_store_id: id,
                    p_reason: 'Cleanup: Restore test store to active status'
                });
                return { success: error ? false : true, error: error ? error.message : null };
            }""", test_store_id)
            print(f"Cleanup RPC response: {restore_res}")
            
            # Verify final states of both stores
            final_test_check = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('lifecycle_status, active').eq('id', id).single();
                return data;
            }""", test_store_id)
            print(f"Final test store state check: {final_test_check}")
            
            final_principal_check = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('lifecycle_status, active').eq('id', id).single();
                return data;
            }""", principal_store_id)
            print(f"Final principal store state check: {final_principal_check}")
            
            assert final_test_check['lifecycle_status'] == 'active', "Cleanup failed: Test store did not restore to active lifecycle state!"
            assert final_test_check['active'] == True, "Cleanup failed: Test store did not restore active flag to True!"
            assert final_principal_check['lifecycle_status'] == 'active', "Cleanup failed: Magazin Principal is not active!"
            assert final_principal_check['active'] == True, "Cleanup failed: Magazin Principal active flag is not True!"
            print("[PASS] Cleanup completed successfully.")

        print("\n[SUCCESS] E2E UI Lifecycle Verification Test completed successfully!")
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
