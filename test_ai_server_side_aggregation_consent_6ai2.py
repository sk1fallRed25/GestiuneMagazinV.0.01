import os
import sys
import re

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_tests():
    safe_print("\n=== RUNNING STATIC CHECKS FOR AI SERVER-SIDE AGGREGATION & CONSENT (6AI.2) ===")
    
    sql_path = "database/proposed_ai_server_side_aggregation_consent_6ai2.sql"
    doc_blueprint_path = "docs/ai_server_side_aggregation_consent_blueprint_6ai2.md"
    doc_report_path = "docs/ai_server_side_aggregation_consent_6ai2_report.md"
    
    # 1. Check file existence
    files_to_check = [sql_path, doc_blueprint_path, doc_report_path]
    for f in files_to_check:
        if not os.path.exists(f):
            safe_print(f"[FAIL] Missing file: {f}")
            sys.exit(1)
        safe_print(f"[PASS] File exists: {f}")
        
    # 2. Read files for pattern checks
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
        
    with open(doc_blueprint_path, 'r', encoding='utf-8') as f:
        doc_blueprint_content = f.read()
        
    with open(doc_report_path, 'r', encoding='utf-8') as f:
        doc_report_content = f.read()
        
    # 3. Check SQL blueprints content rules
    sql_patterns = {
        "store_ai_consent table": r"CREATE TABLE( IF NOT EXISTS)? public\.store_ai_consent",
        "store_ai_snapshots table": r"CREATE TABLE( IF NOT EXISTS)? public\.store_ai_snapshots",
        "store_ai_training_snapshots table": r"CREATE TABLE( IF NOT EXISTS)? public\.store_ai_training_snapshots",
        "allow_model_improvement default FALSE": r"allow_model_improvement BOOLEAN[^,]+DEFAULT FALSE",
        "allow_cross_store_training default FALSE": r"allow_cross_store_training BOOLEAN[^,]+DEFAULT FALSE",
        "allow_external_ai_processing default FALSE": r"allow_external_ai_processing BOOLEAN[^,]+DEFAULT FALSE",
        "SECURITY DEFINER settings": r"SECURITY DEFINER",
        "SET search_path = public settings": r"SET search_path = public",
        "Audit logging insertion": r"INSERT INTO public\.audit_logs"
    }
    
    for desc, pat in sql_patterns.items():
        if not re.search(pat, sql_content, re.IGNORECASE | re.DOTALL):
            safe_print(f"[FAIL] SQL blueprint does not satisfy rule: {desc} (Pattern: {pat})")
            sys.exit(1)
        safe_print(f"[PASS] SQL contains: {desc}")
        
    # 4. Check Documentation content rules
    doc_patterns = {
        "Differentiates AI Consultant / Data Preparation / Model Improvement": r"ai_consultant_enabled.*ai_data_preparation_enabled.*allow_model_improvement",
        "GDPR compliance / exclusion of personal data (PII)": r"(PII|datele personale|date personale|GDPR|anonim)",
        "No global training without opt-in explicit": r"(opt-in|consim\u021b\u0103m\u00e2nt|implicit FALSE|voluntar)"
    }
    
    combined_docs = doc_blueprint_content + "\n" + doc_report_content
    for desc, pat in doc_patterns.items():
        if not re.search(pat, combined_docs, re.IGNORECASE | re.DOTALL):
            safe_print(f"[FAIL] Documentation does not satisfy rule: {desc} (Pattern: {pat})")
            sys.exit(1)
        safe_print(f"[PASS] Documentation contains: {desc}")
        
    safe_print("\n=== [SUCCESS] ALL AI SERVER-SIDE AGGREGATION & CONSENT STATIC CHECKS PASSED! ===")
    sys.exit(0)

if __name__ == '__main__':
    run_static_tests()
