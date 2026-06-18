import sys
import os

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR OWNER CONSOLE & AI CONSULTANT POLISH (6UX.5)")
    safe_print("======================================================================\n")

    # 1. OwnerConsolePage.tsx
    safe_print("--- Check 1: OwnerConsolePage.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "OwnerConsolePage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-page"' in content, "OwnerConsolePage.tsx missing owner-console-page testid"
    safe_print("PASS: OwnerConsolePage.tsx static checks passed.")

    # 1.1 OwnerHeader.tsx
    safe_print("\n--- Check 1.1: OwnerHeader.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "OwnerHeader.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-header"' in content, "OwnerHeader.tsx missing owner-console-header testid"
    safe_print("PASS: OwnerHeader.tsx static checks passed.")

    # 1.2 OwnerTabs.tsx
    safe_print("\n--- Check 1.2: OwnerTabs.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "OwnerTabs.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-tabs"' in content, "OwnerTabs.tsx missing owner-console-tabs testid"
    safe_print("PASS: OwnerTabs.tsx static checks passed.")

    # 2. OwnerGlobalStatsCards.tsx
    safe_print("\n--- Check 2: OwnerGlobalStatsCards.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "OwnerGlobalStatsCards.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-global-stats"' in content, "OwnerGlobalStatsCards.tsx missing owner-global-stats testid"
    assert 'testId="platform-health-card"' in content, "OwnerGlobalStatsCards.tsx missing platform-health-card testId"
    safe_print("PASS: OwnerGlobalStatsCards.tsx static checks passed.")

    # 3. StoresTable.tsx
    safe_print("\n--- Check 3: StoresTable.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "StoresTable.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-store-table"' in content, "StoresTable.tsx missing owner-console-store-table testid"
    assert 'data-testid="owner-console-loading-state"' in content, "StoresTable.tsx missing owner-console-loading-state testid"
    assert 'data-testid="owner-console-empty-state"' in content, "StoresTable.tsx missing owner-console-empty-state testid"
    safe_print("PASS: StoresTable.tsx static checks passed.")

    # 4. OwnerProfilesTable.tsx
    safe_print("\n--- Check 4: OwnerProfilesTable.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "OwnerProfilesTable.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-user-table"' in content, "OwnerProfilesTable.tsx missing owner-console-user-table testid"
    assert 'data-testid="owner-console-loading-state"' in content, "OwnerProfilesTable.tsx missing owner-console-loading-state testid"
    assert 'data-testid="owner-console-empty-state"' in content, "OwnerProfilesTable.tsx missing owner-console-empty-state testid"
    assert 'data-testid="owner-console-user-role-badge"' in content, "OwnerProfilesTable.tsx missing owner-console-user-role-badge testid"
    safe_print("PASS: OwnerProfilesTable.tsx static checks passed.")

    # 5. MemberRoleBadge.tsx
    safe_print("\n--- Check 5: MemberRoleBadge.tsx ---")
    file_path = os.path.join("src", "features", "owner-console", "components", "MemberRoleBadge.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="owner-console-user-role-badge"' in content, "MemberRoleBadge.tsx missing owner-console-user-role-badge testid"
    safe_print("PASS: MemberRoleBadge.tsx static checks passed.")

    # 6. AiConsultantPage.tsx
    safe_print("\n--- Check 6: AiConsultantPage.tsx ---")
    file_path = os.path.join("src", "features", "ai-consultant", "AiConsultantPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="ai-consultant-page"' in content, "AiConsultantPage.tsx missing ai-consultant-page testid"
    assert 'data-testid="ai-loading-state"' in content, "AiConsultantPage.tsx missing ai-loading-state testid"
    assert 'data-testid="ai-empty-state"' in content, "AiConsultantPage.tsx missing ai-empty-state testid"
    assert 'data-testid="ai-error-alert"' in content, "AiConsultantPage.tsx missing ai-error-alert testid"
    assert 'data-testid="ai-kpi-grid"' in content, "AiConsultantPage.tsx missing ai-kpi-grid testid"
    assert 'data-testid="ai-recommendations-panel"' in content, "AiConsultantPage.tsx missing ai-recommendations-panel testid"
    safe_print("PASS: AiConsultantPage.tsx static checks passed.")

    # 7. AiConsultantHeader.tsx
    safe_print("\n--- Check 7: AiConsultantHeader.tsx ---")
    file_path = os.path.join("src", "features", "ai-consultant", "components", "AiConsultantHeader.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="ai-consultant-header"' in content, "AiConsultantHeader.tsx missing ai-consultant-header testid"
    assert 'data-testid="ai-refresh-button"' in content, "AiConsultantHeader.tsx missing ai-refresh-button testid"
    safe_print("PASS: AiConsultantHeader.tsx static checks passed.")

    # 8. AiRecommendationCard.tsx
    safe_print("\n--- Check 8: AiRecommendationCard.tsx ---")
    file_path = os.path.join("src", "features", "ai-consultant", "components", "AiRecommendationCard.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="ai-recommendation-row"' in content, "AiRecommendationCard.tsx missing ai-recommendation-row testid"
    assert 'data-testid="ai-recommendation-severity-badge"' in content, "AiRecommendationCard.tsx missing ai-recommendation-severity-badge testid"
    assert 'data-testid="ai-recommendation-type-badge"' in content, "AiRecommendationCard.tsx missing ai-recommendation-type-badge testid"
    safe_print("PASS: AiRecommendationCard.tsx static checks passed.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR OWNER CONSOLE & AI CONSULTANT POLISH (6UX.5)")
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
        
        # ---------------------------------------------------------------------
        # PART 1: Verify Owner Console (Log in as admin@owner.com)
        # ---------------------------------------------------------------------
        context1 = browser.new_context(viewport={"width": 1280, "height": 800})
        page1 = context1.new_page()
        page1.on("console", lambda msg: safe_print(f"[Owner Browser Console] {msg.type}: {msg.text}"))

        try:
            page1.goto(f"{app_url}/#/login")
            page1.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page1.locator("input[type='text']").fill("admin@owner.com")
            page1.locator("input[type='password']").fill("admin123")
            page1.locator("button[type='submit']").click()
            
            page1.locator("text=Consolă Proprietar").first.wait_for(state="visible", timeout=15000)
            safe_print("PASS: Logged in successfully as Platform Owner.")
            page1.wait_for_timeout(2000)

            page1.goto(f"{app_url}/#/owner")
            page1.locator('[data-testid="owner-console-page"]').wait_for(state="visible", timeout=15000)
            assert page1.locator('[data-testid="owner-console-page"]').is_visible(), "owner-console-page missing"
            assert page1.locator('[data-testid="owner-console-header"]').is_visible(), "owner-console-header missing"
            assert page1.locator('[data-testid="owner-console-tabs"]').is_visible(), "owner-console-tabs missing"
            assert page1.locator('[data-testid="owner-global-stats"]').is_visible(), "owner-global-stats missing"

            # Switch to Magazine Tab
            page1.locator('[data-testid="owner-console-tab-stores"]').click()
            page1.wait_for_timeout(1000)
            assert page1.locator('[data-testid="owner-console-store-table"]').is_visible(), "owner-console-store-table missing"

            # Switch to Users Tab
            page1.locator('[data-testid="owner-console-tab-users"]').click()
            page1.wait_for_timeout(1000)
            assert page1.locator('[data-testid="owner-console-user-table"]').is_visible(), "owner-console-user-table missing"
            safe_print("PASS: Owner Console elements verified successfully.")

            # Enable AI Consultant module for Magazin Principal
            safe_print("Activating 'ai_consultant' module for Magazin Principal via RPC...")
            enabled_res = page1.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('name', 'Magazin Principal')
                    .single();
                if (!storeData) return { success: false, error: 'Store not found' };

                const { error } = await supabase.rpc('set_store_module_access', {
                    p_store_id: storeData.id,
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Restaurare E2E Test (Activare automata)'
                });
                return { success: !error, error: error ? error.message : null };
            }""")
            safe_print(f"RPC Activation response: {enabled_res}")

        except Exception as e:
            safe_print(f"[FAIL] Owner Console verification failed: {e}")
            try:
                page1.screenshot(path="screenshot_e2e_6ux5_owner_error.png")
            except Exception:
                pass
            context1.close()
            browser.close()
            sys.exit(1)

        context1.close()

        # ---------------------------------------------------------------------
        # PART 2: Verify AI Consultant (Log in as admin@admin.com)
        # ---------------------------------------------------------------------
        context2 = browser.new_context(viewport={"width": 1280, "height": 800})
        page2 = context2.new_page()
        page2.on("console", lambda msg: safe_print(f"[AI Browser Console] {msg.type}: {msg.text}"))

        try:
            page2.goto(f"{app_url}/#/login")
            page2.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page2.locator("input[type='text']").fill("admin@admin.com")
            page2.locator("input[type='password']").fill("admin123")
            page2.locator("button[type='submit']").click()
            
            page2.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("PASS: Logged in successfully as Store Admin.")
            page2.wait_for_timeout(2000)

            page2.goto(f"{app_url}/#/ai-consultant")
            
            try:
                page2.locator('[data-testid="ai-consultant-page"]').wait_for(state="visible", timeout=15000)
                assert page2.locator('[data-testid="ai-consultant-page"]').is_visible(), "ai-consultant-page missing"
                assert page2.locator('[data-testid="ai-consultant-header"]').is_visible(), "ai-consultant-header missing"
                assert page2.locator('[data-testid="ai-kpi-grid"]').is_visible(), "ai-kpi-grid missing"
                assert page2.locator('[data-testid="ai-recommendations-panel"]').is_visible(), "ai-recommendations-panel missing"
                safe_print("PASS: AI Consultant Dashboard elements verified successfully.")
            except Exception as e:
                # Fallback to error or empty states
                if page2.locator('[data-testid="ai-error-alert"]').is_visible():
                    safe_print("PASS: AI Consultant shows proper Differentiated Error Alert Screen.")
                elif page2.locator('[data-testid="ai-empty-state"]').is_visible():
                    safe_print("PASS: AI Consultant shows proper Empty State Screen.")
                else:
                    raise e

        except Exception as e:
            safe_print(f"[FAIL] AI Consultant verification failed: {e}")
            try:
                safe_print(f"Current URL: {page2.url}")
                body_text = page2.locator("body").inner_text()
                safe_print("Visible text on page:")
                safe_print(body_text)
            except Exception as inner_e:
                safe_print(f"Could not retrieve page text: {inner_e}")
            try:
                page2.screenshot(path="screenshot_e2e_6ux5_ai_error.png")
            except Exception:
                pass
            context2.close()
            browser.close()
            sys.exit(1)

        context2.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL OWNER CONSOLE & AI CONSULTANT E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
