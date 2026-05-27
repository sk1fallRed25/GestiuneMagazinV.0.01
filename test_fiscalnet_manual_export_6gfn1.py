import sys
import os
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n=== RUNNING STATIC CHECKS ===")
    
    # 1. Check file existence
    mapper_path = "src/features/fiscal-net/salesHistoryToFiscalNet.ts"
    if not os.path.exists(mapper_path):
        safe_print(f"[FAIL] Mapper file not found at: {mapper_path}")
        sys.exit(1)
    safe_print("[PASS] Mapper file exists.")

    # 2. Check modal file content for selectors & warnings
    modal_path = "src/features/sales-history/components/SaleDetailsModal.tsx"
    with open(modal_path, "r", encoding="utf8") as f:
        modal_content = f.read()

    selectors = [
        "fiscalnet-export-button",
        "fiscalnet-export-warning",
        "fiscalnet-export-preview",
        "fiscalnet-download-filename",
        "fiscalnet-response-input",
        "fiscalnet-response-parse-button",
        "fiscalnet-response-result"
    ]

    for sel in selectors:
        if sel not in modal_content:
            safe_print(f"[FAIL] Required selector '{sel}' not found in SaleDetailsModal.tsx!")
            sys.exit(1)
    safe_print("[PASS] All required test data-testids exist in SaleDetailsModal.tsx.")

    # 3. Check for security/safety constraints (no direct writing to C:\FiscalNet)
    if "C:\\\\FiscalNet" in modal_content or "C:\\FiscalNet" in modal_content:
        safe_print("[FAIL] Security breach: Direct reference to C:\\FiscalNet detected in frontend component!")
        sys.exit(1)
    safe_print("[PASS] No direct C:\\FiscalNet filesystem write attempts in frontend.")

def run_e2e_test():
    safe_print("\n=== RUNNING PLAYWRIGHT E2E TESTS ===")
    
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)

        try:
            # 1. Login
            safe_print("1. Navigating to login...")
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
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # 2. Seed a transaction with SGR product and mixed payment via Supabase RPC/DML
            safe_print("\n2. Seeding SGR transaction in database...")
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores, error: sStoreErr } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (sStoreErr) throw new Error("Store error: " + sStoreErr.message);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                const { data: userData, error: userErr } = await supabase.auth.getUser();
                if (userErr) throw new Error("Auth user error: " + userErr.message);
                const profileId = userData.user.id;

                const barcode = 'E2E_SGR_EXP_' + Math.floor(Math.random() * 10000000);
                
                // Insert SGR product
                const { data: prod, error: pErr } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PROD_SGR_EXP_' + barcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: true,
                    sgr_type: 'metal'
                }).select().single();
                if (pErr) throw new Error("Product insert error: " + pErr.message);

                // Add price
                const { error: prErr } = await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    price_sale: 10.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                if (prErr) throw new Error("Price insert error: " + prErr.message);

                // Add stock batch (10 units)
                const { error: batchErr } = await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    zone: 'magazin',
                    quantity: 10,
                    batch_number: 'LOT_SGR_EXP_' + barcode
                });
                if (batchErr) throw new Error("Stock batch insert error: " + batchErr.message);

                // Find or open shift
                const { data: shift, error: getShiftErr } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: profileId
                });
                if (getShiftErr) throw new Error("Get active shift error: " + getShiftErr.message);
                
                let shiftId = shift ? shift.shift_id : null;
                if (!shiftId) {
                    const { data: newShift, error: sErr } = await supabase.rpc('open_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: profileId,
                        p_opening_cash: 100.00
                    });
                    if (sErr) throw new Error("Open shift error: " + sErr.message);
                    shiftId = newShift;
                }

                // Finalize sale via RPC (2 items, total is 21.00 LEI: 20.00 products + 1.00 SGR)
                // Payment is mixed: 10.00 cash + 11.00 card
                const { data: saleId, error: fErr } = await supabase.rpc('finalize_sale', {
                    p_store_id: storeId,
                    p_profile_id: profileId,
                    p_items: [{ product_id: prod.id, quantity: 2 }],
                    p_payments: [
                        { method: 'cash', amount: 10.00 },
                        { method: 'card', amount: 11.00 }
                    ],
                    p_shift_id: shiftId
                });
                if (fErr) throw new Error("Finalize sale error: " + fErr.message);

                const saleIdStr = typeof saleId === 'string' ? saleId : (saleId && typeof saleId === 'object' && 'sale_id' in saleId ? saleId.sale_id : null);
                if (!saleIdStr) throw new Error("Could not extract sale UUID from: " + JSON.stringify(saleId));

                return { saleId: saleIdStr, barcode, sgrProductId: prod.id, storeId };
            }""")
            
            sale_id = seed_res['saleId']
            barcode = seed_res['barcode']
            sgr_product_id = seed_res['sgrProductId']
            short_sale_id = sale_id[:8]
            
            safe_print(f"[PASS] Seeded sale: {sale_id} (short: {short_sale_id}) with product barcode {barcode}.")

            # 3. Open Sales History page
            safe_print("\n3. Navigating to Sales History...")
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # 4. Locate the newly created sale row and open details modal
            safe_print("Opening Details Modal for seeded sale...")
            row = page.locator(f"tr:has-text('{short_sale_id}')")
            row.first.wait_for(state="visible", timeout=5000)
            row.first.locator("button[title='Detalii Bon']").click()
            
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
            page.wait_for_timeout(1000)
            safe_print("[PASS] Details Modal opened.")

            # 5. Check Export Button & Warning presence
            safe_print("\n4. Verifying Export Button & Warning in Modal...")
            export_btn = page.locator("[data-testid='fiscalnet-export-button']")
            export_btn.wait_for(state="visible", timeout=5000)
            
            warning_banner = page.locator("[data-testid='fiscalnet-export-warning']")
            warning_banner.wait_for(state="visible", timeout=5000)
            
            warning_text = warning_banner.inner_text()
            assert "Atenție — Export Manual" in warning_text or "nu emite bon fiscal automat" in warning_text, \
                f"Warning banner missing appropriate warning text, got: {warning_text}"
            safe_print("[PASS] Button and Warning verified.")

            # 6. Click Export FiscalNet & Verify Preview content
            safe_print("\n5. Generating and verifying export preview...")
            export_btn.click()
            page.wait_for_timeout(1000)

            # Filename verification
            filename_el = page.locator("[data-testid='fiscalnet-download-filename']")
            filename_el.wait_for(state="visible", timeout=5000)
            assert f"{sale_id}.txt" in filename_el.inner_text(), f"Expected filename {sale_id}.txt, got {filename_el.inner_text()}"
            safe_print("[PASS] Filename display verified.")

            # Preview content verification
            preview_el = page.locator("[data-testid='fiscalnet-export-preview']")
            preview_el.wait_for(state="visible", timeout=5000)
            preview_text = preview_el.inner_text()
            safe_print(f"Generated Preview text:\n{preview_text}")

            assert f"S^PROD_SGR_EXP_{barcode}^1000^2000^buc^1^1" in preview_text, "Main product line is missing or incorrect"
            assert "S^GARANTIE SGR METAL^50^2000^buc^4^1" in preview_text, "SGR warranty line is missing or incorrect"
            assert "P^1^1000" in preview_text, "Cash payment line is missing or incorrect"
            assert "P^2^1100" in preview_text, "Card payment line is missing or incorrect"
            safe_print("[PASS] Preview content matches format Caret-separated lines correctly.")

            # 7. Test manual response parser: SUCCESS case
            safe_print("\n6. Testing Response Parser UI: SUCCESS case...")
            response_input = page.locator("[data-testid='fiscalnet-response-input']")
            parse_btn = page.locator("[data-testid='fiscalnet-response-parse-button']")
            result_panel = page.locator("[data-testid='fiscalnet-response-result']")

            response_input.fill("BONOK=1\n12345")
            parse_btn.click()
            page.wait_for_timeout(500)
            
            result_panel.wait_for(state="visible", timeout=5000)
            result_text = result_panel.inner_text()
            safe_print(f"Success parse panel text:\n{result_text}")
            assert "EMIS CU SUCCES" in result_text, "Success badge missing in parse result"
            assert "12345" in result_text, "Receipt number 12345 missing in parse result"
            safe_print("[PASS] Success response parsed and displayed correctly in UI.")

            # 8. Test manual response parser: ERROR case
            safe_print("\n7. Testing Response Parser UI: ERROR case...")
            response_input.fill("BONOK=0\nE01\nHartie lipsa")
            parse_btn.click()
            page.wait_for_timeout(500)
            
            result_panel.wait_for(state="visible", timeout=5000)
            result_text = result_panel.inner_text()
            safe_print(f"Error parse panel text:\n{result_text}")
            assert "ERORI SEMNALATE" in result_text, "Error badge missing in parse result"
            assert "E01" in result_text, "Error code E01 missing in parse result"
            assert "Hartie lipsa" in result_text, "Error message missing in parse result"
            safe_print("[PASS] Error response parsed and displayed correctly in UI.")

            # 9. Clean up seeded data
            safe_print("\n8. Cleaning up seeded database items...")
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('products').delete().eq('id', '{sgr_product_id}');
            }}""")
            safe_print("[PASS] Database cleaned up successfully.")

        except Exception as e:
            safe_print("[FAIL] E2E Playwright test failed!")
            page.screenshot(path="screenshot_error_manual_export_6gfn1.png", full_page=True)
            safe_print("[DEBUG] Saved error screenshot to screenshot_error_manual_export_6gfn1.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    run_static_checks()
    try:
        run_e2e_test()
        safe_print("\n[SUCCESS] E2E Playwright test 6G.FN.1 passed successfully!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
