import sys
import os

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR CATALOG, FORMS & SETTINGS POLISH (6UX.4)")
    safe_print("======================================================================\n")

    # 1. ProductsPage.tsx
    safe_print("--- Check 1: ProductsPage.tsx ---")
    file_path = os.path.join("src", "features", "products", "ProductsPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="products-page"' in content, "ProductsPage.tsx missing products-page wrapper testid"
    assert 'data-testid="products-page-header"' in content, "ProductsPage.tsx missing products-page-header wrapper testid"
    safe_print("PASS: ProductsPage.tsx static checks passed.")

    # 2. ProductSearchBar.tsx
    safe_print("\n--- Check 2: ProductSearchBar.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductSearchBar.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="products-search-input"' in content, "ProductSearchBar.tsx missing products-search-input testid"
    safe_print("PASS: ProductSearchBar.tsx static checks passed.")

    # 3. ProductTable.tsx
    safe_print("\n--- Check 3: ProductTable.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductTable.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="products-table"' in content, "ProductTable.tsx missing products-table testid"
    assert 'data-testid="products-table-row"' in content, "ProductTable.tsx missing products-table-row testid"
    assert 'data-testid="product-edit-button"' in content, "ProductTable.tsx missing product-edit-button testid"
    assert 'data-testid="product-archive-button"' in content, "ProductTable.tsx missing product-archive-button testid"
    assert 'data-testid="product-vat-badge"' in content, "ProductTable.tsx missing product-vat-badge testid"
    assert 'data-testid="product-sgr-badge"' in content, "ProductTable.tsx missing product-sgr-badge testid"
    safe_print("PASS: ProductTable.tsx static checks passed.")

    # 4. ProductEditModal.tsx
    safe_print("\n--- Check 4: ProductEditModal.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductEditModal.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="product-edit-modal"' in content, "ProductEditModal.tsx missing product-edit-modal testid"
    assert 'data-testid="product-edit-save-button"' in content, "ProductEditModal.tsx missing product-edit-save-button testid"
    assert 'data-testid="product-edit-cancel-button"' in content, "ProductEditModal.tsx missing product-edit-cancel-button testid"
    safe_print("PASS: ProductEditModal.tsx static checks passed.")

    # 5. FastAddPage.tsx
    safe_print("\n--- Check 5: FastAddPage.tsx ---")
    file_path = os.path.join("src", "features", "fast-add", "FastAddPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="quick-add-page"' in content, "FastAddPage.tsx missing quick-add-page testid"
    assert 'data-testid="quick-add-barcode-input"' in content, "FastAddPage.tsx missing quick-add-barcode-input testid"
    assert 'data-testid="quick-add-generate-barcode-button"' in content, "FastAddPage.tsx missing quick-add-generate-barcode-button testid"
    assert 'data-testid="quick-add-category-select"' in content, "FastAddPage.tsx missing quick-add-category-select testid"
    assert 'data-testid="quick-add-subcategory-select"' in content, "FastAddPage.tsx missing quick-add-subcategory-select testid"
    assert 'data-testid="quick-add-create-category-button"' in content, "FastAddPage.tsx missing quick-add-create-category-button testid"
    assert 'data-testid="quick-add-create-subcategory-button"' in content, "FastAddPage.tsx missing quick-add-create-subcategory-button testid"
    safe_print("PASS: FastAddPage.tsx static checks passed.")

    # 6. StoreSettingsPage.tsx
    safe_print("\n--- Check 6: StoreSettingsPage.tsx ---")
    file_path = os.path.join("src", "features", "store-settings", "StoreSettingsPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="store-settings-page"' in content, "StoreSettingsPage.tsx missing store-settings-page testid"
    assert 'data-testid="store-settings-header"' in content, "StoreSettingsPage.tsx missing store-settings-header testid"
    assert 'data-testid="store-settings-reload-button"' in content, "StoreSettingsPage.tsx missing store-settings-reload-button testid"
    assert 'settings-app-version-label' in content, "StoreSettingsPage.tsx missing settings-app-version-label testid"
    assert 'settings-app-runtime-label' in content, "StoreSettingsPage.tsx missing settings-app-runtime-label testid"
    assert 'app-window-state-indicator' in content, "StoreSettingsPage.tsx missing app-window-state-indicator testid"
    safe_print("PASS: StoreSettingsPage.tsx static checks passed.")

    # 7. StoreSettingsSaveBar.tsx
    safe_print("\n--- Check 7: StoreSettingsSaveBar.tsx ---")
    file_path = os.path.join("src", "features", "store-settings", "components", "StoreSettingsSaveBar.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="store-settings-save-button"' in content, "StoreSettingsSaveBar.tsx missing store-settings-save-button testid"
    assert 'data-testid="store-settings-reset-button"' in content, "StoreSettingsSaveBar.tsx missing store-settings-reset-button testid"
    safe_print("PASS: StoreSettingsSaveBar.tsx static checks passed.")

    # 8. PosCartEventsPanel.tsx
    safe_print("\n--- Check 8: PosCartEventsPanel.tsx ---")
    file_path = os.path.join("src", "features", "pos", "components", "PosCartEventsPanel.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="pos-cart-events-panel"' in content, "PosCartEventsPanel.tsx missing pos-cart-events-panel testid"
    assert 'data-testid="pos-cart-event-row"' in content, "PosCartEventsPanel.tsx missing pos-cart-event-row testid"
    assert 'data-testid="pos-cart-event-type"' in content, "PosCartEventsPanel.tsx missing pos-cart-event-type testid"
    assert 'data-testid="pos-cart-event-product"' in content, "PosCartEventsPanel.tsx missing pos-cart-event-product testid"
    assert 'data-testid="pos-cart-event-quantity-change"' in content, "PosCartEventsPanel.tsx missing pos-cart-event-quantity-change testid"
    safe_print("PASS: PosCartEventsPanel.tsx static checks passed.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR CATALOG, FORMS & SETTINGS POLISH (6UX.4)")
    safe_print("======================================================================\n")

    # Find the port from process environment or try standard ports
    port = "5173"
    for p in ["5174", "5175", "5173"]:
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

        # Listen for console messages
        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        # Intercept Supabase REST APIs via Playwright routing
        def handle_supabase_requests(route):
            url = route.request.url
            if "/rpc/get_store_settings" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body="""{
                        "store_id": "store-123",
                        "store_name": "Magazin Principal",
                        "fiscal_code": "RO12345678",
                        "active": true,
                        "settings": {
                            "fiscal": {
                                "workpoint_number": 1,
                                "workpoint_name": "Gestiune Magazin",
                                "company_name": "Magazin S.R.L.",
                                "display_code": "M1",
                                "reg_number": "J40/123/2026",
                                "phone": "0722123456",
                                "email": "contact@magazin.ro",
                                "city": "Bucuresti",
                                "county": "Bucuresti",
                                "address_full": "Str. Academiei 1",
                                "notes": "Va multumim pentru vizita!"
                            },
                            "tax": {
                                "default_vat_group": "A",
                                "vat_payer": true,
                                "price_tax_policy": "inclusive",
                                "vat_groups": {
                                    "A": { "rate": 19, "label": "TVA 19%", "fiscal_code": "A", "active": true },
                                    "B": { "rate": 9, "label": "TVA 9%", "fiscal_code": "B", "active": true },
                                    "C": { "rate": 5, "label": "TVA 5%", "fiscal_code": "C", "active": true },
                                    "D": { "rate": 0, "label": "TVA 0%", "fiscal_code": "D", "active": true },
                                    "E": { "rate": 0, "label": "Scutit TVA", "fiscal_code": "E", "active": true }
                                }
                            },
                            "stock": {
                                "stock_min_default": 5,
                                "allow_negative_stock": false,
                                "expiry_warning_days": 30
                            },
                            "pos": {
                                "default_payment_method": "cash",
                                "allow_mixed_payment": true,
                                "require_active_shift": true,
                                "require_manager_for_void": false,
                                "require_manager_for_return": false
                            },
                            "documents": {
                                "pos_receipt_prefix": "BON",
                                "return_prefix": "RET",
                                "reception_prefix": "REC",
                                "waste_prefix": "PIE",
                                "transfer_prefix": "TRA"
                            },
                            "reports": {
                                "business_day_start_hour": 8,
                                "timezone": "Europe/Bucharest"
                            },
                            "alerts": {
                                "alert_low_stock_enabled": true,
                                "alert_expiry_enabled": true,
                                "alert_cash_difference_limit": 10
                            }
                        }
                    }"""
                )
            else:
                route.continue_()

        context.route("**/rest/v1/**", handle_supabase_requests)

        try:
            # 1. Login
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            
            # Wait for navigation
            page.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("PASS: Logged in successfully.")
            page.wait_for_timeout(2500)

            # 2. Verify Catalog Page
            page.goto(f"{app_url}/#/produse")
            page.locator('[data-testid="products-page"]').wait_for(state="visible", timeout=10000)
            assert page.locator('[data-testid="products-page"]').is_visible(), "products-page container missing"
            assert page.locator('[data-testid="products-page-header"]').is_visible(), "products-page-header container missing"
            assert page.locator('[data-testid="products-search-input"]').is_visible(), "products-search-input input missing"
            assert page.locator('[data-testid="products-table"]').is_visible(), "products-table missing"
            safe_print("PASS: Catalog / Products Page elements verified.")

            # 3. Verify Fast Add Page
            page.goto(f"{app_url}/#/fast-add")
            page.locator('[data-testid="quick-add-page"]').wait_for(state="visible", timeout=10000)
            assert page.locator('[data-testid="quick-add-page"]').is_visible(), "quick-add-page container missing"
            assert page.locator('[data-testid="quick-add-barcode-input"]').is_visible(), "quick-add-barcode-input missing"
            assert page.locator('[data-testid="quick-add-generate-barcode-button"]').is_visible(), "quick-add-generate-barcode-button missing"
            assert page.locator('[data-testid="quick-add-category-select"]').is_visible(), "quick-add-category-select missing"
            assert page.locator('[data-testid="quick-add-subcategory-select"]').is_visible(), "quick-add-subcategory-select missing"
            safe_print("PASS: Fast Add / Quick Add Page elements verified.")

            # 4. Verify Store Settings Page
            page.goto(f"{app_url}/#/setari-magazin")
            page.locator('[data-testid="store-settings-page"]').wait_for(state="visible", timeout=10000)
            assert page.locator('[data-testid="store-settings-page"]').is_visible(), "store-settings-page container missing"
            assert page.locator('[data-testid="store-settings-header"]').is_visible(), "store-settings-header container missing"
            assert page.locator('[data-testid="store-settings-reload-button"]').is_visible(), "store-settings-reload-button missing"
            assert page.locator('[data-testid="settings-app-version-label"]').is_visible(), "settings-app-version-label missing"
            assert page.locator('[data-testid="settings-app-runtime-label"]').is_visible(), "settings-app-runtime-label missing"
            assert page.locator('[data-testid="app-window-state-indicator"]').is_visible(), "app-window-state-indicator missing"
            safe_print("PASS: Store Settings Page elements verified.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                safe_print(f"Current URL: {page.url}")
                body_text = page.locator("body").inner_text()
                safe_print("Visible text on page:")
                safe_print(body_text)
            except Exception as inner_e:
                safe_print(f"Could not retrieve page text: {inner_e}")
            page.screenshot(path="screenshot_e2e_6ux4_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL CATALOG, FORMS & SETTINGS E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
