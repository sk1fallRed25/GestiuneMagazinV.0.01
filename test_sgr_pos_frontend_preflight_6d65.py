import sys
import time
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_test():
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
        try:
            # 1. Login
            safe_print("\n1. Navigating to login...")
            page.add_init_script("window.SGR_CHECKOUT_BACKEND_ENABLED = false;")
            page.goto("http://localhost:5173/#/login")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            
            safe_print("Logging in as admin@admin.com ...")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.wait_for_timeout(500)
            page.locator("button[type='submit']").click()
            
            safe_print("Waiting for Dashboard to load...")
            page.locator("h1:has-text('Dashboard')").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")
            
            # Switch to Magazin Principal if the switcher button is present
            switcher = page.locator("button[aria-label*='context']")
            if switcher.is_visible():
                current_store_text = switcher.inner_text()
                if "Magazin Principal" not in current_store_text:
                    safe_print("Switching to Magazin Principal...")
                    switcher.click()
                    page.wait_for_timeout(500)
                    page.locator("button:has-text('Magazin Principal')").click()
                    page.wait_for_timeout(2000)
                else:
                    safe_print("Already on Magazin Principal.")
            else:
                safe_print("Switcher is not interactive (single store or static context).")

            # 2. Database Seeding of Test Products
            safe_print("\n2. Seeding test products via window.supabase...")
            seeding_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                // Get active store_id
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                // Cleanup old test products
                await supabase.from('products').delete().in('barcode', ['E2E_SGR_PRE_123', 'E2E_NORM_PRE_123']);
                
                // Insert SGR Product (sgr_enabled=true, type=plastic)
                const { data: pSgr, error: errSgr } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: 'E2E_SGR_PRE_123',
                    name: 'PRODUS_SGR_E2E',
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: true,
                    sgr_type: 'plastic'
                }).select().single();
                if (errSgr) throw errSgr;
                
                await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    price_sale: 10.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                
                await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    zone: 'magazin',
                    quantity: 15,
                    batch_number: 'LOT_SGR_E2E'
                });

                // Insert Normal Product (sgr_enabled=false)
                const { data: pNorm, error: errNorm } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: 'E2E_NORM_PRE_123',
                    name: 'PRODUS_NORMAL_E2E',
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false,
                    sgr_type: null
                }).select().single();
                if (errNorm) throw errNorm;
                
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
                    quantity: 20,
                    batch_number: 'LOT_NORM_E2E'
                });

                return { success: true, storeId };
            }""")
            safe_print(f"[PASS] Seeding completed: {seeding_res}")
            
            # 3. Navigate to POS
            safe_print("\n3. Navigating to POS...")
            page.goto("http://localhost:5173/#/vanzare")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # Check if POS is locked (Shift closed)
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            if lock_screen.is_visible():
                safe_print("POS is locked. Opening a shift...")
                page.locator("button:has-text('Deschide')").first.click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible", timeout=5000)
                page.locator("input[type='number']").fill("100")
                page.locator("textarea[placeholder*='Mentiuni']").fill("SGR Preflight E2E Test")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
                safe_print("Shift opened successfully.")
            else:
                safe_print("Active shift already present.")

            # 4. Add SGR Product to Cart
            safe_print("\n4. Adding SGR Product to cart...")
            search_input = page.locator("input[placeholder*='nume sau cod']")
            search_input.fill("PRODUS_SGR_E2E")
            page.locator("button:has-text('PRODUS_SGR_E2E')").wait_for(state="visible", timeout=5000)
            page.locator("button:has-text('PRODUS_SGR_E2E')").click()
            page.wait_for_timeout(500)

            # Verify cart item and SGR sub-line
            safe_print("Verifying SGR details in cart line...")
            sgr_line = page.locator("[data-testid='pos-sgr-line']")
            sgr_line.wait_for(state="visible", timeout=5000)
            assert "Garanție SGR - PLASTIC" in sgr_line.inner_text(), "SGR description is missing or incorrect"
            assert "1 x 0.50 = 0.50 lei" in sgr_line.inner_text(), "SGR pricing math is incorrect"
            
            # Verify totals in cart summary
            safe_print("Verifying cart summary totals...")
            page.locator("[data-testid='pos-products-subtotal']").wait_for(state="visible", timeout=5000)
            subtotal = page.locator("[data-testid='pos-products-subtotal']").inner_text().strip()
            sgr_total = page.locator("[data-testid='pos-sgr-total']").inner_text().strip()
            grand_total = page.locator("[data-testid='pos-grand-total']").inner_text().strip()
            
            assert "10.00" in subtotal, f"Subtotal should be 10.00, got '{subtotal}'"
            assert "0.50" in sgr_total, f"SGR total should be 0.50, got '{sgr_total}'"
            assert "10.50" in grand_total, f"Grand total should be 10.50, got '{grand_total}'"
            safe_print("[PASS] SGR Cart item details and summary totals are correct.")

            # 5. Increase Quantity to 2
            safe_print("\n5. Increasing quantity to 2...")
            # Click the "+" button in the cart item
            page.locator("button:has(svg.lucide-plus)").first.click()
            page.wait_for_timeout(500)
            
            # Re-verify totals
            subtotal_qty2 = page.locator("[data-testid='pos-products-subtotal']").inner_text().strip()
            sgr_total_qty2 = page.locator("[data-testid='pos-sgr-total']").inner_text().strip()
            grand_total_qty2 = page.locator("[data-testid='pos-grand-total']").inner_text().strip()
            
            assert "20.00" in subtotal_qty2, f"Subtotal should be 20.00, got '{subtotal_qty2}'"
            assert "1.00" in sgr_total_qty2, f"SGR total should be 1.00, got '{sgr_total_qty2}'"
            assert "21.00" in grand_total_qty2, f"Grand total should be 21.00, got '{grand_total_qty2}'"
            safe_print("[PASS] Totals correctly recalculated for quantity 2.")

            # 6. Mixed Payment Auto-balancing
            safe_print("\n6. Testing mixed payment auto-balancing...")
            page.locator("button:has-text('MIXT')").click()
            page.wait_for_timeout(500)
            
            cash_input = page.locator("label:has-text('SUMĂ CASH') + input")
            card_input = page.locator("label:has-text('SUMĂ CARD') + input")
            
            cash_val = cash_input.evaluate("el => el.value")
            card_val = card_input.evaluate("el => el.value")
            
            assert float(cash_val) == 21.00, f"Cash should default to grand total 21.00, got {cash_val}"
            assert float(card_val) == 0.00, f"Card should default to 0.00, got {card_val}"
            
            # Edit cash to 10.00
            safe_print("Editing Cash to 10.00...")
            cash_input.fill("10.00")
            page.wait_for_timeout(500)
            
            cash_val = cash_input.evaluate("el => el.value")
            card_val = card_input.evaluate("el => el.value")
            assert float(cash_val) == 10.00
            assert float(card_val) == 11.00, f"Card should auto-balance to 11.00, got {card_val}"
            
            # Edit card to 5.00
            safe_print("Editing Card to 5.00...")
            card_input.fill("5.00")
            page.wait_for_timeout(500)
            
            cash_val = cash_input.evaluate("el => el.value")
            card_val = card_input.evaluate("el => el.value")
            assert float(card_val) == 5.00
            assert float(cash_val) == 16.00, f"Cash should auto-balance to 16.00, got {cash_val}"
            
            # Edit cash to 25.00 (exceeding total of 21.00)
            safe_print("Editing Cash to 25.00 (exceeds total)...")
            cash_input.fill("25.00")
            page.wait_for_timeout(500)
            
            cash_val = cash_input.evaluate("el => el.value")
            card_val = card_input.evaluate("el => el.value")
            assert float(cash_val) == 21.00, f"Cash should clamp to total 21.00, got {cash_val}"
            assert float(card_val) == 0.00, f"Card should balance to 0.00, got {card_val}"
            safe_print("[PASS] Mixed payment auto-balancing correctly operates against the grand total.")

            # 7. Checkout Guard Validation
            safe_print("\n7. Verifying SGR Checkout Preflight Guard...")
            # Verify the preflight guard banner is visible
            banner = page.locator("[data-testid='pos-sgr-preflight-banner']")
            banner.wait_for(state="visible", timeout=5000)
            assert "Preflight Guard SGR Activat" in banner.inner_text()
            
            # Verify the finalize checkout button is disabled
            checkout_btn = page.locator("button:has-text('ÎNCASEAZĂ')")
            assert checkout_btn.is_disabled(), "Checkout button should be disabled when SGR product is in cart and backend SGR is disabled."
            safe_print("[PASS] Checkout guard banner is displayed and checkout is blocked.")

            # 8. Non-SGR Product Checkout
            safe_print("\n8. Testing checkout behavior for normal products...")
            # Remove the SGR product from cart
            page.locator("button:has(svg.lucide-trash-2)").first.click()
            page.wait_for_timeout(500)
            
            # Search for and add normal product
            search_input.fill("")
            search_input.fill("PRODUS_NORMAL_E2E")
            page.locator("button:has-text('PRODUS_NORMAL_E2E')").wait_for(state="visible", timeout=5000)
            page.locator("button:has-text('PRODUS_NORMAL_E2E')").click()
            page.wait_for_timeout(500)
            
            # Check totals for normal product
            # Since SGR total is 0, the summary block should be hidden
            summary_count = page.locator("[data-testid='pos-sgr-total']").count()
            assert summary_count == 0, "Summary block should be hidden for normal products"
            
            # Banner should be hidden
            banner_count = page.locator("[data-testid='pos-sgr-preflight-banner']").count()
            assert banner_count == 0, "Preflight banner should be hidden for normal products"
            
            # Checkout button should be enabled
            assert not checkout_btn.is_disabled(), "Checkout button should be enabled for normal products"
            safe_print("[PASS] Normal checkout is unaffected by the SGR guard.")

            # 9. Clean up seeded products
            safe_print("\n9. Cleaning up test data...")
            page.evaluate("""async () => {
                const supabase = window.supabase;
                await supabase.from('products').delete().in('barcode', ['E2E_SGR_PRE_123', 'E2E_NORM_PRE_123']);
            }""")
            safe_print("[PASS] Seeding cleanup complete.")

        except Exception as e:
            safe_print("[FAIL] Test failed!")
            page.screenshot(path="screenshot_error_pos_preflight_6d65.png", full_page=True)
            safe_print("[DEBUG] Saved error screenshot to screenshot_error_pos_preflight_6d65.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] SGR POS Frontend Preflight E2E Test 6D.6.5 passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
