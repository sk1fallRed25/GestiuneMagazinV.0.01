import sys
import os

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_blueprint_tests():
    safe_print("\n=== RUNNING STATIC VERIFICATION FOR OFFLINE DATA CACHE & SALES QUEUE BLUEPRINT (6APP.3) ===")
    
    # 1. Verify SQL Blueprint file
    safe_print("\n--- Verifying SQL Blueprint file ---")
    sql_path = "database/proposed_offline_data_cache_sales_queue_6app3.sql"
    try:
        assert os.path.exists(sql_path), f"Missing SQL file: {sql_path}"
        with open(sql_path, "r", encoding="utf-8") as f:
            sql = f.read().lower()
            
        required_sql_terms = [
            "pos_devices",
            "offline_sale_sync_log",
            "offline_sync_snapshots",
            "register_pos_device",
            "get_offline_cache_bundle",
            "sync_offline_sale",
            "security definer",
            "set search_path = public"
        ]
        
        for term in required_sql_terms:
            assert term in sql, f"SQL Blueprint is missing required component: '{term}'!"
            
        safe_print("[PASS] SQL Blueprint verified successfully.")
    except Exception as e:
        safe_print(f"[FAIL] SQL Blueprint validation failed: {e}")
        sys.exit(1)

    # 2. Verify Design Documentation
    safe_print("\n--- Verifying Design Blueprint Documentation ---")
    doc_path = "docs/offline_data_cache_sales_queue_blueprint_6app3.md"
    try:
        assert os.path.exists(doc_path), f"Missing Blueprint doc: {doc_path}"
        with open(doc_path, "r", encoding="utf-8") as f:
            doc = f.read().lower()
            
        required_doc_terms = [
            "sqlite",
            "incremental sync",
            "24",
            "48",
            "backup",
            "recovery",
            "fiscalnet",
            "idempotency",
            "payload_hash",
            "conflict",
            "not implemented"
        ]
        
        for term in required_doc_terms:
            assert term in doc, f"Design Blueprint is missing documentation details for: '{term}'!"
            
        safe_print("[PASS] Design Blueprint verified successfully.")
    except Exception as e:
        safe_print(f"[FAIL] Design Blueprint validation failed: {e}")
        sys.exit(1)

    # 3. Verify Report file
    safe_print("\n--- Verifying Report file ---")
    report_path = "docs/offline_data_cache_sales_queue_6app3_report.md"
    try:
        assert os.path.exists(report_path), f"Missing Report doc: {report_path}"
        safe_print("[PASS] Report file exists.")
    except Exception as e:
        safe_print(f"[FAIL] Report file validation failed: {e}")
        sys.exit(1)

    safe_print("\n=== [SUCCESS] ALL BLUEPRINT VERIFICATION CHECKS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_blueprint_tests()
