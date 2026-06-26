import sys
import os
import re
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_e2e_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR POS BARCODE ENTER AUTO-ADD ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        
        # Inject Mock Electron API and config
        context.add_init_script("""
            window.electronAPI = {
                isElectron: true,
                writeFiscalNetFile: async (args) => {
                    window.mockLastWriteArgs = args;
                    return { success: true, filePath: args.bonuriPath + '\\\\' + args.filename };
                },
                readFiscalNetResponse: async (args) => {
                    return { success: true, content: 'UR1^12345^0^EMIS CU SUCCES^' };
                }
            };
            window.SGR_CHECKOUT_BACKEND_ENABLED = true;
            
            localStorage.setItem('fiscalnet-pilot-config', JSON.stringify({
                enabled: true,
                bonuriPath: 'C:\\\\FakeFiscalNet\\\\Bonuri',
                raspunsPath: 'C:\\\\FakeFiscalNet\\\\Raspuns',
                realWriteEnabled: true,
                requireConfirmation: false,
                validatedAt: new Date().toISOString()
            }));
        """)
        
        page = context.new_page()
        
        # Add listeners for console logs and errors
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        # Auto-accept window.confirm dialogs
        page.on("dialog", lambda dialog: dialog.accept())
        
        norm_id = None
        sgr_id = None
        
        try:
            # Go to Login
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # Seed products in Database
            seeding = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                
                const timestamp = Date.now();
                const normBarcode = '590' + (timestamp % 1000000000);
                const sgrBarcode = '590' + ((timestamp + 999) % 1000000000);
                
                // Normal Product (5.00 lei, 10 stock)
                const { data: pNorm } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: normBarcode,
                    name: 'E2E_NORM_' + normBarcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false
                }).select().single();
                
                await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: pNorm.id,
                    price_sale: 5.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                
                await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: pNorm.id,
                    zone: 'magazin',
                    quantity: 10,
                    batch_number: 'LOT_NORM_' + normBarcode
                });

                // SGR Product (4.50 lei, 10 stock)
                const { data: pSgr } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: sgrBarcode,
                    name: 'E2E_SGR_' + sgrBarcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: true,
                    sgr_type: 'metal'
                }).select().single();
                
                await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    price_sale: 4.50,
                    vat_group: 'A',
                    vat_percent: 19
                });
                
                await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    zone: 'magazin',
                    quantity: 10,
                    batch_number: 'LOT_SGR_' + sgrBarcode
                });

                return {
                    normId: pNorm.id,
                    normBarcode,
                    normName: 'E2E_NORM_' + normBarcode,
                    sgrId: pSgr.id,
                    sgrBarcode,
                    sgrName: 'E2E_SGR_' + sgrBarcode
                };
            }""")
            safe_print(f"[INFO] Seeded products: {seeding}")
            
            norm_id = seeding["normId"]
            norm_barcode = seeding["normBarcode"]
            norm_name = seeding["normName"]
            sgr_id = seeding["sgrId"]
            sgr_barcode = seeding["sgrBarcode"]
            sgr_name = seeding["sgrName"]

            # Go to POS
            page.goto("http://localhost:5174/#/vanzare")
            page.wait_for_timeout(2000)

            # Open shift if locked
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            if lock_screen.is_visible():
                page.locator("button:has-text('Deschide')").first.click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible")
                page.locator("input[type='number']").fill("100")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached")
                safe_print("[PASS] Shift opened.")

            # Scenario A: Barcode Paste + Enter
            safe_print("\n--- Running Scenario A: Barcode paste + Enter ---")
            input_locator = page.locator('[data-testid="pos-scan-input"]')
            input_locator.wait_for(state="visible", timeout=10000)
            input_locator.fill(norm_barcode)
            input_locator.press("Enter")
            
            # Wait for product to be added to cart
            page.locator(f'[data-testid="pos-cart-line-{norm_id}"]').wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Product successfully added to cart via barcode Enter.")
            
            # Verify input is cleared
            input_val = input_locator.input_value()
            assert input_val == "", f"Input should be empty, but is '{input_val}'"
            safe_print("[PASS] Barcode input is cleared.")
            
            # Verify quantity is 1
            qty_val = page.locator(f'[data-testid="pos-cart-qty-{norm_id}"]').inner_text()
            assert qty_val == "1", f"Quantity should be 1, but is '{qty_val}'"
            safe_print("[PASS] Cart quantity is 1.")
            
            # Verify total is correct
            total_val = page.locator('[data-testid="pos-cart-total"]').inner_text()
            assert "5.00" in total_val, f"Total should be 5.00, but is '{total_val}'"
            safe_print("[PASS] Cart total is 5.00.")

            # Scenario B: Repeated scan (Enter 2 more times)
            safe_print("\n--- Running Scenario B: Repeated scan ---")
            # Scan 2
            input_locator.fill(norm_barcode)
            input_locator.press("Enter")
            page.wait_for_timeout(300)
            
            # Scan 3
            input_locator.fill(norm_barcode)
            input_locator.press("Enter")
            page.wait_for_timeout(300)
            
            # Verify quantity is 3
            qty_val = page.locator(f'[data-testid="pos-cart-qty-{norm_id}"]').inner_text()
            assert qty_val == "3", f"Quantity should be 3, but is '{qty_val}'"
            safe_print("[PASS] Cart quantity is 3 after repeated scans.")
            
            # Verify no duplicate rows
            rows_count = page.locator(f'[data-testid="pos-cart-line-{norm_id}"]').count()
            assert rows_count == 1, f"Expected 1 cart line for product, got {rows_count}"
            safe_print("[PASS] No duplicate lines created.")
            
            # Verify total is 15.00
            total_val = page.locator('[data-testid="pos-cart-total"]').inner_text()
            assert "15.00" in total_val, f"Total should be 15.00, but is '{total_val}'"
            safe_print("[PASS] Cart total updated correctly to 15.00.")

            # Scenario C: SGR scan
            safe_print("\n--- Running Scenario C: SGR scan ---")
            # Reload to clear cart React state
            page.reload()
            page.wait_for_timeout(500)
            discard_btn = page.locator('[data-testid="pos-cart-recovery-discard-button"]').first
            if discard_btn.is_visible():
                discard_btn.click()
                page.wait_for_timeout(500)
            page.locator('[data-testid="pos-scan-input"]').wait_for(state="visible")
            
            # Scan SGR product twice
            input_locator = page.locator('[data-testid="pos-scan-input"]')
            
            input_locator.fill(sgr_barcode)
            input_locator.press("Enter")
            page.locator(f'[data-testid="pos-cart-line-{sgr_id}"]').wait_for(state="visible", timeout=5000)
            
            input_locator.fill(sgr_barcode)
            input_locator.press("Enter")
            page.wait_for_timeout(500)
            
            # Verify SGR quantity is 2
            qty_val = page.locator(f'[data-testid="pos-cart-qty-{sgr_id}"]').inner_text()
            assert qty_val == "2", f"Quantity of SGR item should be 2, but is '{qty_val}'"
            safe_print("[PASS] SGR product quantity is 2.")
            
            # Verify SGR total is 1.00
            sgr_total = page.locator('[data-testid="pos-sgr-total"]').inner_text()
            assert "1.00" in sgr_total, f"SGR total should be 1.00, but is '{sgr_total}'"
            safe_print("[PASS] SGR total is 1.00.")
            
            # Verify total is 10.00 (2 * 4.50 + 1.00)
            total_val = page.locator('[data-testid="pos-cart-total"]').inner_text()
            assert "10.00" in total_val, f"Total should be 10.00, but is '{total_val}'"
            safe_print("[PASS] Grand total includes SGR correctly (10.00 lei).")

            # Scenario D: Unknown barcode
            safe_print("\n--- Running Scenario D: Unknown barcode ---")
            unknown_barcode = "9999999999999"
            input_locator.fill(unknown_barcode)
            input_locator.press("Enter")
            
            # Wait for error message
            not_found_banner = page.locator('[data-testid="pos-barcode-not-found"]')
            not_found_banner.wait_for(state="visible", timeout=5000)
            banner_text = not_found_banner.inner_text()
            assert unknown_barcode in banner_text, f"Expected barcode in error text, got: {banner_text}"
            assert "nu există" in banner_text, f"Expected error message, got: {banner_text}"
            safe_print("[PASS] Not found error banner displayed correctly.")
            
            # Verify focus is still on input
            is_focused = page.evaluate("document.activeElement === document.querySelector('[data-testid=\"pos-scan-input\"]')")
            assert is_focused, "Input should remain focused"
            safe_print("[PASS] Focus remains on barcode input.")

            # Scenario E: FiscalNet regression
            safe_print("\n--- Running Scenario E: FiscalNet regression ---")
            # Reload to clear cart
            page.reload()
            page.wait_for_timeout(500)
            discard_btn = page.locator('[data-testid="pos-cart-recovery-discard-button"]').first
            if discard_btn.is_visible():
                discard_btn.click()
                page.wait_for_timeout(500)
            page.locator('[data-testid="pos-scan-input"]').wait_for(state="visible")
            
            # Add normal product again
            input_locator = page.locator('[data-testid="pos-scan-input"]')
            input_locator.fill(norm_barcode)
            input_locator.press("Enter")
            page.locator(f'[data-testid="pos-cart-line-{norm_id}"]').wait_for(state="visible")
            
            # Click checkout (Încasează)
            page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
            
            # Wait for cart to clear
            page.locator("[data-testid='pos-cart-total']:has-text('0.00')").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Checkout finalized.")
            
            # Verify FiscalNet write was called
            mock_args = page.evaluate("window.mockLastWriteArgs")
            assert mock_args is not None, "mockLastWriteArgs should not be None"
            assert "S^" + norm_name in mock_args["content"], "Product should be present in written text"
            assert "P^1^500" in mock_args["content"], "Payment amount should be present in written text"
            safe_print("[PASS] FiscalNet post-checkout auto-write ran successfully.")

        except Exception as err:
            safe_print(f"[FAIL] Exception occurred: {err}")
            page.screenshot(path="screenshot_error.png", full_page=True)
            with open("debug_error.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            safe_print("[INFO] Saved screenshot_error.png and debug_error.html")
            raise err
            
        finally:
            # Database Cleanup
            if norm_id or sgr_id:
                safe_print("\n--- Database Cleanup ---")
                try:
                    page.evaluate(f"""async () => {{
                        const supabase = window.supabase;
                        if ("{norm_id}") await supabase.from('products').delete().eq('id', "{norm_id}");
                        if ("{sgr_id}") await supabase.from('products').delete().eq('id', "{sgr_id}");
                    }}""")
                    safe_print("[PASS] Seeding cleanup completed successfully.")
                except Exception as clean_err:
                    safe_print(f"[WARNING] Database cleanup failed: {clean_err}")

        context.close()
        browser.close()

if __name__ == '__main__':
    try:
        run_e2e_tests()
        safe_print("\n=== [SUCCESS] ALL POS BARCODE AUTO-ADD TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
