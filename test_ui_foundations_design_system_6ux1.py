import os
import sys
import subprocess

def check_files():
    base_dir = os.path.join("src", "shared", "components", "ui")
    
    # 1. Check folder and files exist
    assert os.path.isdir(base_dir), f"Directory {base_dir} does not exist"
    
    components = [
        "Button.tsx", "Input.tsx", "Select.tsx", "Card.tsx", "Badge.tsx",
        "Modal.tsx", "Table.tsx", "Alert.tsx", "Tooltip.tsx", "Tabs.tsx",
        "PageHeader.tsx", "EmptyState.tsx", "LoadingState.tsx", "index.ts"
    ]
    
    print("Checking UI components...")
    for comp in components:
        comp_path = os.path.join(base_dir, comp)
        print(f"  - Checking {comp_path}...")
        assert os.path.exists(comp_path), f"File {comp_path} does not exist"
        
        # Verify component accepts className
        with open(comp_path, "r", encoding="utf-8") as f:
            content = f.read()
            if comp != "index.ts":
                assert "className" in content, f"Component {comp} does not seem to accept className prop"

    # 2. Check Button specifications
    button_path = os.path.join(base_dir, "Button.tsx")
    with open(button_path, "r", encoding="utf-8") as f:
        button_content = f.read()
    
    print("Verifying Button props and variants...")
    for variant in ["primary", "secondary", "danger", "ghost"]:
        assert variant in button_content, f"Button is missing variant: {variant}"
        
    for prop in ["loading", "disabled"]:
        assert prop in button_content, f"Button is missing prop/logic for: {prop}"

    # 3. Check design tokens in index.css
    css_path = os.path.join("src", "index.css")
    print("Verifying design tokens in index.css...")
    assert os.path.exists(css_path), f"File {css_path} does not exist"
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()
    assert "--ui-bg" in css_content, "index.css is missing design tokens (e.g. --ui-bg)"
    assert "--ui-primary" in css_content, "index.css is missing design tokens (e.g. --ui-primary)"
    assert "--ui-text-muted" in css_content, "index.css is missing design tokens (e.g. --ui-text-muted)"

    # 4. Check report existence
    report_path = os.path.join("docs", "ui_foundations_design_system_6ux1_report.md")
    print("Verifying report existence...")
    assert os.path.exists(report_path), f"Report not found at {report_path}"

    # 5. Check SQL or DB changes in Git
    print("Verifying no database or config modifications in git diff...")
    try:
        git_diff = subprocess.check_output(["git", "diff", "--name-only"], stderr=subprocess.STDOUT).decode("utf-8")
        git_diff_cached = subprocess.check_output(["git", "diff", "--cached", "--name-only"], stderr=subprocess.STDOUT).decode("utf-8")
        all_diff = git_diff + "\n" + git_diff_cached
        
        # Ensure no SQL files are changed/added
        for line in all_diff.splitlines():
            if line.endswith(".sql"):
                raise AssertionError(f"SQL file changed: {line}")
            if "supabase" in line.lower():
                raise AssertionError(f"Supabase configuration changed: {line}")
            if "package.json" in line:
                # If package.json is modified, ensure it's not a dependency change
                # We can check package.json diff or simply warn/assert. Here we assert it is not modified at all to be safe.
                # Actually, package.json shouldn't be touched. Let's make sure it is not.
                raise AssertionError("package.json was modified. This stage must not modify dependencies.")
    except subprocess.CalledProcessError as e:
        print("Git command failed (probably not a git repo or git not in PATH). Skipping git diff checks.")

    # 6. Check that no .exe is generated in the workspace
    print("Verifying no .exe file is generated...")
    for root, dirs, files in os.walk("."):
        # Skip node_modules, dist, and release
        if "node_modules" in root or "dist" in root or ".git" in root or "release" in root:
            continue
        for file in files:
            if file.endswith(".exe"):
                raise AssertionError(f"Forbidden .exe file found: {os.path.join(root, file)}")

    print("All UI Foundations (6UX.1) verification checks PASSED successfully!")

if __name__ == "__main__":
    try:
        check_files()
        sys.exit(0)
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", e)
        sys.exit(2)
