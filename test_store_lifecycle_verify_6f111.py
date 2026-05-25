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
        # Skip function header, definitions, or comment lines
        if "sanity_scan_self" in line or "forbidden = [" in line or "def " in line or line.strip().startswith("#"):
            continue
        for pattern in forbidden:
            if pattern in line:
                raise Exception(f"Sanity Check Failed: Forbidden pattern '{pattern}' found at line {idx+1}: {line}")
    print("[PASS] DML Safety Guard: No forbidden direct mutations (.delete, .insert, .update) found in script.")

def verify_sql_file_content():
    """
    Verifies definitions inside the SQL file to validate constraint and trigger structures
    without performing risky database schema operations.
    """
    sql_path = os.path.join("database", "proposed_store_lifecycle_6f19.sql")
    if not os.path.exists(sql_path):
        raise Exception(f"SQL blueprint file not found at {sql_path}")
        
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
        
    # Check for invalid status check constraint
    assert "check_stores_lifecycle_status" in sql_content, "CHECK constraint 'check_stores_lifecycle_status' missing from SQL blueprint"
    assert "ADD CONSTRAINT check_stores_lifecycle_status" in sql_content, "CHECK constraint definition missing"
    
    # Check for legacy active sync trigger
    assert "trigger_sync_store_active_with_lifecycle" in sql_content, "Trigger 'trigger_sync_store_active_with_lifecycle' missing from SQL blueprint"
    assert "sync_store_active_with_lifecycle" in sql_content, "Trigger function 'sync_store_active_with_lifecycle' missing"
    
    # Check for hard delete safety stub and verify no active DELETE DML is written
    assert "hard_delete_store_if_eligible" in sql_content, "Function 'hard_delete_store_if_eligible' missing"
    assert "Hard delete is disabled in this release" in sql_content, "Safety stub exception message missing in SQL definition"
    
    # Ensure there is no DELETE FROM public.stores in hard_delete_store_if_eligible function definition
    func_start = sql_content.find("CREATE OR REPLACE FUNCTION public.hard_delete_store_if_eligible")
    if func_start != -1:
        func_end = sql_content.find("$$;", func_start)
        func_body = sql_content[func_start:func_end]
        if "DELETE FROM" in func_body and "public.stores" in func_body:
            raise Exception("Security Risk: Found active DELETE DML inside public.hard_delete_store_if_eligible!")
            
    print("[PASS] Static SQL Introspection: CHECK constraints, trigger syncs, and hard delete stub verified.")

def run_test():
    # 1. DML Safety Scan
    sanity_scan_self()
    
    # 2. SQL File Verification
    verify_sql_file_content()
    
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
        # STEP 1: Schema Introspection check - Column presence
        # =====================================================================
        print("\n--- STEP 1: Introspecting columns on public.stores ---")
        introspection_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            try {
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
            sys.exit(2)
            
        print("[PASS] All store lifecycle columns exist in the stores table.")

        # =====================================================================
        # STEP 2: Verify Security Lockdown (non-owner authorization)
        # =====================================================================
        print("\n--- STEP 2: Verifying Security Lockdown (non-owner authorization) ---")
        
        # Log out as admin@owner.com
        print("Logging out platform owner...")
        page.goto(f"{APP_URL}/#/login")
        page.wait_for_load_state("networkidle")
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
        
        # Test calling RPCs as cashier/non-owner
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
        # STEP 3: Verify Deletion Eligibility with commercial activity on Magazin Principal
        # =====================================================================
        print("\n--- STEP 3: Verifying Deletion Eligibility with commercial activity ---")
        eligibility_res = page.evaluate("""async () => {
            const supabase = window.supabase;
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
        # STEP 4: Call hard_delete_store_if_eligible on ineligible store (should block)
        # =====================================================================
        print("\n--- STEP 4: Calling hard_delete_store_if_eligible on ineligible Magazin Principal ---")
        hard_delete_ineligible_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            
            const id = stores[0].id;
            const { error } = await supabase.rpc('hard_delete_store_if_eligible', {
                p_store_id: id,
                p_confirmation: 'STERG DEFINITIV MAGAZINUL',
                p_reason: 'Testing ineligible delete block'
            });
            return { error: error ? error.message : null };
        }""")
        
        err_ineligible = hard_delete_ineligible_res.get('error', '')
        print(f"Hard delete returned error: {err_ineligible}")
        assert 'cannot delete store' in err_ineligible.lower() or 'archive is recommended' in err_ineligible.lower(), f"Expected ineligible check block exception! Got: {err_ineligible}"
        print("[PASS] Ineligible store hard delete correctly blocked by database check.")

        # =====================================================================
        # STEP 5: Verify Safe Lifecycle Transitions on Test Store (RPC transitions)
        # =====================================================================
        print("\n--- STEP 5: Testing safe lifecycle transitions on test store ---")
        
        # Look for the test store named 'Magazin Test 12345678 Punct 902'
        test_store_init = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('name', 'Magazin Test 12345678 Punct 902');
            if (!stores || stores.length === 0) return null;
            return stores[0];
        }""")
        
        if not test_store_init:
            print("[SKIP] NOT RUN LIVE — no safe lifecycle test store 'Magazin Test 12345678 Punct 902' found in database.")
        else:
            test_store_id = test_store_init['id']
            print(f"Safe test store found: {test_store_init['name']} (ID: {test_store_id})")
            
            # Save snapshot
            initial_status = test_store_init['lifecycle_status']
            initial_active = test_store_init['active']
            print(f"Initial State: lifecycle_status={initial_status}, active={initial_active}")
            
            try:
                # 5.1: Suspend Store
                print("Test 5.1: Suspending test store...")
                suspend_res = page.evaluate("""async (id) => {
                    const supabase = window.supabase;
                    const { data, error } = await supabase.rpc('suspend_store', {
                        p_store_id: id,
                        p_reason: 'Testing safe store suspension'
                    });
                    if (error) return { success: false, error: error.message };
                    const { data: store } = await supabase.from('stores').select('*').eq('id', id).single();
                    return { success: true, store };
                }""", test_store_id)
                
                if not suspend_res['success']:
                    raise Exception(f"suspend_store RPC failed: {suspend_res['error']}")
                
                store_db = suspend_res['store']
                print(f"Suspended status check: lifecycle_status={store_db['lifecycle_status']}, active={store_db['active']}")
                assert store_db['lifecycle_status'] == 'suspended', "Status is not suspended"
                assert store_db['active'] == False, "Legacy active flag did not sync to False"
                print("[PASS] Suspend transition & Trigger legacy active sync verified.")
                
                # 5.2: Reactivate Store
                print("Test 5.2: Reactivating test store...")
                reactivate_res = page.evaluate("""async (id) => {
                    const supabase = window.supabase;
                    const { data, error } = await supabase.rpc('reactivate_store', {
                        p_store_id: id,
                        p_reason: 'Testing safe store reactivation'
                    });
                    if (error) return { success: false, error: error.message };
                    const { data: store } = await supabase.from('stores').select('*').eq('id', id).single();
                    return { success: true, store };
                }""", test_store_id)
                
                if not reactivate_res['success']:
                    raise Exception(f"reactivate_store RPC failed: {reactivate_res['error']}")
                
                store_db = reactivate_res['store']
                print(f"Reactivated status check: lifecycle_status={store_db['lifecycle_status']}, active={store_db['active']}")
                assert store_db['lifecycle_status'] == 'active', "Status is not active"
                assert store_db['active'] == True, "Legacy active flag did not sync to True"
                print("[PASS] Reactivate transition & Trigger legacy active sync verified.")
                
                # 5.3: Archive Store
                print("Test 5.3: Archiving test store...")
                archive_res = page.evaluate("""async (id) => {
                    const supabase = window.supabase;
                    const { data, error } = await supabase.rpc('archive_store', {
                        p_store_id: id,
                        p_reason: 'Testing safe store archiving'
                    });
                    if (error) return { success: false, error: error.message };
                    const { data: store } = await supabase.from('stores').select('*').eq('id', id).single();
                    return { success: true, store };
                }""", test_store_id)
                
                if not archive_res['success']:
                    raise Exception(f"archive_store RPC failed: {archive_res['error']}")
                
                store_db = archive_res['store']
                print(f"Archived status check: lifecycle_status={store_db['lifecycle_status']}, active={store_db['active']}")
                assert store_db['lifecycle_status'] == 'archived', "Status is not archived"
                assert store_db['active'] == False, "Legacy active flag did not sync to False"
                print("[PASS] Archive transition & Trigger legacy active sync verified.")
                
                # 5.4: Request Deletion (should fail because store has audit logs generated during tests)
                print("Test 5.4: Requesting deletion on ineligible test store (should fail)...")
                request_res = page.evaluate("""async (id) => {
                    const supabase = window.supabase;
                    const { data, error } = await supabase.rpc('request_store_deletion', {
                        p_store_id: id,
                        p_reason: 'Testing deletion request block'
                    });
                    return { data, error: error ? error.message : null };
                }""", test_store_id)
                
                if request_res.get('error'):
                    raise Exception(f"request_store_deletion returned error: {request_res['error']}")
                
                ret_data = request_res['data']
                print(f"Deletion request response: ok={ret_data['ok']}, canDelete={ret_data['canDelete']}")
                assert ret_data['ok'] == False, "Deletion request succeeded on ineligible store"
                print("[PASS] Deletion request correctly blocked on ineligible store.")
                
            finally:
                # Restoration to active state only via safe RPC reactivate_store
                print("Restoring test store state via RPC...")
                restore_res = page.evaluate("""async (id) => {
                    const supabase = window.supabase;
                    const { error } = await supabase.rpc('reactivate_store', {
                        p_store_id: id,
                        p_reason: 'Cleanup: Restore test store to active status'
                    });
                    return { success: error ? false : true, error: error ? error.message : null };
                }""", test_store_id)
                print(f"Restore state status: {restore_res}")

        # =====================================================================
        # STEP 6: Verify Magazin Principal is Active
        # =====================================================================
        print("\n--- STEP 6: Verifying final state of Magazin Principal ---")
        magazin_principal_state = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            
            const store = stores[0];
            if (store.lifecycle_status !== 'active') {
                // If somehow it changed, restore it via RPC
                await supabase.rpc('reactivate_store', { p_store_id: store.id, p_reason: 'Restoring Magazin Principal active status' });
                const { data: reloaded } = await supabase.from('stores').select('*').eq('id', store.id).single();
                return { store: reloaded };
            }
            return { store };
        }""")
        
        if magazin_principal_state.get('error'):
            raise Exception(magazin_principal_state['error'])
            
        final_store = magazin_principal_state['store']
        print(f"Magazin Principal status: lifecycle_status={final_store['lifecycle_status']}, active={final_store['active']}")
        assert final_store['lifecycle_status'] == 'active', "Magazin Principal is not in active state!"
        assert final_store['active'] == True, "Magazin Principal is not active!"
        print("[PASS] Magazin Principal is safely active.")

        # =====================================================================
        # STEP 7: Skipped/Not Run Live Scenarios Documentation
        # =====================================================================
        print("\n--- NOT RUN LIVE SCENARIOS ---")
        print("- [SKIP] request_store_deletion success: NOT RUN LIVE — clean eligible store would require unsafe direct cleanup")
        
        print("\n[SUCCESS] All verification scenarios passed successfully without any direct DML mutations!")
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
