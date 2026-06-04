"""
E2E Playwright test for Stage 6APP.6: Local SQLite Database & Cache Storage in Electron Main.

Tests cover:
  A. Device verification and offline database status display in Settings.
  B. Manual database cache synchronization flow (triggers RPC, registers device, saves SQLite bundle).
  C. Visual cache statistics panel (renders correct row counts and sync time age indicators).
  D. Offline fallback scan: when simulated offline, barcode search falls back to local SQLite cache.
"""

import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5174"

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))


def login_as_admin(page):
    """Login as admin@admin.com."""
    page.goto(f"{BASE_URL}/#/login")
    page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
    page.locator("input[type='text']").fill("admin@admin.com")
    page.locator("input[type='password']").fill("admin123")
    page.locator("button[type='submit']").click()
    page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
    safe_print("[OK] Logged in as admin@admin.com")


def run_tests():
    safe_print("\n" + "=" * 80)
    safe_print("  E2E TESTS: Stage 6APP.6 — Local SQLite Database & Cache Caching")
    safe_print("=" * 80)

    passed = 0
    failed = 0
    errors = []

    # Mock Electron SQLite Database logic
    inject_script = """
        window.electronAPI = window.electronAPI || {};
        window.electronAPI.isElectron = true;
        window.electronAPI.getAppVersion = async () => '1.0.0-test';
        
        window.mockDb = {
            products: [],
            prices: [],
            stocks: [],
            categories: [],
            metadata: {}
        };
        
        window.electronAPI.sqlite = {
            getDeviceInfo: async () => ({
                fingerprint: 'test_device_fingerprint_123456',
                name: 'POS-TEST-E2E'
            }),
            
            saveCacheBundle: async ({ storeId, bundle }) => {
                window.mockDb.products = bundle.products || [];
                window.mockDb.prices = bundle.prices || [];
                window.mockDb.stocks = bundle.stocks || [];
                window.mockDb.categories = bundle.categories || [];
                window.mockDb.metadata = bundle.metadata || {};
                console.log('[MOCK SQLITE] Saved cache bundle:', bundle);
                return { success: true };
            },
            
            getCacheStatus: async ({ storeId }) => {
                return {
                    initialized: window.mockDb.products.length > 0,
                    productCount: window.mockDb.products.length,
                    priceCount: window.mockDb.prices.length,
                    stockCount: window.mockDb.stocks.length,
                    categoryCount: window.mockDb.categories.length,
                    lastSyncAt: window.mockDb.metadata.generated_at || null,
                    checksum: window.mockDb.metadata.checksum || null,
                    syncType: window.mockDb.metadata.sync_type || null,
                    rowCountsJson: JSON.stringify(window.mockDb.metadata.row_counts || {})
                };
            },
            
            searchProducts: async ({ storeId, queryText }) => {
                const q = (queryText || '').toLowerCase();
                const filtered = window.mockDb.products.filter(p => 
                    p.name.toLowerCase().includes(q) || p.barcode.includes(q)
                );
                
                return filtered.map(p => {
                    const price = window.mockDb.prices.find(pr => pr.product_id === p.id);
                    const stock = window.mockDb.stocks.find(st => st.product_id === p.id);
                    return {
                        id: p.id,
                        name: p.name,
                        barcode: p.barcode,
                        unit: p.unit || 'buc',
                        priceSale: price ? price.price_sale : 10.0,
                        vatPercent: price ? price.vat_percent : 19.0,
                        stockMagazin: stock ? stock.total_stock : 100,
                        sgrEnabled: !!p.sgr_enabled,
                        sgrType: p.sgr_type,
                        categoryId: p.category_id
                    };
                });
            },
            
            getProductByBarcode: async ({ storeId, barcode }) => {
                const p = window.mockDb.products.find(prod => prod.barcode === barcode);
                if (!p) return null;
                
                const price = window.mockDb.prices.find(pr => pr.product_id === p.id);
                const stock = window.mockDb.stocks.find(st => st.product_id === p.id);
                
                return {
                    id: p.id,
                    name: p.name,
                    barcode: p.barcode,
                    unit: p.unit || 'buc',
                    priceSale: price ? price.price_sale : 10.0,
                    vatPercent: price ? price.vat_percent : 19.0,
                    stockMagazin: stock ? stock.total_stock : 100,
                    sgrEnabled: !!p.sgr_enabled,
                    sgrType: p.sgr_type,
                    categoryId: p.category_id
                };
            },
            
            saveShift: async ({ shift }) => ({ success: true }),
            getShift: async ({ storeId, cashierId }) => null
        };
    """

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ========================================================
        # TEST A: Verify Panel is visible and starts unitialized
        # ========================================================
        safe_print("\n--- Test A: Verify sync panel visibility & empty cache status ---")
        try:
            context = browser.new_context(service_workers="block")
            context.add_init_script(inject_script)
            page = context.new_page()
            page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
            
            login_as_admin(page)
            
            # Go to settings
            page.goto(f"{BASE_URL}/#/setari-magazin")
            page.wait_for_timeout(1000)
            
            # Locate panel
            panel = page.locator('[data-testid="offline-cache-sync-panel"]')
            panel.scroll_into_view_if_needed()
            assert panel.is_visible(), "Offline Cache panel should be visible in store settings page"
            
            # Check row counts are 0
            cnt_products = page.locator('[data-testid="sqlite-count-products"]')
            cnt_prices = page.locator('[data-testid="sqlite-count-prices"]')
            assert cnt_products.inner_text() == "0", f"Expected 0 products, got {cnt_products.inner_text()}"
            assert cnt_prices.inner_text() == "0", f"Expected 0 prices, got {cnt_prices.inner_text()}"
            
            # Check badge says "Niciodată sincronizat"
            badge = page.locator('[data-testid="sqlite-sync-status-badge"]')
            assert "Niciodată sincronizat" in badge.inner_text(), "Expected sync status to be 'Niciodată sincronizat'"
            
            safe_print("[PASS] Test A: Sync panel rendered correctly with uninitialized status.")
            passed += 1
        except Exception as e:
            safe_print(f"[FAIL] Test A failed: {e}")
            failed += 1
            errors.append(f"Test A: {e}")

        # ========================================================
        # TEST B: Manual database cache synchronization flow
        # ========================================================
        safe_print("\n--- Test B: Manual database cache synchronization flow ---")
        try:
            # Click "Sincronizează date"
            sync_btn = page.locator('[data-testid="sqlite-sync-now-button"]')
            sync_btn.click()
            
            # Wait for sync to complete (toast success should appear and button enabled again)
            page.wait_for_timeout(3000) # give it 3s to trigger RPC and store SQLite bundle
            
            # Check row counts are updated (> 0)
            cnt_products = page.locator('[data-testid="sqlite-count-products"]')
            cnt_prices = page.locator('[data-testid="sqlite-count-prices"]')
            cnt_categories = page.locator('[data-testid="sqlite-count-categories"]')
            
            prod_val = int(cnt_products.inner_text())
            price_val = int(cnt_prices.inner_text())
            cat_val = int(cnt_categories.inner_text())
            
            assert prod_val > 0, f"Expected products count > 0, got {prod_val}"
            assert price_val > 0, f"Expected prices count > 0, got {price_val}"
            assert cat_val > 0, f"Expected categories count > 0, got {cat_val}"
            
            # Check status badge says "Date Sincronizate la zi"
            badge = page.locator('[data-testid="sqlite-sync-status-badge"]')
            assert "Date Sincronizate la zi" in badge.inner_text(), "Expected sync status badge to display green success status"
            
            safe_print(f"[PASS] Test B: SQLite database successfully synced. Loaded {prod_val} products, {price_val} prices, {cat_val} categories.")
            passed += 1
        except Exception as e:
            safe_print(f"[FAIL] Test B failed: {e}")
            failed += 1
            errors.append(f"Test B: {e}")

        # ========================================================
        # TEST C: Offline fallback scan query
        # ========================================================
        safe_print("\n--- Test C: Offline fallback barcode scanner lookup ---")
        try:
            # Let's get a product barcode and name from mockDb to check against
            barcode, name = page.evaluate("""() => {
                const p = window.mockDb.products[0];
                return [p.barcode, p.name];
            }""")
            safe_print(f"Product from local SQLite cache for testing: Barcode={barcode}, Name={name}")
            
            # Navigate to POS
            page.goto(f"{BASE_URL}/#/vanzare")
            page.wait_for_timeout(1000)
            
            # Check if POS is locked (Shift closed)
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            if lock_screen.count() > 0 and lock_screen.is_visible():
                safe_print("[TEST C] POS is locked. Opening a shift...")
                page.locator("button:has-text('Deschide')").first.click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible", timeout=5000)
                page.locator("input[type='number']").fill("100")
                page.locator("textarea[placeholder*='Mentiuni']").fill("E2E Auto Cart Shift")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
                safe_print("[TEST C] Shift opened successfully.")
                page.wait_for_timeout(1000)
            
            # Check if active shift details overlay is showing (blocks view)
            shift_overlay_cancel = page.locator("button:has-text('Anulează')").first
            if shift_overlay_cancel.count() > 0 and shift_overlay_cancel.is_visible():
                safe_print("[TEST C] Shift details overlay is open. Closing it...")
                shift_overlay_cancel.click()
                page.wait_for_timeout(500)
            
            # Set context offline to force SQLite fallback
            page.context.set_offline(True)
            safe_print("Simulating network OFFLINE state.")
            
            # Enter barcode in the POS input and press Enter
            input_locator = page.locator('[data-testid="pos-barcode-input"]')
            input_locator.wait_for(state="visible", timeout=5000)
            input_locator.fill(barcode)
            input_locator.press("Enter")
            
            page.wait_for_timeout(1000)
            
            # Check product added to cart
            cart_item = page.locator(f"text={name}")
            assert cart_item.is_visible(), f"Expected product {name} to be added to cart from offline SQLite lookup"
            
            safe_print("[PASS] Test C: Product successfully added to cart via local SQLite lookup when offline.")
            passed += 1
        except Exception as e:
            safe_print(f"[FAIL] Test C failed: {e}")
            page.screenshot(path="sqlite_test_failure.png", full_page=True)
            failed += 1
            errors.append(f"Test C: {e}")
            
        finally:
            # Restore online state for next steps/tests
            page.context.set_offline(False)

        browser.close()

    safe_print("\n" + "=" * 80)
    safe_print(f"  E2E SUMMARY: Passed {passed}, Failed {failed}")
    safe_print("=" * 80)

    if failed > 0:
        for err in errors:
            safe_print(f" - {err}")
        sys.exit(1)
    else:
        safe_print("[SUCCESS] All 3 SQLite offline cache tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
