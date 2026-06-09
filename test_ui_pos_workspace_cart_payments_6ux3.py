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
    safe_print("RUNNING STATIC CHECKS FOR POS WORKSPACE, CART & PAYMENTS (6UX.3)")
    safe_print("======================================================================\n")

    # 1. Check PosPage.tsx updates
    safe_print("--- Check 1: PosPage.tsx ---")
    pos_file = os.path.join("src", "features", "pos", "PosPage.tsx")
    with open(pos_file, "r", encoding="utf-8") as f:
        pos_content = f.read()
    assert "productsSubtotal" in pos_content, "PosPage.tsx missing productsSubtotal destructuring/pass"
    assert "cartSgrTotal" in pos_content, "PosPage.tsx missing cartSgrTotal destructuring/pass"
    assert "clearCart" in pos_content, "PosPage.tsx missing clearCart destructuring/pass"
    assert "onClearCart=" in pos_content, "PosPage.tsx missing onClearCart pass to PosPaymentPanel"
    safe_print("PASS: PosPage.tsx static checks passed.")

    # 2. Check PosSearchBar.tsx updates
    safe_print("\n--- Check 2: PosSearchBar.tsx ---")
    search_file = os.path.join("src", "features", "pos", "components", "PosSearchBar.tsx")
    with open(search_file, "r", encoding="utf-8") as f:
        search_content = f.read()
    assert 'data-testid="pos-scan-area"' in search_content, "PosSearchBar.tsx missing pos-scan-area wrapper"
    assert 'data-testid="pos-scan-input"' in search_content, "PosSearchBar.tsx missing pos-scan-input input element"
    assert 'data-testid="pos-scan-status-badge"' in search_content, "PosSearchBar.tsx missing pos-scan-status-badge indicator"
    safe_print("PASS: PosSearchBar.tsx static checks passed.")

    # 3. Check PosCart.tsx updates
    safe_print("\n--- Check 3: PosCart.tsx ---")
    cart_file = os.path.join("src", "features", "pos", "components", "PosCart.tsx")
    with open(cart_file, "r", encoding="utf-8") as f:
        cart_content = f.read()
    assert "EmptyState" in cart_content, "PosCart.tsx missing EmptyState component import/render"
    assert 'data-testid="pos-cart-empty-state"' in cart_content, "PosCart.tsx missing pos-cart-empty-state container"
    assert 'data-testid="pos-cart-item-row"' in cart_content, "PosCart.tsx missing pos-cart-item-row identifier"
    assert 'data-testid="pos-cart-item-name"' in cart_content, "PosCart.tsx missing pos-cart-item-name element"
    assert 'data-testid="pos-cart-item-quantity"' in cart_content, "PosCart.tsx missing pos-cart-item-quantity display element"
    assert 'data-testid="pos-cart-decrement-button"' in cart_content, "PosCart.tsx missing pos-cart-decrement-button"
    assert 'data-testid="pos-cart-increment-button"' in cart_content, "PosCart.tsx missing pos-cart-increment-button"
    assert 'data-testid="pos-cart-remove-button"' in cart_content, "PosCart.tsx missing pos-cart-remove-button"
    # Touch target check (should be w-11 h-11)
    assert "w-11 h-11" in cart_content, "PosCart.tsx decrement/increment buttons missing w-11 h-11 dimensions (touch target >= 44px)"
    safe_print("PASS: PosCart.tsx static checks passed.")

    # 4. Check PosPaymentPanel.tsx updates
    safe_print("\n--- Check 4: PosPaymentPanel.tsx ---")
    pay_file = os.path.join("src", "features", "pos", "components", "PosPaymentPanel.tsx")
    with open(pay_file, "r", encoding="utf-8") as f:
        pay_content = f.read()
    assert 'data-testid="pos-payment-cash-button"' in pay_content, "PosPaymentPanel.tsx missing cash button testid"
    assert 'data-testid="pos-payment-card-button"' in pay_content, "PosPaymentPanel.tsx missing card button testid"
    assert 'data-testid="pos-payment-mixed-button"' in pay_content, "PosPaymentPanel.tsx missing mixed button testid"
    assert 'data-testid="pos-checkout-button"' in pay_content, "PosPaymentPanel.tsx missing checkout button testid"
    assert 'data-testid="pos-clear-cart-button"' in pay_content, "PosPaymentPanel.tsx missing clear/cancel cart button testid"
    assert 'data-testid="pos-subtotal-display"' in pay_content, "PosPaymentPanel.tsx missing subtotal display testid"
    assert 'data-testid="pos-sgr-display"' in pay_content, "PosPaymentPanel.tsx missing SGR display testid"
    assert 'data-testid="pos-payment-remaining-display"' in pay_content, "PosPaymentPanel.tsx missing remaining payment display testid"
    assert 'data-testid="pos-fiscalnet-status-badge"' in pay_content, "PosPaymentPanel.tsx missing FiscalNet status badge testid"
    safe_print("PASS: PosPaymentPanel.tsx static checks passed.")

    # 5. Check PosCartEventsPanel.tsx updates
    safe_print("\n--- Check 5: PosCartEventsPanel.tsx ---")
    events_file = os.path.join("src", "features", "pos", "components", "PosCartEventsPanel.tsx")
    with open(events_file, "r", encoding="utf-8") as f:
        events_content = f.read()
    assert 'data-testid="pos-cart-event-quantity-change"' in events_content, "PosCartEventsPanel.tsx missing quantity change testid"
    safe_print("PASS: PosCartEventsPanel.tsx static checks passed.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR POS WORKSPACE, CART & PAYMENTS (6UX.3)")
    safe_print("======================================================================\n")

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
                        { id: 'p1', name: 'Produs Test SGR', barcode: '123456', price: 10.0, stock: 15, vat_rate: 19, sgr_enabled: true, sgr_type: 'sticla' },
                        { id: 'p2', name: 'Produs Test Non-SGR', barcode: '789012', price: 5.0, stock: 8, vat_rate: 9, sgr_enabled: false }
                    ],
                    logCartEvent: async (evt) => { window.__loggedEvents.push(evt); return { success: true }; },
                    listCartEvents: async (args) => window.__loggedEvents,
                    getOfflineSalesSummary: async (args) => ({ queuedCount: 0, queuedTotal: 0, lastSale: null }),
                    getCacheStatus: async (args) => ({ initialized: true, productCount: 2, lastSyncAt: new Date().toISOString() }),
                    getShift: async (args) => ({ shift_id: 'test_shift_123', status: 'open' }),
                    validateCartItems: async (args) => ({ valid: true }),
                    searchProducts: async (args) => [
                        { id: 'p1', name: 'Produs Test SGR', barcode: '123456', priceSale: 10.0, stockMagazin: 15, vatPercent: 19, sgrEnabled: true, sgrType: 'sticla', unit: 'buc' },
                        { id: 'p2', name: 'Produs Test Non-SGR', barcode: '789012', priceSale: 5.0, stockMagazin: 8, vatPercent: 9, sgrEnabled: false, sgrType: null, unit: 'buc' }
                    ]
                }
            };
        """

        # Context Setup
        context = browser.new_context(service_workers="block")
        context.add_init_script(init_script)
        page = context.new_page()

        try:
            # Login as Casier
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("casier@casier.com")
            page.locator("input[type='password']").fill("casier123")
            page.locator("button[type='submit']").click()
            page.wait_for_url("**/pos", timeout=15000)

            # Ensure we are redirected to /pos
            current_url = page.url
            assert "/pos" in current_url, f"Expected cashier redirect to POS route, got {current_url}"
            safe_print("PASS: Redirected to POS successfully.")

            # Force offline mode for deterministic search/checkout
            page.evaluate("""() => {
                Object.defineProperty(navigator, 'onLine', { get: () => false });
                window.dispatchEvent(new Event('offline'));
            }""")
            page.wait_for_timeout(1000)

            # 1. Verify POS layout root & subcomponents
            page.locator('[data-testid="pos-layout-root"]').wait_for(state="visible", timeout=10000)
            assert page.locator('[data-testid="pos-layout-root"]').is_visible(), "pos-layout-root missing"
            
            page.locator('[data-testid="pos-scan-area"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-scan-area"]').is_visible(), "pos-scan-area missing"
            
            page.locator('[data-testid="pos-scan-input"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-scan-input"]').is_visible(), "pos-scan-input missing"
            
            page.locator('[data-testid="pos-cart-panel"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-cart-panel"]').is_visible(), "pos-cart-panel missing"
            
            page.locator('[data-testid="pos-payment-panel"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-payment-panel"]').is_visible(), "pos-payment-panel missing"
            
            page.locator('[data-testid="pos-total-display"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-total-display"]').is_visible(), "pos-total-display missing"
            safe_print("PASS: Core POS containers and layout verified.")

            # 2. Verify empty state renders EmptyState component
            page.locator('[data-testid="pos-cart-empty-state"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-cart-empty-state"]').is_visible(), "pos-cart-empty-state missing when cart is empty"
            safe_print("PASS: Empty state renders correctly.")

            # 3. Add items to cart (simulate searching)
            page.locator('[data-testid="pos-scan-input"]').fill("Produs")
            
            # Wait for search results
            page.locator('button:has-text("Produs Test SGR")').wait_for(state="visible", timeout=5000)
            page.locator('button:has-text("Produs Test SGR")').click()

            # Verify cart item row & sub-elements
            page.locator('[data-testid="pos-cart-item-row"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-cart-item-row"]').is_visible(), "pos-cart-item-row missing"
            assert page.locator('[data-testid="pos-cart-item-name"]').is_visible(), "pos-cart-item-name missing"
            assert page.locator('[data-testid="pos-cart-item-quantity"]').is_visible(), "pos-cart-item-quantity text display missing"
            safe_print("PASS: Cart item details verified.")

            # Verify touch target buttons
            inc_button = page.locator('[data-testid="pos-cart-increment-button"]')
            dec_button = page.locator('[data-testid="pos-cart-decrement-button"]')
            rem_button = page.locator('[data-testid="pos-cart-remove-button"]')
            assert inc_button.is_visible(), "pos-cart-increment-button missing"
            assert dec_button.is_visible(), "pos-cart-decrement-button missing"
            assert rem_button.is_visible(), "pos-cart-remove-button missing"
            safe_print("PASS: Increment/Decrement and remove buttons verified.")

            # Test quantity increment (touch button)
            inc_button.click()
            page.wait_for_timeout(500)
            qty_text = page.locator('[data-testid="pos-cart-item-quantity"]').inner_text()
            assert "2" in qty_text, f"Quantity should have increased to 2, got {qty_text}"
            safe_print("PASS: Quantity increment button works correctly.")

            # 4. Verify payment buttons, subtotal, SGR, and clear buttons
            page.locator('[data-testid="pos-payment-cash-button"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-payment-cash-button"]').is_visible(), "pos-payment-cash-button missing"
            assert page.locator('[data-testid="pos-payment-card-button"]').is_visible(), "pos-payment-card-button missing"
            assert page.locator('[data-testid="pos-payment-mixed-button"]').is_visible(), "pos-payment-mixed-button missing"
            assert page.locator('[data-testid="pos-checkout-button"]').is_visible(), "pos-checkout-button missing"
            assert page.locator('[data-testid="pos-clear-cart-button"]').is_visible(), "pos-clear-cart-button missing"
            assert page.locator('[data-testid="pos-fiscalnet-status-badge"]').is_visible(), "pos-fiscalnet-status-badge missing"
            
            # Since SGR item is in cart, verify subtotal and sgr displays in payment panel
            page.locator('[data-testid="pos-subtotal-display"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-subtotal-display"]').is_visible(), "pos-subtotal-display missing"
            assert page.locator('[data-testid="pos-sgr-display"]').is_visible(), "pos-sgr-display missing"
            safe_print("PASS: Payment buttons, subtotal, SGR displays, and FiscalNet status badges verified.")

            # 5. Verify mixed payment and remaining display
            page.locator('[data-testid="pos-payment-mixed-button"]').click()
            page.locator('[data-testid="pos-payment-remaining-display"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-payment-remaining-display"]').is_visible(), "pos-payment-remaining-display missing in mixed mode"
            safe_print("PASS: Mixed payment mode remaining display verified.")

            # 6. Verify clear cart button clears the cart
            page.locator('[data-testid="pos-clear-cart-button"]').click()
            page.locator('[data-testid="pos-cart-empty-state"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="pos-cart-empty-state"]').is_visible(), "pos-clear-cart-button failed to empty the cart"
            safe_print("PASS: Clear/Cancel cart button works correctly.")

            context.close()
        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            page.screenshot(path="screenshot_pos_payments_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL POS WORKSPACE, CART & PAYMENTS E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
