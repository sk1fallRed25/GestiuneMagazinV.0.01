# -*- coding: utf-8 -*-
import sys
import time
from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:5173"

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Log browser console messages safely avoiding Windows encoding crashes
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))

        def handle_dialog(dialog):
            print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)
        
        print("1. Navigating to login...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
        
        print("2. Logging in as admin@owner.com...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in successfully.")

        # =====================================================================
        # STEP 1: Introspection check - Column presence
        # =====================================================================
        print("\n--- STEP 1: Introspecting columns on public.stores ---")
        introspection_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            try {
                // Try selecting all the new lifecycle columns
                const { data, error } = await supabase.from('stores')
                    .select('id, name, lifecycle_status, suspended_at, suspended_by, suspension_reason, archived_at, archived_by, archive_reason, deletion_requested_at, deletion_requested_by, deletion_reason')
                    .limit(1);
                if (error) {
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }""")
        
        if not introspection_res['success']:
            print(f"[FAIL] Column Introspection failed: {introspection_res['error']}")
            print("\n" + "="*80)
            print("WARNING: Store Lifecycle columns are missing in the database.")
            print("Please apply 'database/proposed_store_lifecycle_6f19.sql' in your Supabase SQL Editor!")
            print("="*80 + "\n")
            browser.close()
            sys.exit(2)  # Return code 2 indicates SQL not applied
            
        print("[PASS] All store lifecycle columns exist in the stores table.")

        # =====================================================================
        # STEP 2: Verify Check Constraints and Trigger behavior
        # =====================================================================
        print("\n--- STEP 2: Verifying check constraints and trigger behavior ---")
        
        # Test 2.1: Check constraint (invalid lifecycle_status)
        print("Test 2.1: Inserting invalid status value (should violate check constraint)...")
        constraint_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data, error } = await supabase.from('stores').insert({
                name: 'Constraint Test Store',
                fiscal_code: '88888888',
                lifecycle_status: 'invalid_status_val'
            }).select('id');
            return { error: error ? error.message : null };
        }""")
        
        err_msg = constraint_res.get('error', '')
        if err_msg and 'violates check constraint' in err_msg.lower():
            print("[PASS] Check constraint check_stores_lifecycle_status successfully blocked invalid value.")
        else:
            raise Exception(f"Check constraint failed to block invalid status! Error received: {err_msg}")

        # Test 2.2: Trigger behavior (legacy 'active' sync)
        print("Test 2.2: Creating temporary store to test trigger sync...")
        trigger_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            
            // Insert new store with lifecycle_status='active'
            const { data: store, error: insErr } = await supabase.from('stores').insert({
                name: 'Trigger Test Store',
                fiscal_code: '77777777',
                lifecycle_status: 'active'
            }).select('*').single();
            
            if (insErr) return { success: false, error: insErr.message };
            const activeBefore = store.active;
            
            // Update to suspended
            const { data: updated, error: updErr } = await supabase.from('stores')
                .update({ lifecycle_status: 'suspended' })
                .eq('id', store.id)
                .select('*').single();
                
            if (updErr) {
                // cleanup before exit
                await supabase.from('stores').delete().eq('id', store.id);
                return { success: false, error: updErr.message };
            }
            const activeAfter = updated.active;
            
            // Cleanup
            await supabase.from('stores').delete().eq('id', store.id);
            
            return { success: true, activeBefore, activeAfter };
        }""")
        
        if not trigger_res['success']:
            raise Exception(f"Trigger test failed: {trigger_res['error']}")
            
        print(f"Trigger Results: active before (status active): {trigger_res['activeBefore']}, active after (status suspended): {trigger_res['activeAfter']}")
        assert trigger_res['activeBefore'] == True, "Trigger did not set active to true when lifecycle was active"
        assert trigger_res['activeAfter'] == False, "Trigger did not set active to false when lifecycle was suspended"
        print("[PASS] Trigger sync_store_active_with_lifecycle successfully synchronizes active state.")

        # =====================================================================
        # STEP 3: Verify platform_owner Security Lockdown (RPC Level)
        # =====================================================================
        print("\n--- STEP 3: Verifying Security Lockdown (non-owner authorization) ---")
        
        # Log out as admin@owner.com
        print("Logging out platform owner...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
        # Click logout if already logged in, or just clear supabase storage
        page.evaluate("async () => { await window.supabase.auth.signOut(); }")
        page.reload()
        page.wait_for_load_state("networkidle")
        
        # Log in as non-owner (admin@admin.com)
        print("Logging in as non-owner (admin@admin.com)...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        page.locator("text=Magazin Principal").wait_for(state="visible", timeout=15000)
        print("Logged in as non-owner.")
        
        # Test calling RPCs as cashier
        security_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const dummyId = '00000000-0000-0000-0000-000000000000';
            
            const results = {};
            
            try {
                const { error } = await supabase.rpc('get_store_lifecycle_status', { p_store_id: dummyId });
                results.get_status = error ? error.message : 'no_error';
            } catch (e) { results.get_status = e.message; }
            
            try {
                const { error } = await supabase.rpc('suspend_store', { p_store_id: dummyId, p_reason: 'Testing' });
                results.suspend = error ? error.message : 'no_error';
            } catch (e) { results.suspend = e.message; }
            
            try {
                const { error } = await supabase.rpc('reactivate_store', { p_store_id: dummyId, p_reason: 'Testing' });
                results.reactivate = error ? error.message : 'no_error';
            } catch (e) { results.reactivate = e.message; }
            
            try {
                const { error } = await supabase.rpc('archive_store', { p_store_id: dummyId, p_reason: 'Testing' });
                results.archive = error ? error.message : 'no_error';
            } catch (e) { results.archive = e.message; }
            
            try {
                const { error } = await supabase.rpc('get_store_deletion_eligibility', { p_store_id: dummyId });
                results.get_eligibility = error ? error.message : 'no_error';
            } catch (e) { results.get_eligibility = e.message; }
            
            try {
                const { error } = await supabase.rpc('request_store_deletion', { p_store_id: dummyId, p_reason: 'Testing' });
                results.request_deletion = error ? error.message : 'no_error';
            } catch (e) { results.request_deletion = e.message; }
            
            try {
                const { error } = await supabase.rpc('cancel_store_deletion_request', { p_store_id: dummyId, p_reason: 'Testing' });
                results.cancel_deletion = error ? error.message : 'no_error';
            } catch (e) { results.cancel_deletion = e.message; }
            
            try {
                const { error } = await supabase.rpc('hard_delete_store_if_eligible', { p_store_id: dummyId, p_confirmation: 'STERG DEFINITIV MAGAZINUL', p_reason: 'Testing' });
                results.hard_delete = error ? error.message : 'no_error';
            } catch (e) { results.hard_delete = e.message; }
            
            return results;
        }""")
        
        print("Non-owner RPC response errors:")
        for rpc_name, err in security_res.items():
            print(f"  - {rpc_name}: {err}")
            assert 'access denied' in err.lower() or 'violates row-level security' in err.lower() or 'permission denied' in err.lower() or 'does not exist' in err.lower(), f"RPC {rpc_name} was not locked down! Error: {err}"
            
        print("[PASS] Security lockdown confirmed. Non-owners cannot access any store lifecycle RPCs.")

        # =====================================================================
        # LOG IN BACK AS OWNER FOR THE REST OF THE TESTS
        # =====================================================================
        print("\nRe-logging in as platform owner...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
        page.evaluate("async () => { await window.supabase.auth.signOut(); }")
        page.reload()
        page.wait_for_load_state("networkidle")
        
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)

        # =====================================================================
        # STEP 4: Verify Deletion Eligibility with commercial activity
        # =====================================================================
        print("\n--- STEP 4: Verifying Deletion Eligibility with commercial activity ---")
        eligibility_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            // Fetch Magazin Principal
            const { data: stores } = await supabase.from('stores').select('*').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            
            const store = stores[0];
            const { data: eligibility, error } = await supabase.rpc('get_store_deletion_eligibility', { p_store_id: store.id });
            return { eligibility, error: error ? error.message : null };
        }""")
        
        if eligibility_res.get('error'):
            raise Exception(f"get_store_deletion_eligibility RPC failed: {eligibility_res['error']}")
            
        eligibility = eligibility_res['eligibility']
        print(f"Magazin Principal deletion eligibility: canDelete = {eligibility['canDelete']}, recommendedAction = {eligibility['recommendedAction']}")
        print(f"Counts reported: {eligibility['counts']}")
        
        assert eligibility['canDelete'] == False, "Magazin Principal with commercial activity was marked as eligible for deletion!"
        assert eligibility['recommendedAction'] == 'archive', "Recommended action should be archive for active store!"
        print("[PASS] Deletion eligibility correctly blocks deletion on active store and reports dependencies.")

        # =====================================================================
        # STEP 5: Verify Full Transition Cycle and Audit Logging on a Test Store
        # =====================================================================
        print("\n--- STEP 5: Testing full transition cycle and audit logging ---")
        
        # Test 5.1: Create temp store
        print("Test 5.1: Creating test store 'Verify Test Store'...")
        create_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            
            // Cleanup previous test stores if any
            const { data: old } = await supabase.from('stores').select('id').eq('fiscal_code', '99999999');
            if (old && old.length > 0) {
                for (const o of old) {
                    await supabase.from('store_members').delete().eq('store_id', o.id);
                    await supabase.from('audit_logs').delete().eq('store_id', o.id);
                    await supabase.from('stores').delete().eq('id', o.id);
                }
            }
            
            const { data, error } = await supabase.from('stores').insert({
                name: 'Verify Test Store',
                fiscal_code: '99999999',
                lifecycle_status: 'active'
            }).select('*').single();
            
            return { store: data, error: error ? error.message : null };
        }""")
        
        if create_res.get('error'):
            raise Exception(f"Failed to create test store: {create_res['error']}")
            
        test_store = create_res['store']
        store_id = test_store['id']
        print(f"Test Store created successfully. ID: {store_id}")
        
        try:
            # Test 5.2: Hard Delete Stub Defensive Check on Clean Store (Should be blocked by release stub exception!)
            print("Test 5.2: Calling hard_delete_store_if_eligible on clean store (eligible but stubbed)...")
            hard_delete_clean_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { error } = await supabase.rpc('hard_delete_store_if_eligible', {
                    p_store_id: id,
                    p_confirmation: 'STERG DEFINITIV MAGAZINUL',
                    p_reason: 'Attempting E2E delete on clean store'
                });
                return { error: error ? error.message : null };
            }""", store_id)
            
            err_clean = hard_delete_clean_res.get('error', '')
            print(f"Hard delete on clean store returned: {err_clean}")
            assert 'hard delete is disabled in this release' in err_clean.lower() or 'use archive_store' in err_clean.lower(), f"Expected stub exception on clean store! Got: {err_clean}"
            print("[PASS] Clean store hard delete correctly blocked by release safety stub.")

            # Test 5.3: Request Deletion (when store is completely clean - should succeed!)
            print("Test 5.3: Requesting deletion on clean store...")
            request_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('request_store_deletion', {
                    p_store_id: id,
                    p_reason: 'Testing store request deletion'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if request_res.get('error'):
                raise Exception(f"request_store_deletion failed: {request_res['error']}")
            print(f"Request deletion returned: {request_res['data']}")
            assert request_res['data']['lifecycleStatus'] == 'pending_deletion', "Lifecycle status not pending_deletion"
            
            status_db = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('*').eq('id', id).single();
                return data;
            }""", store_id)
            assert status_db['lifecycle_status'] == 'pending_deletion', "DB status not pending_deletion"
            assert status_db['active'] == False, "DB active boolean is not false"
            print("  - Request deletion verified in DB.")

            # Test 5.4: Cancel Deletion Request
            print("Test 5.4: Cancelling deletion request...")
            cancel_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('cancel_store_deletion_request', {
                    p_store_id: id,
                    p_reason: 'Testing cancel deletion'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if cancel_res.get('error'):
                raise Exception(f"cancel_store_deletion_request failed: {cancel_res['error']}")
            print(f"Cancel deletion returned: {cancel_res['data']}")
            assert cancel_res['data']['lifecycleStatus'] == 'active', "Lifecycle status not active after cancel"
            
            status_db = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('*').eq('id', id).single();
                return data;
            }""", store_id)
            assert status_db['lifecycle_status'] == 'active', "DB status not active after cancel"
            assert status_db['active'] == True, "DB active boolean is not true"
            print("  - Cancel deletion request verified.")

            # Test 5.5: Suspend
            print("Test 5.5: Suspending store...")
            suspend_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('suspend_store', {
                    p_store_id: id,
                    p_reason: 'Testing store suspension'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if suspend_res.get('error'):
                raise Exception(f"suspend_store failed: {suspend_res['error']}")
            print(f"Suspend returned: {suspend_res['data']}")
            assert suspend_res['data']['lifecycleStatus'] == 'suspended', "Lifecycle status not suspended"
            
            status_db = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('*').eq('id', id).single();
                return data;
            }""", store_id)
            assert status_db['lifecycle_status'] == 'suspended', "DB status not suspended"
            assert status_db['active'] == False, "DB active boolean is not false"
            print("  - Suspend verified in DB and legacy sync active=false.")
            
            # Test 5.6: Reactivate
            print("Test 5.6: Reactivating store from suspended...")
            reactivate_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('reactivate_store', {
                    p_store_id: id,
                    p_reason: 'Testing store reactivation'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if reactivate_res.get('error'):
                raise Exception(f"reactivate_store failed: {reactivate_res['error']}")
            print(f"Reactivate returned: {reactivate_res['data']}")
            assert reactivate_res['data']['lifecycleStatus'] == 'active', "Lifecycle status not active"
            
            status_db = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('*').eq('id', id).single();
                return data;
            }""", store_id)
            assert status_db['lifecycle_status'] == 'active', "DB status not active"
            assert status_db['active'] == True, "DB active boolean is not true"
            print("  - Reactivate verified in DB and legacy sync active=true.")

            # Test 5.7: Archive
            print("Test 5.7: Archiving store...")
            archive_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('archive_store', {
                    p_store_id: id,
                    p_reason: 'Testing store archiving'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if archive_res.get('error'):
                raise Exception(f"archive_store failed: {archive_res['error']}")
            print(f"Archive returned: {archive_res['data']}")
            assert archive_res['data']['lifecycleStatus'] == 'archived', "Lifecycle status not archived"
            
            status_db = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('stores').select('*').eq('id', id).single();
                return data;
            }""", store_id)
            assert status_db['lifecycle_status'] == 'archived', "DB status not archived"
            assert status_db['active'] == False, "DB active boolean is not false"
            print("  - Archive verified in DB and legacy sync active=false.")

            # Test 5.8: Request Deletion (should now be BLOCKED because store has audit logs!)
            print("Test 5.8: Requesting deletion when store has audit logs (should be blocked)...")
            request_blocked_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data, error } = await supabase.rpc('request_store_deletion', {
                    p_store_id: id,
                    p_reason: 'Testing blocked request deletion'
                });
                return { data, error: error ? error.message : null };
            }""", store_id)
            
            if request_blocked_res.get('error'):
                raise Exception(f"request_store_deletion RPC failed to return normally: {request_blocked_res['error']}")
            print(f"Request deletion returned: {request_blocked_res['data']}")
            assert request_blocked_res['data']['ok'] == False, "Store with audit logs was allowed to request deletion"
            assert request_blocked_res['data']['canDelete'] == False, "Store with audit logs was marked eligible for deletion"
            print("  - Deletion request correctly blocked due to audit logs dependency.")

            # Test 5.9: Hard Delete Eligibility Block Check (Should throw ineligible exception!)
            print("Test 5.9: Calling hard_delete_store_if_eligible when store is ineligible (should throw ineligible exception)...")
            hard_delete_ineligible_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { error } = await supabase.rpc('hard_delete_store_if_eligible', {
                    p_store_id: id,
                    p_confirmation: 'STERG DEFINITIV MAGAZINUL',
                    p_reason: 'Attempting ineligible E2E delete'
                });
                return { error: error ? error.message : null };
            }""", store_id)
            
            err_ineligible = hard_delete_ineligible_res.get('error', '')
            print(f"Hard delete returned error: {err_ineligible}")
            assert 'cannot delete store: store has historical operational activity' in err_ineligible.lower() or 'archive is recommended' in err_ineligible.lower(), f"Expected ineligible check block exception! Got: {err_ineligible}"
            print("[PASS] Ineligible store hard delete correctly blocked by dependency checks.")

            # Test 5.10: Audit Logs Check
            print("Test 5.10: Verifying audit logs written to DB...")
            audit_logs = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                const { data } = await supabase.from('audit_logs').select('*').eq('store_id', id).order('created_at', { ascending: true });
                return data;
            }""", store_id)
            
            print(f"Audit logs found for store: {len(audit_logs)}")
            actions = [log['action'] for log in audit_logs]
            print(f"Actions logged: {actions}")
            
            assert 'store.deletion_request' in actions, "store.deletion_request log missing"
            assert 'store.cancel_deletion' in actions, "store.cancel_deletion log missing"
            assert 'store.suspend' in actions, "store.suspend log missing"
            assert 'store.reactivate' in actions, "store.reactivate log missing"
            assert 'store.archive' in actions, "store.archive log missing"
            assert 'store.hard_delete_blocked' in actions, "store.hard_delete_blocked log missing"
            
            # Check for sensitive info leak in logs
            for log in audit_logs:
                log_str = str(log).lower()
                for secret in ['password', 'token', 'jwt']:
                    assert secret not in log_str, f"Sensitive keyword '{secret}' found in audit log: {log}"
                    
            print("[PASS] Audit logs fully verified. All transitions are logged with no secrets leakage.")

        finally:
            # =====================================================================
            # CLEANUP: Delete temporary store
            # =====================================================================
            print("\n--- CLEANUP: Deleting test store and members/logs ---")
            cleanup_res = page.evaluate("""async (id) => {
                const supabase = window.supabase;
                await supabase.from('store_members').delete().eq('store_id', id);
                await supabase.from('audit_logs').delete().eq('store_id', id);
                const { error } = await supabase.from('stores').delete().eq('id', id);
                return { success: error ? false : true, error: error ? error.message : null };
            }""", store_id)
            print(f"Cleanup status: {cleanup_res}")
            
        print("\n[SUCCESS] All verification scenarios passed successfully!")
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
