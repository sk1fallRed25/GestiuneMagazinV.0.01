import sys
import os

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR REPORTS & HISTORY POLISH (6UX.6)")
    safe_print("======================================================================\n")

    # 1. No new .exe files check
    safe_print("--- Check 0: Security constraint - No new .exe files ---")
    for root, dirs, files in os.walk("."):
        # Skip node_modules, .git, release, and resources
        if "node_modules" in root or ".git" in root or "release" in root or "resources" in root:
            continue
        for file in files:
            if file.endswith(".exe"):
                # Check if it's a known allowed exe or error out
                assert False, f"Forbidden binary file found: {os.path.join(root, file)}"
    safe_print("PASS: No new .exe files found.")

    # 2. SalesHistoryPage.tsx
    safe_print("\n--- Check 1: SalesHistoryPage.tsx ---")
    file_path = os.path.join("src", "features", "sales-history", "SalesHistoryPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="sales-history-page"' in content, "SalesHistoryPage.tsx missing sales-history-page testid"
    safe_print("PASS: SalesHistoryPage.tsx static checks passed.")

    # 3. SalesHistoryHeader.tsx
    safe_print("\n--- Check 2: SalesHistoryHeader.tsx ---")
    file_path = os.path.join("src", "features", "sales-history", "components", "SalesHistoryHeader.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="sales-history-header"' in content, "SalesHistoryHeader.tsx missing sales-history-header testid"
    assert 'text-gray-400' not in content, "SalesHistoryHeader.tsx has low contrast text-gray-400"
    safe_print("PASS: SalesHistoryHeader.tsx static checks passed.")

    # 4. SalesHistoryFilters.tsx
    safe_print("\n--- Check 3: SalesHistoryFilters.tsx ---")
    file_path = os.path.join("src", "features", "sales-history", "components", "SalesHistoryFilters.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="sales-history-filter-panel"' in content, "SalesHistoryFilters.tsx missing sales-history-filter-panel testid"
    assert 'text-gray-400' not in content, "SalesHistoryFilters.tsx has low contrast text-gray-400"
    safe_print("PASS: SalesHistoryFilters.tsx static checks passed.")

    # 5. SalesHistoryTable.tsx
    safe_print("\n--- Check 4: SalesHistoryTable.tsx ---")
    file_path = os.path.join("src", "features", "sales-history", "components", "SalesHistoryTable.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="sales-history-table"' in content, "SalesHistoryTable.tsx missing sales-history-table testid"
    assert 'data-testid="sales-history-row"' in content, "SalesHistoryTable.tsx missing sales-history-row testid"
    assert 'data-testid="sales-history-loading-state"' in content, "SalesHistoryTable.tsx missing loading testid"
    assert 'data-testid="sales-history-empty-state"' in content, "SalesHistoryTable.tsx missing empty testid"
    safe_print("PASS: SalesHistoryTable.tsx static checks passed.")

    # 6. ReportsPage.tsx
    safe_print("\n--- Check 5: ReportsPage.tsx ---")
    file_path = os.path.join("src", "features", "reports", "ReportsPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-page"' in content, "ReportsPage.tsx missing reports-page testid"
    assert 'data-testid="reports-header"' in content, "ReportsPage.tsx missing reports-header testid"
    assert 'data-testid="reports-filter-panel"' in content, "ReportsPage.tsx missing reports-filter-panel testid"
    assert 'data-testid="reports-loading-state"' in content, "ReportsPage.tsx missing reports-loading-state testid"
    assert 'text-gray-400' not in content, "ReportsPage.tsx has low-contrast text-gray-400"
    safe_print("PASS: ReportsPage.tsx static checks passed.")

    # 7. ReportKpiCard.tsx
    safe_print("\n--- Check 6: ReportKpiCard.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "ReportKpiCard.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-kpi-card"' in content, "ReportKpiCard.tsx missing reports-kpi-card testid"
    assert 'text-gray-400' not in content, "ReportKpiCard.tsx has low-contrast text-gray-400"
    safe_print("PASS: ReportKpiCard.tsx static checks passed.")

    # 8. SalesSummaryPanel.tsx
    safe_print("\n--- Check 7: SalesSummaryPanel.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "SalesSummaryPanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-kpi-grid"' in content, "SalesSummaryPanel.tsx missing reports-kpi-grid testid"
    assert 'data-testid="reports-chart-card"' in content, "SalesSummaryPanel.tsx missing reports-chart-card testid"
    safe_print("PASS: SalesSummaryPanel.tsx static checks passed.")

    # 9. ProductPerformancePanel.tsx
    safe_print("\n--- Check 8: ProductPerformancePanel.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "ProductPerformancePanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-table"' in content, "ProductPerformancePanel.tsx missing reports-table testid"
    assert 'data-testid="reports-empty-state"' in content, "ProductPerformancePanel.tsx missing reports-empty-state testid"
    assert 'text-gray-400' not in content, "ProductPerformancePanel.tsx has low-contrast text-gray-400"
    safe_print("PASS: ProductPerformancePanel.tsx static checks passed.")

    # 10. DailyCashPanel.tsx
    safe_print("\n--- Check 9: DailyCashPanel.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "DailyCashPanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-table"' in content, "DailyCashPanel.tsx missing reports-table testid"
    assert 'data-testid="reports-loading-state"' in content, "DailyCashPanel.tsx missing reports-loading-state testid"
    assert 'text-gray-400' not in content, "DailyCashPanel.tsx has low-contrast text-gray-400"
    safe_print("PASS: DailyCashPanel.tsx static checks passed.")

    # 11. InventoryValuePanel.tsx
    safe_print("\n--- Check 10: InventoryValuePanel.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "InventoryValuePanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-table"' in content, "InventoryValuePanel.tsx missing reports-table testid"
    assert 'text-gray-400' not in content, "InventoryValuePanel.tsx has low-contrast text-gray-400"
    safe_print("PASS: InventoryValuePanel.tsx static checks passed.")

    # 12. LossesPanel.tsx
    safe_print("\n--- Check 11: LossesPanel.tsx ---")
    file_path = os.path.join("src", "features", "reports", "components", "LossesPanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="reports-empty-state"' in content, "LossesPanel.tsx missing reports-empty-state testid"
    assert 'text-gray-400' not in content, "LossesPanel.tsx has low-contrast text-gray-400"
    safe_print("PASS: LossesPanel.tsx static checks passed.")


def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR REPORTS & HISTORY POLISH (6UX.6)")
    safe_print("======================================================================\n")

    port = "5173"
    for p in ["5176", "5174", "5175", "5173"]:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect(("localhost", int(p)))
            s.close()
            port = p
            break
        except Exception:
            pass

    app_url = f"http://localhost:{port}"
    safe_print(f"Connecting to app at {app_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        try:
            # Login as Store Admin
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            
            page.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("PASS: Logged in successfully as Store Admin.")
            page.wait_for_timeout(2000)

            # Navigate to Sales History
            safe_print("Navigating to Sales History...")
            page.goto(f"{app_url}/#/istoric-vanzari")
            page.locator('[data-testid="sales-history-page"]').wait_for(state="visible", timeout=15000)
            assert page.locator('[data-testid="sales-history-page"]').is_visible(), "sales-history-page missing"
            assert page.locator('[data-testid="sales-history-header"]').is_visible(), "sales-history-header missing"
            assert page.locator('[data-testid="sales-history-filter-panel"]').is_visible(), "sales-history-filter-panel missing"
            
            if page.locator('[data-testid="sales-history-table"]').is_visible():
                safe_print("PASS: Sales History Table is visible.")
                assert page.locator('[data-testid="sales-history-row"]').first.is_visible(), "sales-history-row missing"
            elif page.locator('[data-testid="sales-history-empty-state"]').is_visible():
                safe_print("PASS: Sales History Empty State is visible.")
            else:
                safe_print("WARNING: Neither table nor empty state visible, could be loading.")
 
            # Navigate to Reports
            safe_print("Navigating to Reports...")
            page.goto(f"{app_url}/#/rapoarte")
            page.locator('[data-testid="reports-page"]').wait_for(state="visible", timeout=15000)
            assert page.locator('[data-testid="reports-page"]').is_visible(), "reports-page missing"
            assert page.locator('[data-testid="reports-header"]').is_visible(), "reports-header missing"
            
            # Check Tabs switching
            tabs = ["Vânzări", "Performanță", "Reconciliere", "Valoare", "Pierderi"]
            for tab in tabs:
                safe_print(f"Clicking tab containing '{tab}'...")
                page.locator(f"button:has-text('{tab}')").first.click()
                page.wait_for_timeout(1000)
                
                # Check page states
                if page.locator('[data-testid="reports-kpi-grid"]').is_visible():
                    assert page.locator('[data-testid="reports-kpi-card"]').first.is_visible(), "reports-kpi-card missing in grid"
                elif page.locator('[data-testid="reports-empty-state"]').is_visible():
                    safe_print(f"PASS: Tab '{tab}' displays Empty State properly.")
                elif page.locator('[data-testid="reports-error-alert"]').is_visible():
                    safe_print(f"PASS: Tab '{tab}' displays Error Alert properly.")
                elif page.locator('[data-testid="reports-loading-state"]').is_visible():
                    safe_print(f"PASS: Tab '{tab}' displays Loading State properly.")

            safe_print("PASS: Reports and Sales History E2E verification completed successfully.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                page.screenshot(path="screenshot_e2e_6ux6_error.png")
            except Exception:
                pass
            context.close()
            browser.close()
            sys.exit(1)

        context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL REPORTS & HISTORY E2E AND STATIC TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
