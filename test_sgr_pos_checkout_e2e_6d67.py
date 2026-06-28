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
            # A. Guard Static & Login
            safe_print("\n1. Navigating to login...")
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

            # B. Seeding Test Data (Product and Stock Batch)
            safe_print("\n2. Seeding test products...")
            seeding_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                // Get active store_id
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                // Get current profile
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user logged in');
                
                // Generate unique barcodes
                const sgrBarcode = 'E2E_SGR_CH_' + Math.floor(Math.random() * 100000000);
                const normBarcode = 'E2E_NORM_CH_' + Math.floor(Math.random() * 100000000);
                
                // Insert SGR Product (sgr_enabled=true, type=plastic)
                const { data: pSgr, error: errSgr } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: sgrBarcode,
                    name: 'PRODUS_SGR_CH_' + sgrBarcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: true,
                    sgr_type: 'plastic'
                }).select().single();
                if (errSgr) throw errSgr;
                
                // Add price (10.00 RON)
                const { error: errSgrPrice } = await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    price_sale: 10.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                if (errSgrPrice) throw errSgrPrice;
                
                // Add stock (15 units)
                const { error: errSgrBatch } = await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: pSgr.id,
                    zone: 'magazin',
                    quantity: 15,
                    batch_number: 'LOT_SGR_CH_' + sgrBarcode
                });
                if (errSgrBatch) throw errSgrBatch;

                // Insert Normal Product (sgr_enabled=false)
                const { data: pNorm, error: errNorm } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: normBarcode,
                    name: 'PRODUS_NORM_CH_' + normBarcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false,
                    sgr_type: null
                }).select().single();
                if (errNorm) throw errNorm;
                
                // Add price (5.00 RON)
                const { error: errNormPrice } = await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: pNorm.id,
                    price_sale: 5.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                if (errNormPrice) throw errNormPrice;
                
                // Add stock (20 units)
                const { error: errNormBatch } = await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: pNorm.id,
                    zone: 'magazin',
                    quantity: 20,
                    batch_number: 'LOT_NORM_CH_' + normBarcode
                });
                if (errNormBatch) throw errNormBatch;
                
                return { 
                    success: true, 
                    storeId, 
                    profileId: user.id, 
                    sgrProductId: pSgr.id, 
                    sgrProductName: 'PRODUS_SGR_CH_' + sgrBarcode,
                    normProductId: pNorm.id,
                    normProductName: 'PRODUS_NORM_CH_' + normBarcode
                };
            }""")
            safe_print(f"[PASS] Seeding completed: {seeding_res}")
            
            store_id = seeding_res['storeId']
            profile_id = seeding_res['profileId']
            sgr_product_id = seeding_res['sgrProductId']
            sgr_product_name = seeding_res['sgrProductName']
            norm_product_id = seeding_res['normProductId']
            norm_product_name = seeding_res['normProductName']

            # 3. Navigating to POS
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
                page.locator("textarea[placeholder*='Mentiuni']").fill("SGR E2E Checkout Shift")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
                safe_print("Shift opened successfully.")
            else:
                safe_print("Active shift already present.")

            # Clear cart if any items are there
            trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
            while trash_btn.is_visible():
                trash_btn.click()
                page.wait_for_timeout(500)

            # 4. Scenario: SGR product checkout (Cash)
            safe_print("\n4. Testing SGR product checkout (Cash)...")
            search_input = page.locator("input[placeholder*='nume sau cod']")
            search_input.fill(sgr_product_name)
            page.locator(f"button:has-text('{sgr_product_name}')").wait_for(state="visible", timeout=5000)
            page.locator(f"button:has-text('{sgr_product_name}')").click()
            page.wait_for_timeout(500)

            # Verify cart UI lines and SGR summary
            sgr_line = page.locator("[data-testid='pos-sgr-line']")
            sgr_line.wait_for(state="visible", timeout=5000)
            assert "Garanție SGR - PLASTIC" in sgr_line.inner_text(), "SGR description is missing or incorrect"
            assert "1 x 0.50 = 0.50 lei" in sgr_line.inner_text(), "SGR pricing math is incorrect"

            subtotal_el = page.locator("[data-testid='pos-products-subtotal']")
            sgr_total_el = page.locator("[data-testid='pos-sgr-total']")
            grand_total_el = page.locator("[data-testid='pos-grand-total']")
            
            assert "10.00" in subtotal_el.inner_text()
            assert "0.50" in sgr_total_el.inner_text()
            assert "10.50" in grand_total_el.inner_text()
            
            # Verify the preflight guard banner is NOT visible (since SGR_CHECKOUT_BACKEND_ENABLED is true)
            banner_count = page.locator("[data-testid='pos-sgr-preflight-banner']").count()
            assert banner_count == 0, "Preflight banner should be hidden when checkout is enabled."

            # Checkout cash
            checkout_btn = page.locator("button:has-text('ÎNCASEAZĂ')")
            assert not checkout_btn.is_disabled(), "Checkout button should be enabled."
            
            safe_print("Finalizing sale with CASH...")
            checkout_btn.click(no_wait_after=True)
            page.wait_for_timeout(2000)

            # Accept confirmation dialog
            # (Dialog handler is set up by Playwright browser default to accept dialogs, but let's confirm cart was cleared)
            final_total_text = page.locator('[data-testid="pos-cart-total"]').inner_text()
            assert "0.00" in final_total_text, f"Expected cart to clear, got: {final_total_text}"
            safe_print("[PASS] SGR Cash sale finalized successfully, cart reset.")

            # Verify DB records
            safe_print("Verifying DB records for CASH SGR sale...")
            db_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: sales, error } = await supabase.from('sales')
                    .select('*, payments(*), sale_items(*)')
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (error) throw error;
                return sales[0];
            }""")
            
            sale_1 = db_res
            assert abs(float(sale_1['total']) - 10.50) < 0.01, f"Expected DB sale total 10.50, got {sale_1['total']}"
            assert sale_1['payment_method'] == 'cash', f"Expected payment method 'cash', got {sale_1['payment_method']}"
            assert len(sale_1['payments']) == 1
            assert abs(float(sale_1['payments'][0]['amount']) - 10.50) < 0.01
            
            assert len(sale_1['sale_items']) == 1
            item_1 = sale_1['sale_items'][0]
            assert item_1['sgr_enabled'] == True
            assert item_1['sgr_type'] == 'plastic'
            assert abs(float(item_1['sgr_deposit_amount']) - 0.50) < 0.01
            assert abs(float(item_1['sgr_total_amount']) - 0.50) < 0.01
            assert item_1['sgr_vat_group'] == 'D'
            assert abs(float(item_1['sgr_vat_rate']) - 0.00) < 0.01
            assert item_1['vat_group'] == 'A'
            assert abs(float(item_1['vat_rate']) - 21.00) < 0.01
            safe_print("[PASS] SGR Cash sale details verified successfully in database.")

            # 5. Scenario: SGR product checkout quantity = 2 (Mixed payment)
            safe_print("\n5. Testing SGR product checkout with quantity = 2 (Mixed)...")
            search_input.fill("")
            search_input.fill(sgr_product_name)
            page.locator(f"button:has-text('{sgr_product_name}')").wait_for(state="visible", timeout=5000)
            page.locator(f"button:has-text('{sgr_product_name}')").click()
            page.wait_for_timeout(500)
            
            # Increase quantity to 2
            page.locator("button:has(svg.lucide-plus)").first.click()
            page.wait_for_timeout(500)
            
            assert "20.00" in subtotal_el.inner_text()
            assert "1.00" in sgr_total_el.inner_text()
            assert "21.00" in grand_total_el.inner_text()
            
            # Click MIXT payment
            page.locator("button:has-text('MIXT')").click()
            page.wait_for_timeout(500)
            
            cash_input = page.locator("label:has-text('SUMĂ CASH') + input")
            card_input = page.locator("label:has-text('SUMĂ CARD') + input")
            
            # Set Cash to 5.00
            cash_input.fill("5.00")
            page.wait_for_timeout(500)
            
            # Card should auto-balance to 16.00 (21.00 total - 5.00 cash)
            card_val = card_input.evaluate("el => el.value")
            assert float(card_val) == 16.00, f"Expected Card to auto-balance to 16.00, got {card_val}"
            
            # Finalize checkout
            checkout_btn.click(no_wait_after=True)
            page.wait_for_timeout(2000)
            
            # Verify cart cleared
            assert "0.00" in page.locator('[data-testid="pos-cart-total"]').inner_text()
            safe_print("[PASS] SGR Mixed sale finalized successfully.")

            # Verify DB records for mixed sale
            db_res_2 = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: sales, error } = await supabase.from('sales')
                    .select('*, payments(*), sale_items(*)')
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (error) throw error;
                return sales[0];
            }""")
            
            sale_2 = db_res_2
            assert abs(float(sale_2['total']) - 21.00) < 0.01, f"Expected DB sale total 21.00, got {sale_2['total']}"
            assert sale_2['payment_method'] == 'mixed', f"Expected payment method 'mixed', got {sale_2['payment_method']}"
            assert len(sale_2['payments']) == 2
            
            cash_pay = next((p for p in sale_2['payments'] if p['method'] == 'cash'), None)
            card_pay = next((p for p in sale_2['payments'] if p['method'] == 'card'), None)
            assert cash_pay is not None and abs(float(cash_pay['amount']) - 5.00) < 0.01
            assert card_pay is not None and abs(float(card_pay['amount']) - 16.00) < 0.01
            
            # SGR total should be 1.00 (2 items x 0.50)
            assert len(sale_2['sale_items']) == 1
            item_2 = sale_2['sale_items'][0]
            assert item_2['sgr_enabled'] == True
            assert abs(float(item_2['sgr_deposit_amount']) - 0.50) < 0.01
            assert abs(float(item_2['sgr_total_amount']) - 1.00) < 0.01
            safe_print("[PASS] SGR Mixed sale details verified successfully in database.")

            # 6. Scenario: Normal product checkout (Regression)
            safe_print("\n6. Testing normal product checkout (Regression)...")
            search_input.fill("")
            search_input.fill(norm_product_name)
            page.locator(f"button:has-text('{norm_product_name}')").wait_for(state="visible", timeout=5000)
            page.locator(f"button:has-text('{norm_product_name}')").click()
            page.wait_for_timeout(500)
            
            # SGR total should be hidden, total = 5.00
            assert page.locator("[data-testid='pos-sgr-total']").count() == 0, "SGR summary should be hidden for normal products"
            assert "5.00" in page.locator('[data-testid="pos-cart-total"]').inner_text()
            
            # Checkout cash
            checkout_btn.click(no_wait_after=True)
            page.wait_for_timeout(2000)
            
            # Verify cart cleared
            assert "0.00" in page.locator('[data-testid="pos-cart-total"]').inner_text()
            safe_print("[PASS] Normal product sale finalized successfully.")

            # 7. Scenario: Sales History minimal check
            safe_print("\n7. Verifying sales appear in Sales History...")
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            
            # Verify that the first total is 5.00 (from normal checkout)
            # The second should be 21.00 (from mixed checkout)
            totals = page.locator("span.text-lg.font-black.text-gray-900")
            totals.first.wait_for(state="visible", timeout=5000)
            
            t0 = totals.nth(0).inner_text().strip()
            t1 = totals.nth(1).inner_text().strip()
            
            safe_print(f"Top 2 Sales History Totals: '{t0}', '{t1}'")
            assert "5.00" in t0, f"Expected top sale total to be 5.00, got '{t0}'"
            assert "21.00" in t1, f"Expected second sale total to be 21.00, got '{t1}'"
            safe_print("[PASS] Sales history verified successfully.")

            # 8. Cleanup test products
            safe_print("\n8. Cleaning up test products...")
            cleanup_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('products').delete().eq('id', "{sgr_product_id}");
                await supabase.from('products').delete().eq('id', "{norm_product_id}");
            }}""")
            safe_print("[PASS] Cleanup completed.")

        except Exception as e:
            safe_print("[FAIL] Test failed!")
            page.screenshot(path="screenshot_error_pos_checkout_6d67.png", full_page=True)
            safe_print("[DEBUG] Saved error screenshot to screenshot_error_pos_checkout_6d67.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] SGR POS Checkout E2E Test 6D.6.7 passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
