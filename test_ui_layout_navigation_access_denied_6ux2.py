import os
import sys
import subprocess

def test_access_denied_polish():
    print("Starting Stage 6UX.2 verification tests...")

    # 1. Verify AccessDeniedCard.tsx exists
    card_path = os.path.join("src", "features", "auth", "components", "AccessDeniedCard.tsx")
    print(f"Checking {card_path} existence...")
    assert os.path.exists(card_path), f"{card_path} does not exist!"

    # 2. Check data-testid tags in AccessDeniedCard.tsx
    required_tags = [
        "access-denied-page",
        "access-denied-card",
        "access-denied-back-pos-button",
        "access-denied-back-dashboard-button",
        "access-denied-logout-button",
        "access-denied-close-app-button",
        "access-denied-close-app-confirm-dialog",
        "access-denied-close-app-confirm-button",
        "access-denied-close-app-cancel-button"
    ]
    print("Verifying data-testid presence in AccessDeniedCard...")
    with open(card_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    for tag in required_tags:
        assert tag in content, f"Missing required data-testid: {tag}"

    # Verify usage of UI components
    assert "Card" in content, "AccessDeniedCard does not import Card component!"
    assert "Button" in content, "AccessDeniedCard does not import Button component!"

    # 3. Verify ProtectedRoute.tsx imports and uses AccessDeniedCard
    protect_path = os.path.join("src", "features", "auth", "ProtectedRoute.tsx")
    print(f"Verifying {protect_path} updates...")
    assert os.path.exists(protect_path), f"{protect_path} does not exist!"
    with open(protect_path, "r", encoding="utf-8") as f:
        protect_content = f.read()

    assert "AccessDeniedCard" in protect_content, "ProtectedRoute does not reference AccessDeniedCard!"
    assert "LoadingState" in protect_content, "ProtectedRoute does not use LoadingState component!"

    # 4. Verify MainLayout.tsx is polished
    layout_path = os.path.join("src", "app", "MainLayout.tsx")
    print(f"Verifying {layout_path} updates...")
    assert os.path.exists(layout_path), f"{layout_path} does not exist!"
    with open(layout_path, "r", encoding="utf-8") as f:
        layout_content = f.read()

    assert "Badge" in layout_content, "MainLayout does not import or use Badge component!"
    assert "focus-visible:ring-2" in layout_content, "MainLayout nav links do not seem to have polished focus rings!"
    assert "text-slate-300" in layout_content, "MainLayout should use higher contrast text for navigation/sidebar!"

    # 5. Check report existence
    report_path = os.path.join("docs", "ui_layout_navigation_access_denied_6ux2_report.md")
    print(f"Verifying report existence at {report_path}...")
    assert os.path.exists(report_path), f"Report not found at {report_path}"

    # 6. Ensure no SQL changes or .exe files
    print("Checking git diff for forbidden file changes...")
    try:
        git_diff = subprocess.check_output(["git", "diff", "--name-only"], stderr=subprocess.STDOUT).decode("utf-8")
        git_diff_cached = subprocess.check_output(["git", "diff", "--cached", "--name-only"], stderr=subprocess.STDOUT).decode("utf-8")
        all_diff = git_diff + "\n" + git_diff_cached
        
        for line in all_diff.splitlines():
            if line.endswith(".sql"):
                raise AssertionError(f"SQL file changed: {line}")
            if "supabase" in line.lower() and not "MainLayout.tsx" in line:
                raise AssertionError(f"Supabase configuration changed: {line}")
    except subprocess.CalledProcessError:
        pass

    # Ensure no .exe files
    print("Verifying no .exe file is generated...")
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or "dist" in root or ".git" in root or "release" in root:
            continue
        for file in files:
            if file.endswith(".exe"):
                raise AssertionError(f"Forbidden .exe file found: {os.path.join(root, file)}")

    print("All Stage 6UX.2 verification checks PASSED successfully!")

if __name__ == "__main__":
    try:
        test_access_denied_polish()
        sys.exit(0)
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", e)
        sys.exit(2)
