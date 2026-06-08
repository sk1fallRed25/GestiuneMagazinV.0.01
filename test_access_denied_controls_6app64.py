import sys
import os
import json
import re
import subprocess

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))


def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC + E2E TESTS FOR ACCESS DENIED CONTROLS (6APP.6.4)")
    safe_print("======================================================================\n")

    # ── Static Check 1: ProtectedRoute.tsx contains required data-testid attributes ──
    safe_print("--- Static Check 1: ProtectedRoute.tsx data-testid attributes ---")
    protected_route_file = os.path.join("src", "features", "auth", "ProtectedRoute.tsx")
    if not os.path.exists(protected_route_file):
        safe_print(f"FAIL: {protected_route_file} does not exist.")
        sys.exit(1)

    with open(protected_route_file, "r", encoding="utf-8") as f:
        pr_content = f.read()

    required_testids = [
        "access-denied-page",
        "access-denied-back-pos-button",
        "access-denied-logout-button",
        "access-denied-close-app-button",
        "access-denied-close-app-confirm-dialog",
        "access-denied-close-app-confirm-button",
        "access-denied-close-app-cancel-button",
    ]
    for tid in required_testids:
        if tid not in pr_content:
            safe_print(f"FAIL: data-testid '{tid}' not found in ProtectedRoute.tsx")
            sys.exit(1)
        safe_print(f"PASS: data-testid '{tid}' found.")

    # ── Static Check 2: Role-aware back button (POS for cashier) ──
    safe_print("\n--- Static Check 2: Role-aware navigation ---")
    if "casier" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not reference 'casier' role for back navigation.")
        sys.exit(1)
    if "/pos" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not reference '/pos' route for cashier.")
        sys.exit(1)
    safe_print("PASS: Cashier-specific '/pos' back navigation present.")

    # ── Static Check 3: Logout function used ──
    safe_print("\n--- Static Check 3: Logout function ---")
    if "logout" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not use logout function.")
        sys.exit(1)
    if "useAuth" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not import useAuth.")
        sys.exit(1)
    safe_print("PASS: Logout function from useAuth is used.")

    # ── Static Check 4: Electron close app support ──
    safe_print("\n--- Static Check 4: Electron close app support ---")
    if "electronAPI" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not reference electronAPI for close app.")
        sys.exit(1)
    if "quitApp" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not reference quitApp for close app.")
        sys.exit(1)
    safe_print("PASS: Electron quitApp integration present.")

    # ── Static Check 5: Browser fallback for close app ──
    safe_print("\n--- Static Check 5: Browser fallback for close app ---")
    if "disabled" not in pr_content and "cursor-not-allowed" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not disable close button in browser mode.")
        sys.exit(1)
    safe_print("PASS: Browser fallback disables close app button.")

    # ── Static Check 6: Confirmation dialog for close app ──
    safe_print("\n--- Static Check 6: Close app confirmation dialog ---")
    if "showCloseConfirm" not in pr_content:
        safe_print("FAIL: ProtectedRoute.tsx does not have close app confirmation dialog state.")
        sys.exit(1)
    safe_print("PASS: Close app confirmation dialog logic present.")

    # ── Static Check 7: 'Acces Interzis' heading preserved ──
    safe_print("\n--- Static Check 7: 'Acces Interzis' heading ---")
    if "Acces Interzis" not in pr_content:
        safe_print("FAIL: 'Acces Interzis' heading not found in ProtectedRoute.tsx.")
        sys.exit(1)
    safe_print("PASS: 'Acces Interzis' heading is present.")

    # ── Static Check 8: Admin guidance message for cashier ──
    safe_print("\n--- Static Check 8: Cashier admin guidance message ---")
    if "cont autorizat" not in pr_content:
        safe_print("FAIL: Cashier guidance message not found.")
        sys.exit(1)
    safe_print("PASS: Cashier guidance message present.")

    # ── Static Check 9: npm run build ──
    safe_print("\n--- Static Check 9: npm run build ---")
    try:
        result = subprocess.run("npm run build", shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        safe_print("PASS: npm run build executed successfully.")
    except subprocess.CalledProcessError as e:
        safe_print("FAIL: npm run build failed.")
        safe_print("--- stdout ---")
        safe_print(e.stdout)
        safe_print("--- stderr ---")
        safe_print(e.stderr)
        sys.exit(1)


def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n--- E2E Scenarios ---\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # ── Scenario A: Cashier Access Denied page shows all controls ──
        safe_print("--- Scenario A: Cashier Access Denied page controls ---")
        context = browser.new_context()
        # Inject mock Electron API for close app testing later
        context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.0.0-test',
                isElectron: true,
                appControls: {
                    quitApp: () => { window.__quitAppCalled = true; }
                }
            };
        """)
        page = context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            # Login as casier
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("casier@admin.com")
            page.locator("input[type='password']").fill("casier123")
            page.locator("button[type='submit']").click()
            page.wait_for_timeout(3000)

            # Navigate to a restricted route (Store Settings — admin/manager only)
            page.goto("http://localhost:5174/#/setari-magazin")
            page.wait_for_timeout(2000)

            # Check Access Denied page appears
            access_denied = page.locator('[data-testid="access-denied-page"]')
            if access_denied.is_visible():
                safe_print("PASS: Access Denied page is visible for cashier on restricted route.")
            else:
                safe_print("FAIL: Access Denied page not visible for cashier.")
                page.screenshot(path="screenshot_access_denied_error.png")
                context.close()
                browser.close()
                sys.exit(1)

            # Check back button
            back_btn = page.locator('[data-testid="access-denied-back-pos-button"]')
            assert back_btn.is_visible(), "Back to POS button should be visible"
            safe_print("PASS: 'Inapoi la POS' button is visible.")

            # Check logout button
            logout_btn = page.locator('[data-testid="access-denied-logout-button"]')
            assert logout_btn.is_visible(), "Logout button should be visible"
            safe_print("PASS: 'Deconectare' button is visible.")

            # Check close app button
            close_btn = page.locator('[data-testid="access-denied-close-app-button"]')
            assert close_btn.is_visible(), "Close app button should be visible"
            safe_print("PASS: 'Inchide aplicatia' button is visible.")

            safe_print("[PASS] Scenario A: All controls visible on Access Denied page.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario A failed: {e}")
            page.screenshot(path="screenshot_access_denied_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        # ── Scenario B: Back to POS navigation ──
        safe_print("\n--- Scenario B: Back to POS navigation ---")
        try:
            back_btn = page.locator('[data-testid="access-denied-back-pos-button"]')
            back_btn.click()
            page.wait_for_timeout(2000)

            # Should be on POS page now
            current_url = page.url
            assert "/pos" in current_url or "/vanzare" in current_url, f"Expected POS route, got {current_url}"
            safe_print(f"PASS: Navigated to POS route: {current_url}")
            safe_print("[PASS] Scenario B: Back to POS works.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario B failed: {e}")
            page.screenshot(path="screenshot_access_denied_back_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        # ── Scenario C: Logout from Access Denied ──
        safe_print("\n--- Scenario C: Logout from Access Denied ---")
        try:
            # Go back to restricted page
            page.goto("http://localhost:5174/#/setari-magazin")
            page.wait_for_timeout(2000)

            logout_btn = page.locator('[data-testid="access-denied-logout-button"]')
            if logout_btn.is_visible():
                logout_btn.click()
                page.wait_for_timeout(3000)
                # Should redirect to login
                current_url = page.url
                assert "login" in current_url, f"Expected login route after logout, got {current_url}"
                safe_print(f"PASS: Logout redirected to login: {current_url}")
            else:
                safe_print("WARN: Logout button not visible (possibly redirected already). Checking URL...")
                current_url = page.url
                assert "login" in current_url, f"Expected login route, got {current_url}"
                safe_print(f"PASS: Already at login: {current_url}")

            safe_print("[PASS] Scenario C: Logout from Access Denied works.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario C failed: {e}")
            page.screenshot(path="screenshot_access_denied_logout_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        context.close()

        # ── Scenario D: Close app browser fallback (no Electron API) ──
        safe_print("\n--- Scenario D: Close app browser fallback ---")
        browser_context = browser.new_context()  # No Electron mock
        browser_page = browser_context.new_page()
        browser_page.on("console", lambda msg: safe_print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            # Login as casier
            browser_page.goto("http://localhost:5174/#/login")
            browser_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            browser_page.locator("input[type='text']").fill("casier@admin.com")
            browser_page.locator("input[type='password']").fill("casier123")
            browser_page.locator("button[type='submit']").click()
            browser_page.wait_for_timeout(3000)

            # Navigate to restricted route
            browser_page.goto("http://localhost:5174/#/setari-magazin")
            browser_page.wait_for_timeout(2000)

            close_btn = browser_page.locator('[data-testid="access-denied-close-app-button"]')
            if close_btn.count() > 0:
                is_disabled = close_btn.is_disabled()
                assert is_disabled, "Close app button should be disabled in browser mode"
                safe_print("PASS: Close app button is disabled in browser mode.")
            else:
                safe_print("PASS: Close app button not rendered (acceptable browser fallback).")

            safe_print("[PASS] Scenario D: Browser fallback for close app works.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario D failed: {e}")
            browser_page.screenshot(path="screenshot_access_denied_browser_fallback_error.png")
            browser_context.close()
            browser.close()
            sys.exit(1)

        browser_context.close()

        # ── Scenario E: Close app Electron mock with confirm dialog ──
        safe_print("\n--- Scenario E: Close app Electron mock with confirm ---")
        electron_context = browser.new_context()
        electron_context.add_init_script("""
            window.electronAPI = {
                getAppVersion: async () => '1.0.0-test',
                isElectron: true,
                appControls: {
                    quitApp: () => { window.__quitAppCalled = true; }
                }
            };
        """)
        electron_page = electron_context.new_page()
        electron_page.on("console", lambda msg: safe_print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            # Login as casier
            electron_page.goto("http://localhost:5174/#/login")
            electron_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            electron_page.locator("input[type='text']").fill("casier@admin.com")
            electron_page.locator("input[type='password']").fill("casier123")
            electron_page.locator("button[type='submit']").click()
            electron_page.wait_for_timeout(3000)

            # Navigate to restricted route
            electron_page.goto("http://localhost:5174/#/setari-magazin")
            electron_page.wait_for_timeout(2000)

            # Click close app
            close_btn = electron_page.locator('[data-testid="access-denied-close-app-button"]')
            assert close_btn.is_visible(), "Close app button should be visible"
            assert not close_btn.is_disabled(), "Close app button should NOT be disabled in Electron mock"

            close_btn.click()
            electron_page.wait_for_timeout(1000)

            # Confirm dialog should appear
            confirm_dialog = electron_page.locator('[data-testid="access-denied-close-app-confirm-dialog"]')
            assert confirm_dialog.is_visible(), "Confirm dialog should be visible"
            safe_print("PASS: Confirm dialog appeared.")

            # Cancel and verify dialog closes
            cancel_btn = electron_page.locator('[data-testid="access-denied-close-app-cancel-button"]')
            cancel_btn.click()
            electron_page.wait_for_timeout(500)
            assert not confirm_dialog.is_visible(), "Confirm dialog should be hidden after cancel"
            safe_print("PASS: Cancel button dismissed dialog.")

            # Click close again, then confirm
            close_btn.click()
            electron_page.wait_for_timeout(500)
            confirm_btn = electron_page.locator('[data-testid="access-denied-close-app-confirm-button"]')
            confirm_btn.click()
            electron_page.wait_for_timeout(500)

            quit_called = electron_page.evaluate("window.__quitAppCalled")
            assert quit_called is True, "quitApp should have been called after confirm"
            safe_print("PASS: quitApp was called after confirmation.")

            safe_print("[PASS] Scenario E: Electron close app with confirm works.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario E failed: {e}")
            electron_page.screenshot(path="screenshot_access_denied_electron_close_error.png")
            electron_context.close()
            browser.close()
            sys.exit(1)

        electron_context.close()

        # ── Scenario F: Regression — MainLayout logout still works ──
        safe_print("\n--- Scenario F: Regression — MainLayout sidebar still works ---")
        reg_context = browser.new_context()
        reg_page = reg_context.new_page()

        try:
            # Login as admin
            reg_page.goto("http://localhost:5174/#/login")
            reg_page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            reg_page.locator("input[type='text']").fill("admin@admin.com")
            reg_page.locator("input[type='password']").fill("admin123")
            reg_page.locator("button[type='submit']").click()
            reg_page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
            safe_print("PASS: Admin can login and see Deconectare button in sidebar.")

            # Go to store settings to verify no access denied for admin
            reg_page.goto("http://localhost:5174/#/setari-magazin")
            reg_page.wait_for_timeout(3000)
            
            access_denied = reg_page.locator('[data-testid="access-denied-page"]')
            if access_denied.count() > 0 and access_denied.is_visible():
                safe_print("FAIL: Admin should NOT see Access Denied on Store Settings.")
                sys.exit(1)
            safe_print("PASS: Admin does NOT see Access Denied on Store Settings.")

            safe_print("[PASS] Scenario F: Regression checks pass.")

        except Exception as e:
            safe_print(f"[FAIL] Scenario F failed: {e}")
            reg_page.screenshot(path="screenshot_access_denied_regression_error.png")
            reg_context.close()
            browser.close()
            sys.exit(1)

        reg_context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL ACCESS DENIED CONTROLS TESTS PASSED! (6APP.6.4)")
    safe_print("======================================================================")
    sys.exit(0)


if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
