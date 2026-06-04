import sys
import os

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_hardening_tests():
    safe_print("\n=== RUNNING STATIC VERIFICATION FOR OFFLINE DATA CACHE SQL HARDENING (6APP.4) ===")

    sql_path = "database/proposed_offline_data_cache_sales_queue_6app3.sql"
    rollback_path = "database/rollback_offline_data_cache_sales_queue_6app4.sql"
    blueprint_doc_path = "docs/offline_data_cache_sales_queue_blueprint_6app3.md"
    report_doc_path = "docs/offline_data_cache_sales_queue_6app3_report.md"

    # 1. Verify existence of SQL and rollback files
    safe_print("\n--- Checking files existence ---")
    try:
        assert os.path.exists(sql_path), f"Missing SQL file: {sql_path}"
        assert os.path.exists(rollback_path), f"Missing Rollback file: {rollback_path}"
        assert os.path.exists(blueprint_doc_path), f"Missing Blueprint doc: {blueprint_doc_path}"
        assert os.path.exists(report_doc_path), f"Missing Report doc: {report_doc_path}"
        safe_print("[PASS] All required files exist.")
    except AssertionError as e:
        safe_print(f"[FAIL] Check failed: {e}")
        sys.exit(1)

    # 2. Audit SQL Hardening
    safe_print("\n--- Auditing SQL blueprint hardening features ---")
    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            sql = f.read().lower()

        # pos_devices constraints
        assert "pos_devices" in sql, "Missing 'pos_devices' table"
        assert "unique_store_device_fingerprint" in sql or "unique (store_id, device_fingerprint)" in sql, "Missing fingerprint unique constraint"
        assert "check_device_fingerprint_len" in sql or "check (length(trim(device_fingerprint)) >= 12)" in sql, "Missing fingerprint length constraint"
        assert "check_device_name_len" in sql or "check (length(trim(device_name)) >= 2)" in sql, "Missing device name length constraint"

        # offline_sale_sync_log constraints
        assert "offline_sale_sync_log" in sql, "Missing 'offline_sale_sync_log' table"
        assert "unique_store_device_sale" in sql or "unique (store_id, device_id, local_sale_id)" in sql, "Missing sync log unique constraint"
        assert "check_payload_hash_sha256" in sql or "payload_hash ~ '^[a-f0-9]{64}$'" in sql, "Missing SHA-256 validation constraint on payload_hash"
        
        # Whitelists
        assert "check_sync_status" in sql or "status in ('received', 'finalized', 'duplicate', 'conflict', 'failed', 'rejected')" in sql, "Missing status check whitelist"
        assert "check_snapshot_entity" in sql or "entity in ('products', 'product_prices', 'stock_batches', 'categories', 'shifts', 'store_settings', 'fiscalnet_config', 'full_bundle')" in sql, "Missing entity check whitelist"
        assert "check_snapshot_sync_type" in sql or "sync_type in ('full', 'incremental')" in sql, "Missing sync_type check whitelist"

        # Row Level Security
        assert "alter table public.pos_devices enable row level security;" in sql, "Missing RLS activation on pos_devices"
        assert "alter table public.offline_sale_sync_log enable row level security;" in sql, "Missing RLS activation on offline_sale_sync_log"
        assert "alter table public.offline_sync_snapshots enable row level security;" in sql, "Missing RLS activation on offline_sync_snapshots"
        
        # Policy drops
        assert "drop policy if exists" in sql, "Missing 'drop policy if exists' commands"

        # SECURITY DEFINER and search_path on RPCs
        rpc_funcs = ["register_pos_device", "get_offline_cache_bundle", "sync_offline_sale", "get_offline_sync_status"]
        for func in rpc_funcs:
            assert func in sql, f"Missing RPC: {func}"
        
        # Count security definer instances (should be at least 4, one per RPC)
        assert sql.count("security definer") >= 4, "Not all RPCs have SECURITY DEFINER"
        assert sql.count("set search_path = public") >= 4, "Not all RPCs have SET search_path = public"

        # Grants and Revokes
        assert "revoke execute on function" in sql or "revoke execute" in sql, "Missing revoke execution privileges"
        assert "from public" in sql, "Missing revoke execution from PUBLIC"
        assert "from anon" in sql, "Missing revoke execution from anon"
        assert "to authenticated" in sql, "Missing grant execution to authenticated"

        # Audit Logs integration
        assert "audit_logs" in sql, "Missing audit logging integration inside RPCs"

        # FiscalNet offline warning comment/policy
        assert "fiscalnet" in sql or "fiscal" in sql, "Missing FiscalNet configuration context notes"

        safe_print("[PASS] SQL blueprint checks succeeded.")
    except AssertionError as e:
        safe_print(f"[FAIL] SQL blueprint audit failed: {e}")
        sys.exit(1)

    # 3. Audit Rollback Script
    safe_print("\n--- Auditing Rollback script ---")
    try:
        with open(rollback_path, "r", encoding="utf-8") as f:
            rb = f.read().lower()

        # Check drop functions and tables in rollback
        assert "drop function if exists" in rb, "Missing drop functions in rollback"
        assert "drop table if exists" in rb, "Missing drop tables in rollback"
        assert "pos_devices" in rb, "Missing pos_devices cleanup in rollback"
        assert "offline_sale_sync_log" in rb, "Missing offline_sale_sync_log cleanup in rollback"
        assert "offline_sync_snapshots" in rb, "Missing offline_sync_snapshots cleanup in rollback"
        safe_print("[PASS] Rollback script verified successfully.")
    except AssertionError as e:
        safe_print(f"[FAIL] Rollback script audit failed: {e}")
        sys.exit(1)

    # 4. Verify Documentation Warnings
    safe_print("\n--- Auditing documentation warning statements ---")
    try:
        with open(blueprint_doc_path, "r", encoding="utf-8") as f:
            b_doc = f.read().lower()
        with open(report_doc_path, "r", encoding="utf-8") as f:
            r_doc = f.read().lower()

        assert "not implemented" in b_doc or "not implement" in b_doc, "Missing not implemented warning in blueprint"
        assert "not applied" in b_doc or "not apply" in b_doc, "Missing not applied warning in blueprint"
        assert "not implemented" in r_doc or "not implement" in r_doc, "Missing not implemented warning in report"
        assert "not applied" in r_doc or "not apply" in r_doc, "Missing not applied warning in report"

        safe_print("[PASS] Documentation warnings verified successfully.")
    except AssertionError as e:
        safe_print(f"[FAIL] Documentation audit failed: {e}")
        sys.exit(1)

    safe_print("\n=== [SUCCESS] ALL SQL HARDENING STATIC CHECKS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_hardening_tests()
