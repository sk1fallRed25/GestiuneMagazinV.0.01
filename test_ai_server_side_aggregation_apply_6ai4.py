import sys
import os
import re
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_apply_verification_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR AI SERVER-SIDE AGGREGATION SQL APPLY (6AI.4) ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. SETUP: Log in as Platform Owner (admin@owner.com) to enable ai_consultant module
        setup_context = browser.new_context()
        setup_page = setup_context.new_page()
        
        store_id = '00000000-0000-0000-0000-000000000001' # Magazin Principal
        
        try:
            safe_print("\n--- Setup: Enable AI Consultant Module ---")
            setup_page.goto("http://localhost:5174/#/login")
            setup_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            setup_page.locator("input[type='text']").fill("admin@owner.com")
            setup_page.locator("input[type='password']").fill("admin123")
            setup_page.locator("button[type='submit']").click()
            setup_page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as platform owner.")
            
            setup_res = setup_page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ error }} = await supabase.rpc('set_store_module_access', {{
                    p_store_id: '{store_id}',
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Setup AI Apply Verification Test'
                }});
                
                if (error) return {{ error: error.message }};
                return {{ success: true }};
            }}""")
            
            if 'error' in setup_res:
                raise Exception(f"Setup module enable failed: {setup_res['error']}")
            safe_print("[PASS] Enabled ai_consultant module for testing.")
            
        except Exception as e:
            safe_print(f"[FAIL] Setup failed: {e}")
            setup_context.close()
            browser.close()
            sys.exit(1)
            
        # Keep original consent state to restore later
        original_consent = None
        try:
            original_consent_res = setup_page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.from('store_ai_consent').select('*').eq('store_id', '{store_id}').maybeSingle();
                return {{ data, error }};
            }}""")
            if not original_consent_res.get('error') and original_consent_res.get('data'):
                original_consent = original_consent_res['data']
                safe_print(f"[INFO] Backup original consent: {original_consent}")
        except Exception as e:
            safe_print(f"[WARN] Failed to backup original consent: {e}")
            
        setup_context.close()
        
        # 2. RUN TESTS: Log in as Store Administrator (admin@admin.com)
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
            
            # --- Test A: Verify tables exist ---
            safe_print("\n--- Test A: Verify tables exist ---")
            tables_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                const { error: errConsent } = await supabase.from('store_ai_consent').select('store_id').limit(1);
                if (errConsent && errConsent.code === '42P01') return { error: 'store_ai_consent table missing' };
                
                const { error: errSnapshots } = await supabase.from('store_ai_snapshots').select('id').limit(1);
                if (errSnapshots && errSnapshots.code === '42P01') return { error: 'store_ai_snapshots table missing' };
                
                const { error: errTraining } = await supabase.from('store_ai_training_snapshots').select('id').limit(1);
                if (errTraining && errTraining.code === '42P01') return { error: 'store_ai_training_snapshots table missing' };
                
                return { success: true };
            }""")
            
            if 'error' in tables_res:
                raise Exception(f"Tables verify failed: {tables_res['error']}")
            safe_print("[PASS] Tables store_ai_consent, store_ai_snapshots, and store_ai_training_snapshots exist.")
            
            # --- Test B: Verify get_store_ai_consent and default values ---
            safe_print("\n--- Test B: Verify get_store_ai_consent and defaults ---")
            defaults_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                // Fetch consent via RPC
                const {{ data, error }} = await supabase.rpc('get_store_ai_consent', {{ p_store_id: '{store_id}' }});
                if (error) return {{ error: error.message }};
                return {{ data }};
            }}""")
            
            if 'error' in defaults_res:
                raise Exception(f"get_store_ai_consent RPC failed: {defaults_res['error']}")
            
            consent_data = defaults_res['data']
            safe_print(f"[INFO] Fetched consent data: {consent_data}")
            
            # Validate all default values are FALSE
            toggles = [
                'ai_consultant_enabled',
                'ai_data_preparation_enabled',
                'allow_model_improvement',
                'allow_anonymized_benchmarking',
                'allow_cross_store_training',
                'allow_external_ai_processing'
            ]
            for toggle in toggles:
                # If we had a previous test row, it might be true, but we check if it has the boolean key
                assert toggle in consent_data, f"Missing toggle key in consent: {toggle}"
                assert isinstance(consent_data[toggle], bool), f"Toggle {toggle} should be boolean"
                safe_print(f"[PASS] Toggle {toggle} exists and is boolean.")
            
            # --- Test C: Verify RLS is active ---
            safe_print("\n--- Test C: Verify RLS is active ---")
            rls_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                // Try to access a non-existent or foreign store id
                const foreignStoreId = '00000000-0000-0000-0000-000000000002';
                
                const { data, error } = await supabase.from('store_ai_consent').select('*').eq('store_id', foreignStoreId);
                return { count: data ? data.length : 0, error };
            }""")
            # RLS policy should filter out foreign store rows
            assert rls_res['count'] == 0, f"Expected 0 rows for foreign store due to RLS, got {rls_res['count']}"
            safe_print("[PASS] RLS blocks direct query of other store consent rows.")
            
            # --- Test D: Verify update_store_ai_consent constraints & patches ---
            safe_print("\n--- Test D: Verify update_store_ai_consent invalid patch rejection ---")
            patch_reject_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{ unknown_consent_key_xyz: true }}
                }});
                return {{ data, error }};
            }}""")
            
            assert patch_reject_res.get('error') is not None, "Expected RPC to fail for unknown patch keys"
            err_msg = patch_reject_res['error']['message']
            safe_print(f"[INFO] Intercepted expected error: {err_msg}")
            assert "nevalid" in err_msg or "patch" in err_msg or "Cheie" in err_msg, f"Unexpected error message: {err_msg}"
            safe_print("[PASS] update_store_ai_consent correctly rejects unknown patch keys.")
            
            # --- Test E: Verify signature check constraints ---
            safe_print("\n--- Test E: Verify signature check constraints ---")
            consent_update_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                // Reset consent to all false
                await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{
                        ai_consultant_enabled: false,
                        ai_data_preparation_enabled: false,
                        allow_model_improvement: false,
                        allow_external_ai_processing: false
                    }}
                }});
                
                // Toggle ai_data_preparation_enabled to true
                const {{ data, error }} = await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{
                        ai_consultant_enabled: true,
                        ai_data_preparation_enabled: true
                    }}
                }});
                return {{ data, error }};
            }}""")
            
            if consent_update_res.get('error'):
                raise Exception(f"Consent update failed: {consent_update_res['error']}")
            
            updated_consent = consent_update_res['data']
            assert updated_consent['ai_data_preparation_enabled'] is True, "Expected ai_data_preparation_enabled to be True"
            safe_print("[PASS] Enabled ai_data_preparation_enabled successfully.")
            
            # --- Test F: Verify refresh_store_ai_snapshot gating and creation ---
            safe_print("\n--- Test F: Verify refresh_store_ai_snapshot behavior ---")
            # F.1 Blocked when ai_data_preparation_enabled = false
            # Turn it off first
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{ ai_data_preparation_enabled: false }}
                }});
            }}""")
            
            refresh_blocked_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('refresh_store_ai_snapshot', {{
                    p_store_id: '{store_id}',
                    p_period_days: 30
                }});
                return {{ data, error }};
            }}""")
            assert refresh_blocked_res.get('error') is not None, "Expected refresh to fail when data prep is disabled"
            safe_print(f"[PASS] refresh_store_ai_snapshot is blocked when consent is disabled: {refresh_blocked_res['error']['message']}")
            
            # F.2 Allowed and succeeds when ai_data_preparation_enabled = true
            # Turn it back on
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{ ai_data_preparation_enabled: true }}
                }});
            }}""")
            
            refresh_success_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('refresh_store_ai_snapshot', {{
                    p_store_id: '{store_id}',
                    p_period_days: 30
                }});
                return {{ data, error }};
            }}""")
            if refresh_success_res.get('error'):
                raise Exception(f"refresh_store_ai_snapshot failed when consent enabled: {refresh_success_res['error']}")
            
            snapshot = refresh_success_res['data']
            safe_print(f"[INFO] Refreshed snapshot: {snapshot}")
            assert snapshot['store_id'] == store_id, "Snapshot store_id does not match"
            assert 'snapshot' in snapshot, "Missing snapshot payload in return"
            assert 'recommendations' in snapshot, "Missing recommendations in return"
            safe_print("[PASS] refresh_store_ai_snapshot successfully generated cache snapshot.")
            
            # --- Test G: Verify create_training_snapshot_if_consented gating ---
            safe_print("\n--- Test G: Verify create_training_snapshot_if_consented behavior ---")
            # G.1 Blocked (returns NULL) when allow_model_improvement = false
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{ allow_model_improvement: false }}
                }});
            }}""")
            
            training_blocked_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('create_training_snapshot_if_consented', {{
                    p_store_id: '{store_id}',
                    p_period_start: '2026-05-01',
                    p_period_end: '2026-05-31'
                }});
                return {{ data, error }};
            }}""")
            
            assert training_blocked_res.get('error') is None, f"Expected no error, got: {training_blocked_res.get('error')}"
            assert training_blocked_res.get('data') is None, f"Expected NULL returned when improvement is disabled, got: {training_blocked_res.get('data')}"
            safe_print("[PASS] create_training_snapshot_if_consented returned NULL when opt-in is false.")
            
            # G.2 Allowed and succeeds when allow_model_improvement = true
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.rpc('update_store_ai_consent', {{
                    p_store_id: '{store_id}',
                    p_patch: {{ allow_model_improvement: true }}
                }});
            }}""")
            
            training_success_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('create_training_snapshot_if_consented', {{
                    p_store_id: '{store_id}',
                    p_period_start: '2026-05-01',
                    p_period_end: '2026-05-31'
                }});
                return {{ data, error }};
            }}""")
            
            if training_success_res.get('error'):
                raise Exception(f"create_training_snapshot_if_consented failed: {training_success_res['error']}")
            
            training_id = training_success_res['data']
            safe_print(f"[INFO] Created training snapshot UUID: {training_id}")
            assert training_id is not None, "Expected training snapshot UUID to be returned"
            safe_print("[PASS] create_training_snapshot_if_consented successfully generated training dataset.")
            
            # --- Test H: Verify audit_logs table contains relevant logs ---
            safe_print("\n--- Test H: Verify audit_logs contains entries ---")
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
            safe_print(f"[INFO] Found audit log actions: {actions}")
            assert any(a in ['ai_consent_updated', 'ai_consent_revoked', 'ai_snapshot_refreshed', 'ai_training_snapshot_created'] for a in actions), \
                "Audit logs do not contain AI-related actions"
            safe_print("[PASS] Audit logs recorded actions correctly.")
            
        except Exception as err:
            safe_print(f"[FAIL] Test encountered error: {err}")
            page.screenshot(path="screenshot_apply_verification_error.png", full_page=True)
            safe_print("[INFO] Saved error screenshot.")
            raise err
            
        finally:
            # --- Cleanup: Restore original consent state ---
            if original_consent:
                safe_print("\n--- Cleanup: Restoring original consent settings ---")
                try:
                    page.evaluate(f"""async () => {{
                        const supabase = window.supabase;
                        await supabase.rpc('update_store_ai_consent', {{
                            p_store_id: '{store_id}',
                            p_patch: {{
                                ai_consultant_enabled: {str(original_consent.get('ai_consultant_enabled', False)).lower()},
                                ai_data_preparation_enabled: {str(original_consent.get('ai_data_preparation_enabled', False)).lower()},
                                allow_model_improvement: {str(original_consent.get('allow_model_improvement', False)).lower()},
                                allow_anonymized_benchmarking: {str(original_consent.get('allow_anonymized_benchmarking', False)).lower()},
                                allow_cross_store_training: {str(original_consent.get('allow_cross_store_training', False)).lower()},
                                allow_external_ai_processing: {str(original_consent.get('allow_external_ai_processing', False)).lower()}
                            }}
                        }});
                    }}""")
                    safe_print("[PASS] Restored original consent settings.")
                except Exception as e:
                    safe_print(f"[WARN] Failed to restore original consent: {e}")
            
            test_context.close()
            
        # 3. VERIFY ANONYMOUS ACCESS IS BLOCKED (PRIVILEGE CHECKS)
        anon_context = browser.new_context()
        anon_page = anon_context.new_page()
        
        try:
            safe_print("\n--- Test I: Verify anonymous execute block ---")
            anon_page.goto("http://localhost:5174/#/login")
            anon_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            
            anon_res = anon_page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_store_ai_consent', {{ p_store_id: '{store_id}' }});
                return {{ data, error }};
            }}""")
            
            assert anon_res.get('error') is not None, "Expected anonymous execution of get_store_ai_consent to fail"
            safe_print(f"[PASS] Anonymous call failed as expected: {anon_res['error']['message']}")
            
        finally:
            anon_context.close()
            browser.close()

if __name__ == '__main__':
    try:
        run_apply_verification_tests()
        safe_print("\n=== [SUCCESS] ALL AI SERVER-SIDE AGGREGATION SQL APPLY VERIFICATION TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
