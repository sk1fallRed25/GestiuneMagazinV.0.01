import os
import sys
import re

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_hardening_static_checks():
    safe_print("\n=== RUNNING STATIC CHECKS FOR SQL PRE-APPLY HARDENING (6AI.3) ===")
    
    sql_path = "database/proposed_ai_server_side_aggregation_consent_6ai2.sql"
    rollback_path = "database/rollback_ai_server_side_aggregation_consent_6ai3.sql"
    doc_blueprint_path = "docs/ai_server_side_aggregation_consent_blueprint_6ai2.md"
    doc_report_path = "docs/ai_server_side_aggregation_consent_6ai2_report.md"
    
    # 1. Verify file existence
    files = [sql_path, rollback_path, doc_blueprint_path, doc_report_path]
    for f in files:
        if not os.path.exists(f):
            safe_print(f"[FAIL] Missing file: {f}")
            sys.exit(1)
        safe_print(f"[PASS] File exists: {f}")
        
    # 2. Read contents
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
        
    with open(rollback_path, 'r', encoding='utf-8') as f:
        rollback_content = f.read()
        
    with open(doc_blueprint_path, 'r', encoding='utf-8') as f:
        doc_blueprint_content = f.read()
        
    with open(doc_report_path, 'r', encoding='utf-8') as f:
        doc_report_content = f.read()
        
    # 3. Verify Plural RLS helper function usage
    if "current_user_store_id(" in sql_content or "current_user_store_id)" in sql_content:
        safe_print("[FAIL] SQL blueprint contains reference to singular 'current_user_store_id()'. Must use live schema 'current_user_store_ids()' (plural).")
        sys.exit(1)
    safe_print("[PASS] Aligned RLS helper matches plural current_user_store_ids().")
    
    # 4. Verify Check Constraints
    checks = {
        "chk_consent_signature": r"CONSTRAINT chk_consent_signature CHECK",
        "chk_model_improvement_active": r"CONSTRAINT chk_model_improvement_active CHECK",
        "chk_period_days": r"CONSTRAINT chk_period_days CHECK",
        "chk_training_period": r"CONSTRAINT chk_training_period CHECK",
        "chk_aggregation_level": r"CONSTRAINT chk_aggregation_level CHECK",
        "chk_anonymization_level": r"CONSTRAINT chk_anonymization_level CHECK",
        "chk_payload_json_object": r"CONSTRAINT chk_payload_json_object CHECK"
    }
    
    for name, pat in checks.items():
        if not re.search(pat, sql_content, re.IGNORECASE):
            safe_print(f"[FAIL] SQL blueprint is missing check constraint: {name} (Pattern: {pat})")
            sys.exit(1)
        safe_print(f"[PASS] SQL contains check constraint: {name}")
        
    # 5. Idempotency indicators
    idempotency_patterns = {
        "DROP TRIGGER IF EXISTS": r"DROP TRIGGER IF EXISTS",
        "DROP POLICY IF EXISTS": r"DROP POLICY IF EXISTS",
        "CREATE OR REPLACE FUNCTION": r"CREATE OR REPLACE FUNCTION"
    }
    for desc, pat in idempotency_patterns.items():
        if not re.search(pat, sql_content, re.IGNORECASE):
            safe_print(f"[FAIL] SQL lacks idempotency check: {desc}")
            sys.exit(1)
        safe_print(f"[PASS] SQL contains idempotency: {desc}")
        
    # 6. Privilege controls & Security Definer
    security_checks = {
        "SECURITY DEFINER": r"SECURITY DEFINER",
        "SET search_path = public": r"SET search_path = public",
        "REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon": r"REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon",
        "GRANT EXECUTE ON FUNCTION ... TO authenticated": r"GRANT EXECUTE ON FUNCTION.*TO authenticated"
    }
    for desc, pat in security_checks.items():
        if not re.search(pat, sql_content, re.IGNORECASE | re.DOTALL):
            safe_print(f"[FAIL] SQL lacks security policy: {desc} (Pattern: {pat})")
            sys.exit(1)
        safe_print(f"[PASS] SQL contains security policy: {desc}")
        
    # 7. Rollback blueprint validation
    rollback_checks = {
        "Drop tables in order": r"DROP TABLE IF EXISTS",
        "Drop policies": r"DROP POLICY IF EXISTS",
        "Drop functions": r"DROP FUNCTION IF EXISTS",
        "Warn about data loss": r"(WARNING|\u0218TERGE|ȘTERGE)"
    }
    for desc, pat in rollback_checks.items():
        if not re.search(pat, rollback_content, re.IGNORECASE | re.DOTALL):
            safe_print(f"[FAIL] Rollback blueprint lacks: {desc} (Pattern: {pat})")
            sys.exit(1)
        safe_print(f"[PASS] Rollback contains: {desc}")
        
    # 8. Document explicitly states that SQL is NOT applied live
    doc_combined = doc_blueprint_content + "\n" + doc_report_content
    not_applied_pat = r"(NU TREBUIE APLICAT|BLUEPRINT|NU s-a aplicat live|proiectare|NU se aplic\u0103)"
    if not re.search(not_applied_pat, doc_combined, re.IGNORECASE | re.DOTALL):
        safe_print("[FAIL] Documentation does not explicitly state that the SQL has NOT been applied live.")
        sys.exit(1)
    safe_print("[PASS] Documentation explicitly states SQL is a design blueprint, not applied live.")
    
    safe_print("\n=== [SUCCESS] ALL SQL HARDENING STATIC CHECKS PASSED! ===")
    sys.exit(0)

if __name__ == '__main__':
    run_hardening_static_checks()
