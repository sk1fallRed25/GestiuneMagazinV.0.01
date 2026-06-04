import sys
import os
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_apply_verification_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR OFFLINE DATA CACHE SQL APPLY (6APP.5) ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # We will use Magazin Principal for testing
        store_id = '00000000-0000-0000-0000-000000000001'
        test_fingerprint_valid = 'test_device_fingerprint_123456' # 30 chars
        test_fingerprint_invalid = 'short_fprint' # 12 chars check will fail (12 chars exact: 'short_fprint' is 12 chars. Wait, length of 'short_fprint' is 12. Let's use 'short' which is 5 chars)
        test_fingerprint_short = 'short'
        test_device_name = 'POS-TEST-01'

        # 1. RUN TESTS: Log in as Store Administrator (admin@admin.com)
        test_context = browser.new_context(service_workers="block")
        page = test_context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as store administrator.")

            # --- Test A: Verify Tables Exist ---
            safe_print("\n--- Test A: Verify tables exist ---")
            tables_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                const { error: errDevices } = await supabase.from('pos_devices').select('id').limit(1);
                if (errDevices && errDevices.code === '42P01') return { error: 'pos_devices table missing' };
                
                const { error: errLog } = await supabase.from('offline_sale_sync_log').select('id').limit(1);
                if (errLog && errLog.code === '42P01') return { error: 'offline_sale_sync_log table missing' };
                
                const { error: errSnapshots } = await supabase.from('offline_sync_snapshots').select('id').limit(1);
                if (errSnapshots && errSnapshots.code === '42P01') return { error: 'offline_sync_snapshots table missing' };
                
                return { success: true };
            }""")
            
            if 'error' in tables_res:
                raise Exception(f"Tables verify failed: {tables_res['error']}")
            safe_print("[PASS] Tables pos_devices, offline_sale_sync_log, and offline_sync_snapshots exist.")

            # --- Test B: Verify RLS is Enabled ---
            safe_print("\n--- Test B: Verify RLS blocks other stores ---")
            rls_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const foreignStoreId = '00000000-0000-0000-0000-000000000002';
                
                const { data, error } = await supabase.from('pos_devices').select('*').eq('store_id', foreignStoreId);
                return { count: data ? data.length : 0, error };
            }""")
            assert rls_res['count'] == 0, f"RLS failed: expected 0 rows, got {rls_res['count']}"
            safe_print("[PASS] RLS is active on pos_devices.")

            # --- Test C: Register Device validations & execution ---
            safe_print("\n--- Test C: Test register_pos_device ---")
            # C.1 Invalid fingerprint length (should reject)
            reg_fail_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('register_pos_device', {{
                    p_store_id: '{store_id}',
                    p_device_fingerprint: '{test_fingerprint_short}',
                    p_device_name: '{test_device_name}'
                }});
                return {{ data, error }};
            }}""")
            assert reg_fail_res.get('error') is not None, "Expected RPC to fail for short fingerprint length"
            safe_print(f"[PASS] Invalid fingerprint correctly rejected: {reg_fail_res['error']['message']}")

            # C.2 Valid registration
            reg_success_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('register_pos_device', {{
                    p_store_id: '{store_id}',
                    p_device_fingerprint: '{test_fingerprint_valid}',
                    p_device_name: '{test_device_name}'
                }});
                return {{ data, error }};
            }}""")
            if reg_success_res.get('error'):
                raise Exception(f"Device registration failed: {reg_success_res['error']}")
            
            device_id = reg_success_res['data']['id']
            safe_print(f"[PASS] Device registered successfully. ID: {device_id}")

            # C.3 Idempotency check (re-register updates last_seen_at)
            reg_dup_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('register_pos_device', {{
                    p_store_id: '{store_id}',
                    p_device_fingerprint: '{test_fingerprint_valid}',
                    p_device_name: '{test_device_name} (updated)'
                }});
                return {{ data, error }};
            }}""")
            if reg_dup_res.get('error'):
                raise Exception(f"Device duplicate registration failed: {reg_dup_res['error']}")
            assert reg_dup_res['data']['id'] == device_id, "Device ID changed on duplicate registration!"
            assert reg_dup_res['data']['device_name'] == f"{test_device_name} (updated)", "Device name not updated on duplicate registration"
            safe_print("[PASS] register_pos_device is idempotent and supports name updates.")

            # --- Test D: Verify Cache Bundle ---
            safe_print("\n--- Test D: Test get_offline_cache_bundle ---")
            # D.1 Invalid / Inactive device check
            fake_device_id = '00000000-0000-0000-0000-000000000002'
            bundle_fail_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_offline_cache_bundle', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{fake_device_id}'
                }});
                return {{ data, error }};
            }}""")
            assert bundle_fail_res.get('error') is not None, "Expected cache bundle to fail for fake device ID"
            safe_print(f"[PASS] Cache bundle query correctly blocked for invalid device: {bundle_fail_res['error']['message']}")

            # D.2 Success query for valid device
            bundle_success_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_offline_cache_bundle', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{device_id}'
                }});
                return {{ data, error }};
            }}""")
            if bundle_success_res.get('error'):
                raise Exception(f"get_offline_cache_bundle failed: {bundle_success_res['error']}")
            
            bundle = bundle_success_res['data']
            assert 'products' in bundle, "Missing products key in cache bundle"
            assert 'prices' in bundle, "Missing prices key in cache bundle"
            assert 'categories' in bundle, "Missing categories key in cache bundle"
            assert 'metadata' in bundle, "Missing metadata key in cache bundle"
            assert bundle['metadata']['sync_type'] == 'full', "Default sync type must be full"
            safe_print("[PASS] Cache bundle fetched successfully with products, prices, categories, and metadata.")

            # --- Test E: Test sync_offline_sale validations ---
            safe_print("\n--- Test E: Test sync_offline_sale validations ---")
            fake_sale_id = '99999999-9999-9999-9999-999999999999'
            fake_shift_id = '11111111-1111-1111-1111-111111111111'
            invalid_hash = 'short_hash'

            # E.1 Invalid hash (should fail regex constraint)
            sync_hash_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('sync_offline_sale', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{device_id}',
                    p_local_sale_id: '{fake_sale_id}',
                    p_payload_hash: '{invalid_hash}',
                    p_items: [],
                    p_payments: [],
                    p_shift_id: '{fake_shift_id}'
                }});
                return {{ data, error }};
            }}""")
            assert sync_hash_res.get('error') is not None, "Expected invalid hash format to fail"
            safe_print(f"[PASS] Invalid payload_hash format rejected: {sync_hash_res['error']['message']}")

            # E.2 Empty items array (should fail non-empty constraint)
            valid_hash = 'a' * 64
            sync_empty_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('sync_offline_sale', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{device_id}',
                    p_local_sale_id: '{fake_sale_id}',
                    p_payload_hash: '{valid_hash}',
                    p_items: [],
                    p_payments: [],
                    p_shift_id: '{fake_shift_id}'
                }});
                return {{ data, error }};
            }}""")
            assert sync_empty_res.get('error') is not None, "Expected empty items list to fail validation"
            safe_print(f"[PASS] Empty items list correctly rejected: {sync_empty_res['error']['message']}")

            # --- Test F: Test get_offline_sync_status ---
            safe_print("\n--- Test F: Test get_offline_sync_status ---")
            status_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_offline_sync_status', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{device_id}'
                }});
                return {{ data, error }};
            }}""")
            if status_res.get('error'):
                raise Exception(f"get_offline_sync_status failed: {status_res['error']}")
            
            status_info = status_res['data']
            assert status_info['device_id'] == device_id, "Device ID mismatch in status"
            assert status_info['active'] is True, "Device should be active"
            assert 'counts' in status_info, "Missing counts key in status output"
            assert 'cache_health' in status_info, "Missing cache_health key in status output"
            safe_print(f"[PASS] Sync status fetched successfully. Cache health: {status_info['cache_health']}")

            # --- Test G: Verify Audit Logs ---
            safe_print("\n--- Test G: Verify audit logs received entries ---")
            audit_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.from('audit_logs')
                    .select('*')
                    .eq('store_id', '{store_id}')
                    .order('created_at', {{ ascending: false }})
                    .limit(10);
                return {{ data, error }};
            }}""")
            if audit_res.get('error'):
                raise Exception(f"Querying audit_logs failed: {audit_res['error']}")
            
            logs = audit_res['data']
            actions = [log['action'] for log in logs]
            safe_print(f"[INFO] Latest audit log actions: {actions}")
            assert any(a in ['pos_device_registered', 'offline_cache_bundle_requested'] for a in actions), \
                "Audit logs do not contain offline sync events!"
            safe_print("[PASS] Audit logs recorded POS registration and sync bundle queries.")

        except Exception as err:
            safe_print(f"[FAIL] Test encountered error: {err}")
            page.screenshot(path="screenshot_sql_apply_error.png", full_page=True)
            raise err
            
        finally:
            # --- Cleanup: Mark the test device as inactive ---
            safe_print("\n--- Cleanup: Deactivating test device ---")
            try:
                page.evaluate(f"""async () => {{
                    const supabase = window.supabase;
                    await supabase.from('pos_devices').update({{ active: false }}).eq('device_fingerprint', '{test_fingerprint_valid}');
                }}""")
                safe_print("[PASS] Test device set to inactive successfully.")
            except Exception as e:
                safe_print(f"[WARN] Failed to deactivate test device: {e}")
            
            test_context.close()

        # 3. VERIFY ANONYMOUS EXECUTION BLOCKED
        safe_print("\n--- Test H: Verify anonymous execute block ---")
        anon_context = browser.new_context()
        anon_page = anon_context.new_page()
        try:
            anon_page.goto("http://localhost:5174/#/login")
            anon_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            
            anon_res = anon_page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_offline_sync_status', {{
                    p_store_id: '{store_id}',
                    p_device_id: '{device_id}'
                }});
                return {{ data, error }};
            }}""")
            assert anon_res.get('error') is not None, "Expected anonymous execution of get_offline_sync_status to fail"
            safe_print(f"[PASS] Anonymous call failed as expected: {anon_res['error']['message']}")
            
        finally:
            anon_context.close()
            browser.close()

if __name__ == '__main__':
    try:
        run_apply_verification_tests()
        safe_print("\n=== [SUCCESS] ALL OFFLINE DATA CACHE SQL APPLY TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
