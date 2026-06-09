import os
import sys

def test_files_exist():
    report_path = os.path.join("docs", "ui_ux_audit_baseline_6ux0_report.md")
    plan_path = os.path.join("docs", "ui_ux_staged_plan_6ux0.md")

    print("Checking if report exists at:", report_path)
    assert os.path.exists(report_path), f"Report not found at {report_path}"
    print("Checking if plan exists at:", plan_path)
    assert os.path.exists(plan_path), f"Staged plan not found at {plan_path}"

    with open(report_path, "r", encoding="utf-8") as f:
        report_content = f.read()
    
    with open(plan_path, "r", encoding="utf-8") as f:
        plan_content = f.read()

    print("Verifying report contents...")
    required_report_words = ["POS", "Store Settings", "Products", "AI Consultant", "contrast", "butoane", "responsive"]
    for word in required_report_words:
        # Case-insensitive checks
        found = word.lower() in report_content.lower()
        print(f"  - Mention of '{word}': {'FOUND' if found else 'NOT FOUND'}")
        assert found, f"Report is missing required keyword: '{word}'"

    print("Verifying plan stages...")
    required_stages = ["6UX.1", "6UX.2", "6UX.3", "6UX.4", "6UX.5", "6UX.6"]
    for stage in required_stages:
        found = stage in plan_content
        print(f"  - Stage '{stage}': {'FOUND' if found else 'NOT FOUND'}")
        assert found, f"Staged plan is missing stage reference: '{stage}'"

    print("All assertions passed successfully!")

if __name__ == "__main__":
    try:
        test_files_exist()
        sys.exit(0)
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", e)
        sys.exit(2)
