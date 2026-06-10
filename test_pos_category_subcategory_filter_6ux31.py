import sys
import os
import subprocess

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR POS CATEGORY/SUBCATEGORY FILTER (6UX.3.1)")
    safe_print("======================================================================\n")

    # 1. Check usePosCategories.ts updates
    safe_print("--- Check 1: usePosCategories.ts ---")
    hook_file = os.path.join("src", "features", "pos", "hooks", "usePosCategories.ts")
    with open(hook_file, "r", encoding="utf-8") as f:
        hook_content = f.read()
    assert "getProductCategoryIds" in hook_content, "usePosCategories.ts missing getProductCategoryIds helper"
    assert "category_id" in hook_content, "usePosCategories.ts missing category_id fallback check"
    assert "subcategoryId" in hook_content or "subcategory_id" in hook_content, "usePosCategories.ts missing subcategory check"
    assert "categoryName" in hook_content or "category_name" in hook_content, "usePosCategories.ts missing name fallback check"
    safe_print("PASS: usePosCategories.ts static checks passed.")

    # 2. Check PosCategoryBrowser.tsx updates
    safe_print("\n--- Check 2: PosCategoryBrowser.tsx ---")
    browser_file = os.path.join("src", "features", "pos", "components", "PosCategoryBrowser.tsx")
    with open(browser_file, "r", encoding="utf-8") as f:
        browser_content = f.read()
    assert "useAuth" in browser_content, "PosCategoryBrowser.tsx missing useAuth hook import/usage"
    assert "isAdminOrManager" in browser_content, "PosCategoryBrowser.tsx missing isAdminOrManager check"
    assert "emptyDescription" in browser_content, "PosCategoryBrowser.tsx missing emptyDescription prop pass"
    assert "showCatalogButton" in browser_content, "PosCategoryBrowser.tsx missing showCatalogButton prop pass"
    assert "Mergi la Catalog Produse" in browser_content, "PosCategoryBrowser.tsx missing Link to catalog"
    safe_print("PASS: PosCategoryBrowser.tsx static checks passed.")

    # 3. Check PosSearchBar.tsx updates
    safe_print("\n--- Check 3: PosSearchBar.tsx ---")
    search_file = os.path.join("src", "features", "pos", "components", "PosSearchBar.tsx")
    with open(search_file, "r", encoding="utf-8") as f:
        search_content = f.read()
    assert 'flex flex-col gap-2' in search_content, "PosSearchBar.tsx missing flex-col layout container"
    assert 'pos-scan-status-badge' in search_content, "PosSearchBar.tsx missing scanner badge test id"
    assert 'absolute right-4 top-1/2' not in search_content, "PosSearchBar.tsx still places badge absolutely inside the input container"
    safe_print("PASS: PosSearchBar.tsx static checks passed.")

def run_e2e_tests(role_to_test):
    from playwright.sync_api import sync_playwright

    safe_print(f"\n======================================================================")
    safe_print(f"RUNNING E2E TESTS FOR ROLE: {role_to_test} (6UX.3.1)")
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
                    getAllProducts: async (args) => [
                        { id: 'p1', name: 'Vodka Premium', barcode: '111111', priceSale: 45.0, stockMagazin: 10, vatPercent: 19, categoryId: 'sub-tarie', unit: 'buc' },
                        { id: 'p2', name: 'Bere Blonda', barcode: '222222', priceSale: 6.0, stockMagazin: 50, vatPercent: 19, categoryId: 'c-bauturi', unit: 'buc' },
                        { id: 'p3', name: 'Whiskey', barcode: '333333', priceSale: 85.0, stockMagazin: 5, vatPercent: 19, subcategory_id: 'sub-tarie', unit: 'buc' },
                        { id: 'p4', name: 'Gin', barcode: '444444', priceSale: 55.0, stockMagazin: 8, vatPercent: 19, category_name: 'Tărie', unit: 'buc' },
                        { id: 'p5', name: 'Caiet dictando', barcode: '555555', priceSale: 3.5, stockMagazin: 100, vatPercent: 19, categoryId: 'c-papetarie', unit: 'buc' }
                    ],
                    logCartEvent: async (evt) => { window.__loggedEvents.push(evt); return { success: true }; },
                    listCartEvents: async (args) => window.__loggedEvents,
                    getOfflineSalesSummary: async (args) => ({ queuedCount: 0, queuedTotal: 0, lastSale: null }),
                    getCacheStatus: async (args) => ({ initialized: true, productCount: 5, lastSyncAt: new Date().toISOString() }),
                    getShift: async (args) => ({ shift_id: 'test_shift_123', status: 'open' }),
                    validateCartItems: async (args) => ({ valid: true }),
                    searchProducts: async (args) => [
                        { id: 'p1', name: 'Vodka Premium', barcode: '111111', priceSale: 45.0, stockMagazin: 10, vatPercent: 19, categoryId: 'sub-tarie', unit: 'buc' }
                    ]
                }
            };
        """

        # Context Setup
        context = browser.new_context(service_workers="block")
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
                        {"id": "c-bauturi", "name": "B\u0103uturi alcoolice", "parent_id": null, "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"},
                        {"id": "sub-tarie", "name": "T\u0103rie", "parent_id": "c-bauturi", "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"},
                        {"id": "c-papetarie", "name": "Papet\u0103rie", "parent_id": null, "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"},
                        {"id": "c-goala", "name": "Categorie Gola", "parent_id": null, "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"},
                        {"id": "sub-goala", "name": "Subcategorie Gola", "parent_id": "c-goala", "store_id": "store-123", "created_at": "2026-06-09T12:00:00Z"}
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
                # Admins land on dashboard (/) by default
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
            
            # Click on Category "Băuturi alcoolice" -> using encoding-safe substring "alcoolice"
            category_btn = page.locator('button:has-text("alcoolice")')
            category_btn.wait_for(state="visible", timeout=10000)
            category_btn.click()
            safe_print("PASS: Clicked on main category 'Băuturi alcoolice'.")

            # Check that subcategory "Tărie" button is rendered -> using encoding-safe substring "rie"
            subcategory_btn = page.locator('button:has-text("rie")')
            subcategory_btn.wait_for(state="visible", timeout=5000)
            assert subcategory_btn.is_visible(), "Subcategory 'Tărie' button should be visible"
            safe_print("PASS: Subcategory 'Tărie' button is visible.")

            # Click on Subcategory "Tărie"
            subcategory_btn.click()
            safe_print("PASS: Clicked on subcategory 'Tărie'.")

            # Verify that all products in "Tărie" are rendered (including fallbacks)
            # 1. Vodka Premium (categoryId)
            vodka_card = page.locator('[data-testid="pos-product-card-p1"]')
            vodka_card.wait_for(state="visible", timeout=5000)
            assert vodka_card.is_visible(), "Vodka Premium (categoryId match) should be visible"
            
            # 2. Whiskey (subcategory_id fallback)
            whiskey_card = page.locator('[data-testid="pos-product-card-p3"]')
            whiskey_card.wait_for(state="visible", timeout=5000)
            assert whiskey_card.is_visible(), "Whiskey (subcategory_id match) should be visible"
            
            # 3. Gin (category_name fallback)
            gin_card = page.locator('[data-testid="pos-product-card-p4"]')
            gin_card.wait_for(state="visible", timeout=5000)
            assert gin_card.is_visible(), "Gin (category_name match) should be visible"
            
            # 4. Bere Blonda (in parent category) should NOT be visible here
            beer_card = page.locator('[data-testid="pos-product-card-p2"]')
            assert not beer_card.is_visible(), "Bere Blonda should not be visible inside subcategory 'Tărie'"
            safe_print("PASS: Subcategory product list & fallback filtering matches verified.")

            # Add product to cart
            vodka_card.click()
            page.locator('[data-testid="pos-cart-item-row"]').wait_for(state="visible", timeout=5000)
            qty_text = page.locator('[data-testid="pos-cart-item-quantity"]').inner_text()
            assert "1" in qty_text, "Vodka Premium should be added to cart with quantity 1"
            safe_print("PASS: Added product to cart from subcategory grid.")

            # Test Breadcrumbs back navigation: inside subcategory "Tărie", click back to "Băuturi alcoolice"
            # Using encoding-safe substring "alcoolice"
            breadcrumbs_back_to_cat = page.locator('button:has-text("alcoolice")').first
            assert breadcrumbs_back_to_cat.is_visible(), "Breadcrumb back button for category should be visible"
            breadcrumbs_back_to_cat.click()
            safe_print("PASS: Clicked breadcrumb to go back to category.")

            # Test Breadcrumbs back navigation: inside category, click back to all categories "Categorii"
            # Using substring "Categorii"
            breadcrumbs_back_to_root = page.locator('button:has-text("Categorii")')
            assert breadcrumbs_back_to_root.is_visible(), "Breadcrumb back button for root 'Categorii' should be visible"
            breadcrumbs_back_to_root.click()
            safe_print("PASS: Clicked breadcrumb to go back to all categories.")

            # Verify we are back at root categories list
            page.locator('button:has-text("alcoolice")').wait_for(state="visible", timeout=5000)
            safe_print("PASS: Breadcrumbs navigation back to root categories verified.")

            # Navigate to category "Papetărie" (no subcategories, should render products directly) -> using substring "Papet"
            page.locator('button:has-text("Papet")').click()
            caiet_card = page.locator('[data-testid="pos-product-card-p5"]')
            caiet_card.wait_for(state="visible", timeout=5000)
            assert caiet_card.is_visible(), "Caiet dictando should be visible directly in category 'Papetărie'"
            safe_print("PASS: Direct category product rendering (without subcategories) verified.")

            # Go back to categories
            page.locator('button:has-text("Categorii")').click()
            page.locator('button:has-text("Gola")').first.wait_for(state="visible", timeout=5000)

            # Go to Empty category/subcategory
            page.locator('button:has-text("Gola")').first.click()
            page.locator('button:has-text("Subcategorie")').click()

            # Verify empty state layout and messages
            empty_title = page.locator('h4:has-text("Nu exist")')
            empty_title.wait_for(state="visible", timeout=5000)
            assert empty_title.is_visible(), "Empty state title missing or incorrect"
            
            empty_desc = page.locator('p:has-text("pe subcategoria")')
            assert empty_desc.is_visible(), "Empty state secondary text missing or incorrect"
            
            catalog_link = page.locator('a:has-text("Catalog Produse")')
            if role_to_test == 'admin':
                assert catalog_link.is_visible(), "Catalog navigation link should be visible for admin role"
                # Test click on link
                catalog_link.click()
                page.wait_for_url("**/produse", timeout=5000)
                safe_print("PASS: Admin role can see and click catalog navigation link in empty subcategory state.")
            else:
                assert not catalog_link.is_visible(), "Catalog navigation link should be hidden for cashier role"
                safe_print("PASS: Cashier role does not see catalog link in empty subcategory state.")

            context.close()
        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed for role {role_to_test}: {e}")
            page.screenshot(path=f"screenshot_pos_subcategories_error_{role_to_test}.png")
            context.close()
            browser.close()
            sys.exit(1)

        browser.close()

if __name__ == "__main__":
    run_static_checks()
    # E2E test for Casier
    run_e2e_tests('casier')
    # E2E test for Admin
    run_e2e_tests('admin')
    safe_print("\n======================================================================")
    safe_print("ALL POS CATEGORY/SUBCATEGORY FILTER & OVERLAP HOTFIX TESTS PASSED!")
    safe_print("======================================================================\n")
