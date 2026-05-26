import sys
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

# Anti-DML guard
def verify_anti_dml_guard():
    with open(__file__, 'r', encoding='utf-8') as f:
        content = f.read()
    forbidden_tables = ['sales', 'sale_items', 'payments', 'sale_returns', 'sale_return_items', 'stock_movements', 'audit_logs']
    for table in forbidden_tables:
        pattern = rf"\.from\(['\"{table}['\"]\)\.delete"
        if re.search(pattern, content):
            raise Exception(f"CRITICAL: Delete found on audited table '{table}'!")
    safe_print("[PASS] Anti-DML guard: no forbidden delete statements found.")

def run_test():
    verify_anti_dml_guard()

    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        page.on("console", lambda msg: safe_print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            # A. Login
            safe_print("\nA. Login admin@admin.com ...")
            page.goto("http://localhost:5173/#/login")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("h1:has-text('Dashboard')").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in.")

            # B. Seed SGR product + sale (qty=2, price=10.00, total=21.00)
            safe_print("\nB. Seeding SGR product and sale...")
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store not found');
                const storeId = stores[0].id;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user');

                const barcode = 'E2E_SGR_FE_' + Math.floor(Math.random() * 100000000);
                const { data: product, error: errProd } = await supabase.from('products').insert({
                    store_id: storeId, barcode, name: 'PRODUS_SGR_FE_' + barcode,
                    unit: 'buc', status: 'active', sgr_enabled: true, sgr_type: 'plastic'
                }).select().single();
                if (errProd) throw errProd;

                await supabase.from('product_prices').insert({
                    store_id: storeId, product_id: product.id,
                    price_sale: 10.00, vat_group: 'A', vat_percent: 19
                });
                const { data: batch } = await supabase.from('stock_batches').insert({
                    store_id: storeId, product_id: product.id,
                    zone: 'magazin', quantity: 10, batch_number: 'LOT_SGR_FE_E2E'
                }).select().single();

                let shiftId = null;
                const { data: activeShift } = await supabase.rpc('get_active_pos_shift', { p_store_id: storeId, p_profile_id: user.id });
                if (activeShift && activeShift.shift_id) {
                    shiftId = activeShift.shift_id;
                } else {
                    const { data: registers } = await supabase.from('cash_registers').select('id').eq('store_id', storeId).limit(1);
                    if (!registers || registers.length === 0) throw new Error('No cash register');
                    const { data: newShift } = await supabase.rpc('open_pos_shift', {
                        p_store_id: storeId, p_profile_id: user.id,
                        p_cash_register_id: registers[0].id, p_opening_cash: 100.00, p_notes: 'SGR FE Test'
                    });
                    shiftId = newShift.shift_id;
                }

                const { data: saleData, error: errSale } = await supabase.rpc('finalize_sale', {
                    p_store_id: storeId, p_profile_id: user.id,
                    p_items: [{ product_id: product.id, quantity: 2 }],
                    p_payments: [{ method: 'cash', amount: 21.00 }],
                    p_shift_id: shiftId
                });
                if (errSale) throw errSale;

                const { data: saleItem } = await supabase.from('sale_items').select('id').eq('sale_id', saleData.sale_id).eq('product_id', product.id).single();

                return { storeId, profileId: user.id, productId: product.id, shiftId, saleId: saleData.sale_id, saleItemId: saleItem.id };
            }""")
            assert 'saleId' in seed_res, f"Seed failed: {seed_res}"
            sale_id = seed_res['saleId']
            sale_item_id = seed_res['saleItemId']
            product_id = seed_res['productId']
            store_id = seed_res['storeId']
            profile_id = seed_res['profileId']
            safe_print(f"[PASS] SGR sale created: {sale_id}")

            # C. Navigate to Sales History
            safe_print("\nC. Opening Sales History...")
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # D. Open sale details
            safe_print("\nD. Opening sale details...")
            page.locator("button[title='Detalii Bon']").first.click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=8000)
            safe_print("[PASS] Sale details modal open.")

            # E. Open ReturnSaleModal
            safe_print("\nE. Opening ReturnSaleModal...")
            ret_btn = page.locator("button:has-text('RETUR PRODUSE')")
            ret_btn.wait_for(state="visible", timeout=5000)
            ret_btn.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="visible", timeout=8000)
            safe_print("[PASS] ReturnSaleModal open.")

            # F. Verify SGR info is displayed
            safe_print("\nF. Verifying SGR info display in modal...")
            page.wait_for_timeout(2000)  # wait for eligibility to load

            sgr_info = page.locator(f"[data-testid='return-sgr-info-{sale_item_id}']")
            sgr_info.wait_for(state="visible", timeout=8000)
            safe_print("[PASS] SGR info block visible.")

            sgr_unit = page.locator(f"[data-testid='return-sgr-unit-{sale_item_id}']")
            sgr_unit_text = sgr_unit.text_content()
            safe_print(f"[DEBUG] SGR unit text: {sgr_unit_text}")
            assert 'PLASTIC' in sgr_unit_text.upper() or 'plastic' in sgr_unit_text.lower(), f"Expected PLASTIC in SGR unit text, got: {sgr_unit_text}"
            assert '0.50' in sgr_unit_text, f"Expected 0.50 in SGR unit text, got: {sgr_unit_text}"
            safe_print("[PASS] SGR unit label correct: PLASTIC 0.50 lei / buc")

            sgr_available = page.locator(f"[data-testid='return-sgr-available-{sale_item_id}']")
            sgr_available_text = sgr_available.text_content()
            safe_print(f"[DEBUG] SGR available text: {sgr_available_text}")
            assert '1.00' in sgr_available_text, f"Expected 1.00 SGR available, got: {sgr_available_text}"
            safe_print("[PASS] SGR available amount: 1.00 lei")

            # G. Select quantity 1 and verify breakdown
            safe_print("\nG. Selecting quantity 1 and verifying breakdown...")
            qty_input = page.locator("input[placeholder='0']").first
            qty_input.fill("1")
            page.wait_for_timeout(500)

            product_refund_el = page.locator(f"[data-testid='return-item-product-refund-{sale_item_id}']")
            product_refund_text = product_refund_el.text_content()
            safe_print(f"[DEBUG] Product refund: {product_refund_text}")
            assert '10.00' in product_refund_text, f"Expected product refund 10.00, got: {product_refund_text}"

            sgr_refund_el = page.locator(f"[data-testid='return-sgr-refund-{sale_item_id}']")
            sgr_refund_text = sgr_refund_el.text_content()
            safe_print(f"[DEBUG] SGR refund: {sgr_refund_text}")
            assert '0.50' in sgr_refund_text, f"Expected SGR refund 0.50, got: {sgr_refund_text}"

            total_refund_el = page.locator(f"[data-testid='return-item-total-refund-{sale_item_id}']")
            total_refund_text = total_refund_el.text_content()
            safe_print(f"[DEBUG] Total line: {total_refund_text}")
            assert '10.50' in total_refund_text, f"Expected total line 10.50, got: {total_refund_text}"

            sgr_total_el = page.locator("[data-testid='return-total-sgr-refund']")
            sgr_total_text = sgr_total_el.text_content()
            assert '0.50' in sgr_total_text, f"Expected total SGR 0.50, got: {sgr_total_text}"

            safe_print("[PASS] Breakdown verified: product 10.00 + SGR 0.50 = total 10.50")

            # H. Confirm return
            safe_print("\nH. Confirming partial return (qty=1)...")
            textarea = page.locator("textarea[placeholder*='motivul returului']")
            textarea.fill("Retur partial SGR test E2E 6D.6.12")
            page.wait_for_timeout(300)
            confirm_btn = page.locator("button:has-text('CONFIRMĂ RETURUL')")
            assert not confirm_btn.is_disabled(), "Confirm button should be enabled"
            confirm_btn.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="detached", timeout=10000)
            safe_print("[PASS] Return confirmed, modal closed.")

            # Wait for status update
            page.wait_for_timeout(2000)
            badge = page.locator("h3:has-text('DETALII BON') + span")
            for _ in range(20):
                txt = badge.text_content().strip()
                if 'Returnat Par' in txt or 'RETURNAT PAR' in txt.upper():
                    break
                page.wait_for_timeout(250)
            else:
                txt = badge.text_content().strip()
                raise AssertionError(f"Expected 'Returnat Partial', got: {txt}")
            safe_print("[PASS] Sale status updated to partially_returned.")

            # I. Re-open return modal, verify remaining availability
            safe_print("\nI. Reopening modal, verifying remaining SGR availability...")
            page.locator("button:has-text('RETUR PRODUSE')").click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="visible", timeout=8000)
            page.wait_for_timeout(2000)

            sgr_available2 = page.locator(f"[data-testid='return-sgr-available-{sale_item_id}']")
            sgr_available2_text = sgr_available2.text_content()
            safe_print(f"[DEBUG] SGR available after partial return: {sgr_available2_text}")
            assert '0.50' in sgr_available2_text, f"Expected 0.50 SGR available after partial return, got: {sgr_available2_text}"
            safe_print("[PASS] SGR available = 0.50 after partial return.")

            # Check previous returns history shows SGR
            hist_header = page.locator("text=Istoric Retururi Anterioare pe acest Bon")
            hist_header.wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Previous returns history visible.")

            # J. Return remaining 1 unit
            safe_print("\nJ. Returning remaining unit...")
            qty_input2 = page.locator("input[placeholder='0']").first
            qty_input2.fill("1")
            textarea2 = page.locator("textarea[placeholder*='motivul returului']")
            textarea2.fill("Retur final SGR test E2E 6D.6.12")
            page.wait_for_timeout(300)
            confirm_btn2 = page.locator("button:has-text('CONFIRMĂ RETURUL')")
            confirm_btn2.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="detached", timeout=10000)
            page.wait_for_timeout(2000)
            badge2 = page.locator("h3:has-text('DETALII BON') + span")
            for _ in range(20):
                txt2 = badge2.text_content().strip().upper()
                if txt2 == 'RETURNAT':
                    break
                page.wait_for_timeout(250)
            else:
                txt2 = badge2.text_content().strip()
                raise AssertionError(f"Expected 'Returnat', got: {txt2}")
            safe_print("[PASS] Final return done, sale status = returned.")

            # K. Non-SGR regression
            safe_print("\nK. Non-SGR regression test...")
            page.locator("button:has-text('ÎNCHIDE')").click()
            page.wait_for_timeout(500)

            regression_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const barcode = 'E2E_NOSGR_FE_' + Math.floor(Math.random() * 100000000);
                const {{ data: product, error: errP }} = await supabase.from('products').insert({{
                    store_id: '{store_id}', barcode, name: 'PRODUS_NORMAL_FE_' + barcode,
                    unit: 'buc', status: 'active', sgr_enabled: false
                }}).select().single();
                if (errP) return {{ error: errP.message }};

                await supabase.from('product_prices').insert({{
                    store_id: '{store_id}', product_id: product.id,
                    price_sale: 12.00, vat_group: 'A', vat_percent: 19
                }});
                await supabase.from('stock_batches').insert({{
                    store_id: '{store_id}', product_id: product.id,
                    zone: 'magazin', quantity: 5, batch_number: 'LOT_NOSGR_FE'
                }});
                const {{ data: saleData, error: errS }} = await supabase.rpc('finalize_sale', {{
                    p_store_id: '{store_id}', p_profile_id: '{profile_id}',
                    p_items: [{{ product_id: product.id, quantity: 1 }}],
                    p_payments: [{{ method: 'cash', amount: 12.00 }}],
                    p_shift_id: '{seed_res["shiftId"]}'
                }});
                if (errS) return {{ error: errS.message }};
                const {{ data: si }} = await supabase.from('sale_items').select('id').eq('sale_id', saleData.sale_id).single();
                const {{ data: elig }} = await supabase.rpc('get_sale_return_eligibility', {{
                    p_store_id: '{store_id}', p_profile_id: '{profile_id}', p_sale_id: saleData.sale_id
                }});
                const item = elig && elig.items && elig.items[0];
                await supabase.from('products').delete().eq('id', product.id);
                return {{ saleItemId: si.id, sgrEnabled: item ? item.sgr_enabled : null, productId: product.id }};
            }}""")
            assert 'error' not in regression_res, f"Regression seed failed: {regression_res.get('error')}"
            assert regression_res['sgrEnabled'] == False, f"Expected sgrEnabled=False for non-SGR item, got: {regression_res['sgrEnabled']}"
            safe_print("[PASS] Non-SGR regression: eligibility correctly returns sgrEnabled=False.")

            # Verify UI doesn't show SGR block for non-SGR items
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            page.locator("button[title='Detalii Bon']").first.click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=8000)
            ret_btn_nosgr = page.locator("button:has-text('RETUR PRODUSE')")
            ret_btn_nosgr.wait_for(state="visible", timeout=5000)
            ret_btn_nosgr.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="visible", timeout=8000)
            page.wait_for_timeout(2000)

            nosgr_item_id = regression_res['saleItemId']
            sgr_block_visible = page.locator(f"[data-testid='return-sgr-info-{nosgr_item_id}']").is_visible()
            assert not sgr_block_visible, "SGR block must NOT be visible for non-SGR products!"
            safe_print("[PASS] Non-SGR modal: no SGR block displayed. UI regression PASS.")

            # Cleanup SGR product metadata
            safe_print("\nCleaning up SGR test product...")
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('products').delete().eq('id', '{product_id}');
            }}""")
            safe_print("[PASS] Cleanup done.")

        except Exception as e:
            safe_print("[FAIL] Test failed!")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] SGR Returns Frontend E2E Test 6D.6.12 PASSED!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
