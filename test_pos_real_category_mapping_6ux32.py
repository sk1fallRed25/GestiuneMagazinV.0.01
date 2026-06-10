import sys
import os
import re

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR REAL CATEGORY MAPPING FIX (6UX.3.2)")
    safe_print("======================================================================\n")

    # 1. Check electron-sqlite-service.js contains getLocalCategories
    safe_print("--- Check 1: electron-sqlite-service.js getLocalCategories ---")
    sqlite_service = "electron-sqlite-service.js"
    with open(sqlite_service, "r", encoding="utf-8") as f:
        sqlite_content = f.read()
    assert "getLocalCategories" in sqlite_content, "electron-sqlite-service.js is missing getLocalCategories definition"
    safe_print("PASS: getLocalCategories exists in electron-sqlite-service.js.")

    # 2. Check electron-main.js contains IPC handler registration
    safe_print("\n--- Check 2: electron-main.js IPC registration ---")
    main_file = "electron-main.js"
    with open(main_file, "r", encoding="utf-8") as f:
        main_content = f.read()
    assert "sqlite:get-categories" in main_content, "electron-main.js is missing sqlite:get-categories IPC handler"
    safe_print("PASS: IPC handler registration exists in electron-main.js.")

    # 3. Check electron-preload.js exposes getCategories
    safe_print("\n--- Check 3: electron-preload.js context bridge ---")
    preload_file = "electron-preload.js"
    with open(preload_file, "r", encoding="utf-8") as f:
        preload_content = f.read()
    assert "getCategories" in preload_content, "electron-preload.js is missing getCategories exposure"
    safe_print("PASS: Method exposed in electron-preload.js.")

    # 4. Check categoryService.ts offline fallback
    safe_print("\n--- Check 4: categoryService.ts offline fallback ---")
    service_file = os.path.join("src", "features", "catalog", "categoryService.ts")
    with open(service_file, "r", encoding="utf-8") as f:
        service_content = f.read()
    assert "electronAPI.sqlite.getCategories" in service_content, "categoryService.ts is missing SQLite offline fallback call"
    safe_print("PASS: Offline fallback active in categoryService.ts.")

    # 5. Check usePosCategories.ts for normalizeId, sameId, and no fragile checks
    safe_print("\n--- Check 5: usePosCategories.ts case-insensitive comparisons ---")
    hook_file = os.path.join("src", "features", "pos", "hooks", "usePosCategories.ts")
    with open(hook_file, "r", encoding="utf-8") as f:
        hook_content = f.read()
    
    assert "normalizeId" in hook_content, "usePosCategories.ts is missing normalizeId helper"
    assert "sameId" in hook_content, "usePosCategories.ts is missing sameId helper"
    
    # Assert no fragile === comparisons for activeSubcategoryId / activeCategoryId
    fragile_sub = re.search(r"===\s*activeSubcategoryId", hook_content)
    fragile_cat = re.search(r"===\s*activeCategoryId", hook_content)
    assert fragile_sub is None, "usePosCategories.ts contains fragile '=== activeSubcategoryId' comparison"
    assert fragile_cat is None, "usePosCategories.ts contains fragile '=== activeCategoryId' comparison"
    safe_print("PASS: Case-insensitive helpers and checks verified in usePosCategories.ts.")

    # 6. Check for hardcoding in code files
    safe_print("\n--- Check 6: Check for hardcoding in logic files ---")
    for filepath in [hook_file, service_file]:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        assert "Băuturi alcoolice" not in content, f"Hardcoded category name found in {filepath}"
        assert "Tărie" not in content, f"Hardcoded subcategory name found in {filepath}"
        assert "Test Alcool" not in content, f"Hardcoded product name found in {filepath}"
    safe_print("PASS: No hardcoding detected in logic files.")

def run_e2e_tests(role_to_test):
    from playwright.sync_api import sync_playwright

    safe_print(f"\n======================================================================")
    safe_print(f"RUNNING E2E TESTS FOR ROLE: {role_to_test} (6UX.3.2)")
    safe_print(f"======================================================================\n")

    # Dynamic Port Discovery
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
        
        # Inject standard mock window.electronAPI
        init_script = """
            window.__kioskModeVal = false;
            window.__fullscreenModeVal = false;
            window.__loggedEvents = [];
            window.electronAPI = {
                getAppVersion: async () => '0.2.0-test',
                isElectron: true,
                appControls: {
                    quitApp: () => { window.__quitAppCalled = true; },
                    setKioskMode: async (enabled) => { window.__kioskModeVal = enabled; return { success: true }; },
                    setFullscreenMode: async (enabled) => { window.__fullscreenModeVal = enabled; return { success: true }; },
                    getWindowState: async () => ({
                        isKiosk: window.__kioskModeVal,
                        isFullscreen: window.__fullscreenModeVal,
                        isMaximized: !window.__kioskModeVal
                    }),
                    getScreenSize: async () => ({ width: 1920, height: 1080 })
                },
                sqlite: {
                    getDeviceInfo: async () => ({ fingerprint: 'test_device_fingerprint_65', name: 'Terminal' }),
                    getCategories: async () => [
                        { id: 'ab42cab3-b759-41b9-8fd8-3cd43607207c', name: 'Bauturi alcoolice', parent_id: null },
                        { id: '8b198a68-e000-472f-a6cc-ecb44ce4dc54', name: 'Tarie', parent_id: 'ab42cab3-b759-41b9-8fd8-3cd43607207c' }
                    ],
                    getAllProducts: async (args) => [
                        { id: 'p1', name: 'Test Alcool 1', barcode: '2975782869324', priceSale: 10.0, stockMagazin: 5, vatPercent: 19, category_id: '8b198a68-e000-472f-a6cc-ecb44ce4dc54', unit: 'buc' }
                    ],
                    logCartEvent: async (evt) => { window.__loggedEvents.push(evt); return { success: true }; },
                    listCartEvents: async (args) => window.__loggedEvents,
                    getOfflineSalesSummary: async (args) => ({ queuedCount: 0, queuedTotal: 0, lastSale: null }),
                    getCacheStatus: async (args) => ({ initialized: true, productCount: 1, lastSyncAt: new Date().toISOString() }),
                    getShift: async (args) => ({ shift_id: 'test_shift_123', status: 'open' }),
                    validateCartItems: async (args) => ({ valid: true }),
                    searchProducts: async (args) => [
                        { id: 'p1', name: 'Test Alcool 1', barcode: '2975782869324', priceSale: 10.0, stockMagazin: 5, vatPercent: 19, category_id: '8b198a68-e000-472f-a6cc-ecb44ce4dc54', unit: 'buc' }
                    ]
                }
            };
        """
        context.add_init_script(init_script)

        # Intercept Supabase REST APIs via Playwright routing
        def handle_supabase_requests(route):
            url = route.request.url
            if "/rpc/get_active_pos_shift" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body="""{
                        "shift_id": "test_shift_123",
                        "status": "open",
                        "opening_cash": 100.0,
                        "opened_at": "2026-06-09T12:00:00Z",
                        "cash_register_id": "reg-1",
                        "cash_register_name": "Casa 1",
                        "current_totals": {
                            "total_sales": 0,
                            "total_cash": 0,
                            "total_card": 0,
                            "total_mixed": 0,
                            "expected_cash": 100.0,
                            "transactions_count": 0
                        }
                    }"""
                )
            elif "/categories" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body="""[
                        {"id": "ab42cab3-b759-41b9-8fd8-3cd43607207c", "name": "Bauturi alcoolice", "parent_id": null, "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"},
                        {"id": "8b198a68-e000-472f-a6cc-ecb44ce4dc54", "name": "Tarie", "parent_id": "ab42cab3-b759-41b9-8fd8-3cd43607207c", "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"}
                    ]"""
                )
            elif "/cash_registers" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body="""[
                        {"id": "reg-1", "store_id": "store-123", "name": "Casa 1", "code": "C1", "active": true}
                    ]"""
                )
            else:
                route.continue_()

        context.route("**/rest/v1/**", handle_supabase_requests)
        page = context.new_page()

        # Listen for console messages
        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        try:
            # Login role simulation
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            
            if role_to_test == 'casier':
                page.locator("input[type='text']").fill("casier@casier.com")
                page.locator("input[type='password']").fill("casier123")
                page.locator("button[type='submit']").click()
                page.wait_for_url("**/pos", timeout=15000)
            elif role_to_test == 'admin':
                page.locator("input[type='text']").fill("admin@admin.com")
                page.locator("input[type='password']").fill("admin123")
                page.locator("button[type='submit']").click()
                page.wait_for_url("**/#/", timeout=15000)
                # Navigate to POS
                page.goto(f"{app_url}/#/pos")
                page.wait_for_url("**/pos", timeout=10000)
            
            safe_print(f"PASS: Logged in as {role_to_test} successfully.")

            # Force offline mode so sqlite data bundle is loaded
            page.evaluate("""() => {
                Object.defineProperty(navigator, 'onLine', { get: () => false });
                window.dispatchEvent(new Event('offline'));
            }""")
            page.wait_for_timeout(2000)

            # Wait for POS layout root
            page.locator('[data-testid="pos-layout-root"]').wait_for(state="visible", timeout=10000)
            
            # Click on Category "Bauturi alcoolice"
            category_btn = page.locator('button:has-text("Bauturi alcoolice")')
            category_btn.wait_for(state="visible", timeout=10000)
            category_btn.click()
            safe_print("PASS: Clicked on main category 'Bauturi alcoolice'.")

            # Check that subcategory "Tarie" button is rendered
            subcategory_btn = page.locator('button:has-text("Tarie")')
            subcategory_btn.wait_for(state="visible", timeout=5000)
            assert subcategory_btn.is_visible(), "Subcategory 'Tarie' button should be visible"
            safe_print("PASS: Subcategory 'Tarie' button is visible.")

            # Click on Subcategory "Tarie"
            subcategory_btn.click()
            safe_print("PASS: Clicked on subcategory 'Tarie'.")

            # Verify that "Test Alcool 1" is rendered under the subcategory
            product_card = page.locator('[data-testid="pos-product-card-p1"]')
            product_card.wait_for(state="visible", timeout=5000)
            assert product_card.is_visible(), "Product 'Test Alcool 1' should be visible inside subcategory 'Tarie'"
            safe_print("PASS: 'Test Alcool 1' product card is visible under subcategory.")

            # Click on product
            product_card.click()
            
            # Verify if product enters the cart
            page.locator('[data-testid="pos-cart-item-row"]').wait_for(state="visible", timeout=5000)
            qty_text = page.locator('[data-testid="pos-cart-item-quantity"]').inner_text()
            assert "1" in qty_text, "Product 'Test Alcool 1' should be added to cart with quantity 1"
            safe_print("PASS: Added product to cart from subcategory grid.")

            # Test search text still works (regression)
            page.locator('input[placeholder*="Scanează"]').fill("Test Alcool")
            page.wait_for_timeout(500)
            search_card = page.locator('button:has-text("Test Alcool 1")')
            assert search_card.is_visible(), "Search query should still filter and display correct product"
            safe_print("PASS: Text search regression passed.")

            context.close()
        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed for role {role_to_test}: {e}")
            page.screenshot(path=f"screenshot_pos_real_category_mapping_error_{role_to_test}.png")
            context.close()
            browser.close()
            sys.exit(1)

        browser.close()

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests('casier')
    run_e2e_tests('admin')
    safe_print("\n======================================================================")
    safe_print("ALL POS REAL CATEGORY MAPPING HOTFIX TESTS PASSED!")
    safe_print("======================================================================\n")
