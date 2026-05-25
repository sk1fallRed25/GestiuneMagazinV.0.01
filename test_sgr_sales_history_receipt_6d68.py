import sys
import time
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def sanity_scan_self():
    safe_print("[SAFE] Performing DML-Zero sanity scan on the test script itself...")
    with open(__file__, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We construct forbidden patterns dynamically to avoid self-matching
    forbidden = [
        "from('sales')." + "delete",
        "from('sale_items')." + "delete",
        "from('payments')." + "delete",
        "from('sales')." + "insert",
        "from('sale_items')." + "insert",
        "from('payments')." + "insert"
    ]
    
    for term in forbidden:
        if term in content:
            safe_print(f"[FAIL] Sanity scan failed: Forbidden DML pattern '{term}' detected.")
            sys.exit(2)
            
    safe_print("[PASS] Sanity scan passed. No direct writes on sales/payments tables in test script.")

def run_test():
    sanity_scan_self()
    
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted.")

        page.on("dialog", handle_dialog)

        try:
            # 1. Login
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
            
            safe_print("Waiting for Dashboard...")
            page.locator("h1:has-text('Dashboard')").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # 2. Seeding Test Data (Product and Stock Batch)
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
                const sgrBarcode = 'E2E_SGR_REC_' + Math.floor(Math.random() * 100000000);
                const normBarcode = 'E2E_NORM_REC_' + Math.floor(Math.random() * 100000000);
                
                // Insert SGR Product (sgr_enabled=true, type=plastic)
                const { data: pSgr, error: errSgr } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: sgrBarcode,
                    name: 'PRODUS_SGR_REC_' + sgrBarcode,
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
                    batch_number: 'LOT_SGR_REC_' + sgrBarcode
                });
                if (errSgrBatch) throw errSgrBatch;

                // Insert Normal Product (sgr_enabled=false)
                const { data: pNorm, error: errNorm } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: normBarcode,
                    name: 'PRODUS_NORM_REC_' + normBarcode,
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
                    batch_number: 'LOT_NORM_REC_' + normBarcode
                });
                if (errNormBatch) throw errNormBatch;
                
                return { 
                    success: true, 
                    storeId, 
                    profileId: user.id, 
                    sgrProductId: pSgr.id, 
                    sgrProductName: 'PRODUS_SGR_REC_' + sgrBarcode,
                    sgrBarcode,
                    normProductId: pNorm.id,
                    normProductName: 'PRODUS_NORM_REC_' + normBarcode,
                    normBarcode
                };
            }""")
            safe_print(f"[PASS] Seeding completed: {seeding_res}")
            
            store_id = seeding_res['storeId']
            sgr_product_id = seeding_res['sgrProductId']
            sgr_product_name = seeding_res['sgrProductName']
            norm_product_id = seeding_res['normProductId']
            norm_product_name = seeding_res['normProductName']

            # 3. Navigate to POS
            safe_print("\n3. Navigating to POS...")
            page.goto("http://localhost:5173/#/vanzare")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # Check and open shift if closed
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            if lock_screen.is_visible():
                safe_print("POS is locked. Opening a shift...")
                page.locator("button:has-text('Deschide')").first.click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible", timeout=5000)
                page.locator("input[type='number']").fill("100")
                page.locator("textarea[placeholder*='Mentiuni']").fill("SGR E2E History Shift")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
                safe_print("Shift opened successfully.")
            
            # Clear cart if any items are there
            trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
            while trash_btn.is_visible():
                trash_btn.click()
                page.wait_for_timeout(500)

            # 4. Sell SGR product (qty=2, total=21.00)
            safe_print("\n4. Selling SGR product...")
            search_input = page.locator("input[placeholder*='nume sau cod']")
            search_input.fill(sgr_product_name)
            page.locator(f"button:has-text('{sgr_product_name}')").wait_for(state="visible", timeout=5000)
            page.locator(f"button:has-text('{sgr_product_name}')").click()
            page.wait_for_timeout(500)
            
            # Increase quantity to 2
            page.locator("button:has(svg.lucide-plus)").first.click()
            page.wait_for_timeout(500)
            
            # Finalize via Cash
            page.locator("button:has-text('NUMERAR')").click()
            page.wait_for_timeout(500)
            page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
            page.wait_for_timeout(2000)
            
            # Verify cart cleared
            assert "0.00" in page.locator("span.text-5xl").inner_text()
            safe_print("[PASS] SGR sale finalized.")

            # 5. Sell normal product (qty=1, total=5.00)
            safe_print("\n5. Selling normal product...")
            search_input.fill("")
            search_input.fill(norm_product_name)
            page.locator(f"button:has-text('{norm_product_name}')").wait_for(state="visible", timeout=5000)
            page.locator(f"button:has-text('{norm_product_name}')").click()
            page.wait_for_timeout(500)
            
            # Finalize via Cash
            page.locator("button:has-text('NUMERAR')").click()
            page.wait_for_timeout(500)
            page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
            page.wait_for_timeout(2000)
            
            # Verify cart cleared
            assert "0.00" in page.locator("span.text-5xl").inner_text()
            safe_print("[PASS] Normal product sale finalized.")

            # 6. Navigate to Sales History
            safe_print("\n6. Navigating to Sales History...")
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # Locate the top 2 sales:
            # first should be the normal sale (5.00)
            # second should be the SGR sale (21.00)
            totals_locator = page.locator("span.text-lg.font-black.text-gray-900")
            totals_locator.first.wait_for(state="visible", timeout=10000)
            
            t0 = totals_locator.nth(0).inner_text().strip()
            t1 = totals_locator.nth(1).inner_text().strip()
            safe_print(f"Top 2 totals in list: '{t0}', '{t1}'")
            
            assert "5.00" in t0, f"Expected top sale to be 5.00, got '{t0}'"
            assert "21.00" in t1, f"Expected second sale to be 21.00, got '{t1}'"

            # 7. Open details for the Normal Sale (5.00) and verify NO SGR details
            safe_print("\n7. Inspecting normal sale details...")
            detail_buttons = page.locator("button[title='Detalii Bon']")
            detail_buttons.nth(0).click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
            page.wait_for_timeout(1000)

            # Assert SGR elements are NOT present
            sgr_line_count = page.locator("[data-testid^='sale-item-sgr-line-']").count()
            sgr_summary_count = page.locator("[data-testid='sale-sgr-summary']").count()
            
            assert sgr_line_count == 0, f"SGR line found in normal sale details modal!"
            assert sgr_summary_count == 0, f"SGR summary block found in normal sale details modal!"
            
            # Verify Products total equals Grand total
            prod_total = page.locator("[data-testid='sale-products-total']").inner_text().strip()
            grand_total = page.locator("[data-testid='sale-grand-total']").inner_text().strip()
            assert "5.00" in prod_total
            assert "5.00" in grand_total

            # Close details modal
            page.locator("button[aria-label='Închide detaliile bonului']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="hidden", timeout=5000)
            page.wait_for_timeout(500)
            safe_print("[PASS] Normal sale details confirmed: no SGR present.")

            # 8. Open details for the SGR Sale (21.00) and verify SGR details
            safe_print("\n8. Inspecting SGR sale details...")
            detail_buttons.nth(1).click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
            page.wait_for_timeout(1000)

            # Assert SGR item details
            sgr_lines = page.locator("[data-testid^='sale-item-sgr-line-']")
            sgr_lines.first.wait_for(state="visible", timeout=5000)
            
            sgr_label = page.locator("[data-testid^='sale-item-sgr-label-']").first.inner_text().strip()
            sgr_amount = page.locator("[data-testid^='sale-item-sgr-amount-']").first.inner_text().strip()
            sgr_vat = page.locator("[data-testid^='sale-item-sgr-vat-']").first.inner_text().strip()
            
            safe_print(f"SGR line - label: '{sgr_label}', amount: '{sgr_amount}', vat: '{sgr_vat}'")
            assert "SGR - PLASTIC" in sgr_label or "plastic" in sgr_label.lower()
            assert "x2" in sgr_label
            assert "1.00" in sgr_amount
            assert "D — 0%" in sgr_vat

            # Assert summary totals
            page.locator("[data-testid='sale-sgr-summary']").wait_for(state="visible", timeout=5000)
            
            summary_prod_total = page.locator("[data-testid='sale-products-total']").inner_text().strip()
            summary_sgr_total = page.locator("[data-testid='sale-sgr-total']").inner_text().strip()
            summary_grand_total = page.locator("[data-testid='sale-grand-total']").inner_text().strip()
            
            safe_print(f"SGR summary - products total: '{summary_prod_total}', SGR total: '{summary_sgr_total}', grand: '{summary_grand_total}'")
            assert "20.00" in summary_prod_total
            assert "1.00" in summary_sgr_total
            assert "21.00" in summary_grand_total

            # Verify VAT breakdown lists
            # We should see the standard A group (21% or 19% depending on db)
            # and SGR / Grupa D 0%
            page.locator("td:has-text('SGR / Grupa D 0%:')").wait_for(state="visible", timeout=5000)
            page.locator("td:has-text('TVA SGR:')").wait_for(state="visible", timeout=5000)
            
            sgr_vat_val = page.locator("tr:has(td:has-text('TVA SGR:')) td").nth(1).inner_text().strip()
            sgr_base_val = page.locator("tr:has(td:has-text('SGR / Grupa D 0%:')) td").nth(1).inner_text().strip()
            
            safe_print(f"SGR fiscal breakdown - base: '{sgr_base_val}', VAT: '{sgr_vat_val}'")
            assert "1.00" in sgr_base_val
            assert "0.00" in sgr_vat_val

            # Take screenshot for visual validation report
            page.screenshot(path="screenshot_sgr_receipt_modal_details.png")
            safe_print("[DEBUG] Saved receipt modal screenshot to screenshot_sgr_receipt_modal_details.png")

            # Close details modal
            page.locator("button[aria-label='Închide detaliile bonului']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="hidden", timeout=5000)
            page.wait_for_timeout(500)
            safe_print("[PASS] SGR sale details verified successfully.")

            # 9. Verify Legacy Sale handling (does not crash, handles nulls)
            safe_print("\n9. Querying DB for legacy sale...")
            legacy_sale_id = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data, error } = await supabase.from('sales')
                    .select('id, sale_items(sgr_enabled)')
                    .order('created_at', { ascending: false });
                if (error) return null;
                const legacy = data.find(s => s.sale_items && s.sale_items.some(si => si.sgr_enabled === null || si.sgr_enabled === false));
                return legacy ? legacy.id : null;
            }""")
            
            if legacy_sale_id:
                short_id = legacy_sale_id[:8]
                safe_print(f"Found legacy/non-SGR sale ID: {legacy_sale_id} (short: {short_id}). Locating in UI...")
                
                # Locate row and click details
                row_locator = page.locator(f"tr:has-text('{short_id}')")
                row_locator.first.wait_for(state="visible", timeout=5000)
                row_locator.first.locator("button[title='Detalii Bon']").click()
                
                page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
                page.wait_for_timeout(1000)
                
                # Verify it does not display SGR lines/summary but is stable
                assert page.locator("[data-testid^='sale-item-sgr-line-']").count() == 0
                assert page.locator("[data-testid='sale-sgr-total']").count() == 0
                
                page.locator("button[aria-label='Închide detaliile bonului']").click()
                page.locator("h3:has-text('DETALII BON')").wait_for(state="hidden", timeout=5000)
                safe_print("[PASS] Legacy/non-SGR sale modal verified (stable and SGR-free).")
            else:
                safe_print("[NOTE] No legacy/non-SGR sales found in DB. Skipping legacy UI verification.")

            # 10. Cleanup seeded products
            safe_print("\n10. Cleaning up test products...")
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('products').delete().eq('id', "{sgr_product_id}");
                await supabase.from('products').delete().eq('id', "{norm_product_id}");
            }}""")
            safe_print("[PASS] Cleanup completed.")

        except Exception as e:
            safe_print("[FAIL] Test failed!")
            page.screenshot(path="screenshot_error_sgr_receipt_modal.png", full_page=True)
            safe_print("[DEBUG] Saved error screenshot to screenshot_error_sgr_receipt_modal.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] SGR Sales History Receipt modal E2E verification test passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
