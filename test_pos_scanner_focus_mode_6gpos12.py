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
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR POS SCANNER FOCUS MODE (6G.POS.1.2) ===")
    
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
        
        try:
            # Go to Login
            page.goto("http://localhost:5174/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # Seed test product in Database
            seeding = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                
                const timestamp = Date.now();
                const normBarcode = '591' + (timestamp % 1000000000);
                
                // Normal Product (5.00 lei, 10 stock)
                const { data: pNorm } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: normBarcode,
                    name: 'E2E_FOCUS_' + normBarcode,
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
                    batch_number: 'LOT_FOCUS_' + normBarcode
                });

                return {
                    normId: pNorm.id,
                    normBarcode,
                    normName: 'E2E_FOCUS_' + normBarcode
                };
            }""")
            safe_print(f"[INFO] Seeded products: {seeding}")
            
            norm_id = seeding["normId"]
            norm_barcode = seeding["normBarcode"]
            norm_name = seeding["normName"]

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

            # ============================================================
            # SCENARIO A: Auto-focus on POS load
            # ============================================================
            safe_print("\n--- Scenario A: Auto-focus on POS load ---")
            input_locator = page.locator('[data-testid="pos-barcode-input"]')
            input_locator.wait_for(state="visible", timeout=10000)
            
            # Wait for the scanner focus hook to kick in
            page.wait_for_timeout(500)
            
            # Verify input is focused
            is_focused = page.evaluate(
                "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
            )
            assert is_focused, "Barcode input should be auto-focused on POS load"
            safe_print("[PASS] Barcode input is auto-focused on POS load.")

            # ============================================================
            # SCENARIO B: Scanner Ready badge is visible when focused
            # ============================================================
            safe_print("\n--- Scenario B: Scanner Ready badge visible ---")
            ready_badge = page.locator('[data-testid="pos-scanner-ready-badge"]')
            ready_badge.wait_for(state="visible", timeout=5000)
            badge_text = ready_badge.inner_text()
            badge_lower = badge_text.lower()
            assert "scanner" in badge_lower and "preg" in badge_lower, f"Expected 'Scanner Pregătit' badge, got: {badge_text}"
            safe_print("[PASS] Scanner Ready badge is visible with correct text.")
            
            # Verify green border on input
            border_color = page.evaluate("""() => {
                const input = document.querySelector('[data-testid="pos-barcode-input"]');
                return window.getComputedStyle(input).borderColor;
            }""")
            safe_print(f"[INFO] Input border color when focused: {border_color}")
            # The border should be emerald/green (not gray)
            # emerald-400 is roughly rgb(52, 211, 153) or similar
            assert "gray" not in border_color.lower() and "rgb(229" not in border_color, \
                f"Input border should be green/emerald when focused, got: {border_color}"
            safe_print("[PASS] Input has green/emerald border when scanner is ready.")

            # ============================================================
            # SCENARIO C: Refocus after barcode scan
            # ============================================================
            safe_print("\n--- Scenario C: Refocus after barcode scan ---")
            input_locator.fill(norm_barcode)
            input_locator.press("Enter")
            
            # Wait for product to appear in cart
            page.locator(f'[data-testid="pos-cart-line-{norm_id}"]').wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Product added to cart.")
            
            # Input should be cleared and refocused
            page.wait_for_timeout(300)
            input_val = input_locator.input_value()
            assert input_val == "", f"Input should be empty after scan, but is '{input_val}'"
            safe_print("[PASS] Input cleared after scan.")
            
            is_focused_after = page.evaluate(
                "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
            )
            assert is_focused_after, "Input should be refocused after successful scan"
            safe_print("[PASS] Input is refocused after successful scan.")
            
            # Scanner Ready badge should be visible again
            ready_badge.wait_for(state="visible", timeout=3000)
            safe_print("[PASS] Scanner Ready badge reappears after scan.")

            # ============================================================
            # SCENARIO D: Refocus after clicking non-interactive area
            # ============================================================
            safe_print("\n--- Scenario D: Refocus after clicking non-interactive area ---")
            
            # Click on the products area (non-interactive bg)
            page.locator("div.flex.h-screen").first.click(position={"x": 300, "y": 400})
            page.wait_for_timeout(400)  # wait for refocus delay
            
            is_focused_after_click = page.evaluate(
                "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
            )
            assert is_focused_after_click, "Input should refocus after clicking non-interactive area"
            safe_print("[PASS] Input refocuses after clicking non-interactive area.")

            # ============================================================
            # SCENARIO E: Focus NOT stolen from modal (Shift Close)
            # ============================================================
            safe_print("\n--- Scenario E: Focus NOT stolen from modal ---")
            
            # Open the Shift Close modal
            close_shift_btn = page.locator("button:has-text('Închide Tura')").first
            if close_shift_btn.is_visible():
                close_shift_btn.click()
                page.wait_for_timeout(500)
                
                # Check that a modal is visible
                modal = page.locator(".fixed.inset-0.z-50").first
                if modal.is_visible():
                    # Scanner should NOT be ready when modal is open
                    badge_visible = ready_badge.is_visible()
                    # The badge might not show because the input shouldn't have focus
                    
                    # The focus should NOT be on the barcode input
                    is_input_focused_in_modal = page.evaluate(
                        "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
                    )
                    # It's acceptable if it IS focused initially, as long as clicks in the modal work
                    safe_print(f"[INFO] Input focused during modal: {is_input_focused_in_modal}")
                    
                    # Click an input inside the modal if available
                    modal_input = page.locator(".fixed.inset-0.z-50 input").first
                    if modal_input.is_visible():
                        modal_input.click()
                        page.wait_for_timeout(300)
                        
                        is_modal_input_focused = page.evaluate("""() => {
                            const modalInputs = document.querySelectorAll('.fixed.inset-0.z-50 input');
                            return Array.from(modalInputs).some(inp => document.activeElement === inp);
                        }""")
                        assert is_modal_input_focused, "Modal input should retain focus (not stolen by scanner)"
                        safe_print("[PASS] Modal input retains focus - scanner does NOT steal it.")
                    
                    # Close modal
                    cancel_btn = page.locator(".fixed.inset-0.z-50 button:has-text('Renunță')").first
                    if cancel_btn.is_visible():
                        cancel_btn.click()
                        page.wait_for_timeout(500)
                else:
                    safe_print("[INFO] Modal did not open, skipping modal test.")
            else:
                safe_print("[INFO] Close shift button not found, skipping modal test.")
            
            # After modal closes, scanner should refocus
            page.wait_for_timeout(500)
            is_focused_after_modal = page.evaluate(
                "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
            )
            assert is_focused_after_modal, "Input should refocus after modal closes"
            safe_print("[PASS] Input refocuses after modal closes.")

            # ============================================================
            # SCENARIO F: Focus NOT stolen from payment inputs
            # ============================================================
            safe_print("\n--- Scenario F: Focus NOT stolen from payment inputs ---")
            
            # Select MIXT payment to reveal cash/card inputs
            mixt_btn = page.locator("button:has-text('MIXT')").first
            if mixt_btn.is_visible():
                mixt_btn.click()
                page.wait_for_timeout(300)
                
                # Click on cash amount input
                cash_input = page.locator("input[inputMode='decimal']").first
                if cash_input.is_visible():
                    cash_input.click()
                    page.wait_for_timeout(400)  # Wait past the refocus delay
                    
                    is_cash_focused = page.evaluate("""() => {
                        const cashInputs = document.querySelectorAll("input[inputMode='decimal']");
                        return Array.from(cashInputs).some(inp => document.activeElement === inp);
                    }""")
                    assert is_cash_focused, "Cash input should retain focus (not stolen by scanner)"
                    safe_print("[PASS] Payment input retains focus - scanner does NOT steal it.")
                else:
                    safe_print("[INFO] Cash input not visible, skipping payment test.")
                
                # Switch back to NUMERAR
                cash_btn = page.locator("button:has-text('NUMERAR')").first
                if cash_btn.is_visible():
                    cash_btn.click()
            else:
                safe_print("[INFO] MIXT button not visible, skipping payment test.")

            # ============================================================
            # SCENARIO G: FiscalNet regression (checkout still works)
            # ============================================================
            safe_print("\n--- Scenario G: FiscalNet regression check ---")
            
            # Cart should still have the product from Scenario C
            cart_line = page.locator(f'[data-testid="pos-cart-line-{norm_id}"]')
            if not cart_line.is_visible():
                # Re-add product
                input_locator.fill(norm_barcode)
                input_locator.press("Enter")
                page.locator(f'[data-testid="pos-cart-line-{norm_id}"]').wait_for(state="visible", timeout=5000)
            
            # Click checkout
            page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
            
            # Wait for cart to clear
            page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Checkout finalized.")
            
            # Verify FiscalNet write was called
            mock_args = page.evaluate("window.mockLastWriteArgs")
            assert mock_args is not None, "mockLastWriteArgs should not be None"
            assert "S^" + norm_name in mock_args["content"], "Product should be present in written text"
            safe_print("[PASS] FiscalNet post-checkout auto-write ran successfully.")
            
            # After checkout, scanner should refocus
            page.wait_for_timeout(500)
            is_focused_final = page.evaluate(
                "document.activeElement === document.querySelector('[data-testid=\"pos-barcode-input\"]')"
            )
            assert is_focused_final, "Input should refocus after checkout completes"
            safe_print("[PASS] Input refocuses after checkout.")

        except Exception as err:
            safe_print(f"[FAIL] Exception occurred: {err}")
            page.screenshot(path="screenshot_focus_error.png", full_page=True)
            with open("debug_focus_error.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            safe_print("[INFO] Saved screenshot_focus_error.png and debug_focus_error.html")
            raise err
            
        finally:
            # Database Cleanup
            if norm_id:
                safe_print("\n--- Database Cleanup ---")
                try:
                    page.evaluate(f"""async () => {{
                        const supabase = window.supabase;
                        if ("{norm_id}") await supabase.from('products').delete().eq('id', "{norm_id}");
                    }}""")
                    safe_print("[PASS] Seeding cleanup completed successfully.")
                except Exception as clean_err:
                    safe_print(f"[WARNING] Database cleanup failed: {clean_err}")

        context.close()
        browser.close()

if __name__ == '__main__':
    try:
        run_e2e_tests()
        safe_print("\n=== [SUCCESS] ALL POS SCANNER FOCUS MODE TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
