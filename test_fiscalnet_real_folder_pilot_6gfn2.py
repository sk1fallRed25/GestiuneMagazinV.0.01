import sys
import os
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n=== RUNNING STATIC CHECKS ===")
    
    modal_path = "src/features/sales-history/components/SaleDetailsModal.tsx"
    with open(modal_path, "r", encoding="utf8") as f:
        modal_content = f.read()

    # 1. Verify warning presence
    assert "fiscalnet-real-write-warning" in modal_content, "[FAIL] Selector 'fiscalnet-real-write-warning' not found in SaleDetailsModal.tsx!"
    assert "Atenție: dacă folderul este cel real monitorizat" in modal_content, "[FAIL] Warning text for real write is missing or incorrect!"
    safe_print("[PASS] Real write warning banner configured.")

    # 2. Verify double confirmation text requirement
    assert "SCRIE BON FISCALNET" in modal_content, "[FAIL] Double-confirmation keyword 'SCRIE BON FISCALNET' not found in SaleDetailsModal.tsx!"
    safe_print("[PASS] Double confirmation keyword matches exactly.")

    # 3. Verify no hardcoding of C:\\FiscalNet as mandatory path
    # Cale default configuration in modal must be empty strings
    assert "bonuriPath: ''" in modal_content, "[FAIL] Config bonuriPath is not initialized empty!"
    assert "raspunsPath: ''" in modal_content, "[FAIL] Config raspunsPath is not initialized empty!"
    safe_print("[PASS] No hardcoded default C:\\FiscalNet paths detected.")

    # 4. Verify no automatic checkout/load write triggers
    # Verify no automatic call to window.electronAPI.writeFiscalNetFile on render/mount
    assert "useEffect" not in modal_content or "writeFiscalNetFile" not in modal_content, "[FAIL] Potential automatic write found in useEffect!"
    safe_print("[PASS] Safe from automatic write triggers on mount.")

def run_e2e_browser_only():
    safe_print("\n=== RUNNING BROWSER-ONLY SANDBOX E2E TESTS ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        
        try:
            # Login
            page.goto("http://localhost:5173/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # Seed transaction via Supabase RPC
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                const { data: userData } = await supabase.auth.getUser();
                const profileId = userData.user.id;
                const barcode = 'E2E_PILOT_' + Math.floor(Math.random() * 10000000);
                
                const { data: prod } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PROD_PILOT_' + barcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false
                }).select().single();

                await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    price_sale: 5.00,
                    vat_group: 'A',
                    vat_percent: 19
                });

                await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    zone: 'magazin',
                    quantity: 5
                });

                const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: profileId
                });
                
                let shiftId = shift ? shift.shift_id : null;
                if (!shiftId) {
                    shiftId = await supabase.rpc('open_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: profileId,
                        p_opening_cash: 100.00
                    });
                }

                const { data: saleId } = await supabase.rpc('finalize_sale', {
                    p_store_id: storeId,
                    p_profile_id: profileId,
                    p_items: [{ product_id: prod.id, quantity: 1 }],
                    p_payments: [{ method: 'cash', amount: 5.00 }],
                    p_shift_id: shiftId
                });

                const saleIdStr = typeof saleId === 'string' ? saleId : (saleId && typeof saleId === 'object' && 'sale_id' in saleId ? saleId.sale_id : null);
                return { saleId: saleIdStr, productId: prod.id };
            }""")
            
            sale_id = seed_res['saleId']
            product_id = seed_res['productId']
            short_sale_id = sale_id[:8]
            safe_print(f"[PASS] Seeded sale: {sale_id}")

            # Navigate to sales history
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_timeout(1000)
            
            # Open details
            row = page.locator(f"tr:has-text('{short_sale_id}')")
            row.first.locator("button[title='Detalii Bon']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)

            # Export to show preview
            page.locator("[data-testid='fiscalnet-export-button']").click()
            page.locator("[data-testid='fiscalnet-pilot-section']").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Pilot section is visible.")

            # Validate configuration status
            status_el = page.locator("[data-testid='fiscalnet-runtime-status']")
            status_text = status_el.inner_text()
            assert "BROWSER SANDBOX" in status_text.upper() or "SCRIERE DEZACTIVAT" in status_text.upper(), f"Unexpected runtime status: {status_text}"
            safe_print("[PASS] Runtime status displays Browser Sandbox.")

            # Toggle pilot checkbox
            toggle = page.locator("[data-testid='fiscalnet-real-write-toggle']")
            toggle.check()
            page.locator("[data-testid='fiscalnet-real-write-warning']").wait_for(state="visible", timeout=2000)
            safe_print("[PASS] Warning banner is displayed when pilot is activated.")

            # Configure paths
            page.locator("[data-testid='fiscalnet-bonuri-path-input']").fill("C:\\TestFiscalNet\\Bonuri")
            page.locator("[data-testid='fiscalnet-raspuns-path-input']").fill("C:\\TestFiscalNet\\Raspuns")
            
            # Validate config button
            page.locator("[data-testid='fiscalnet-validate-config-button']").click()
            page.wait_for_timeout(500)
            safe_print("[PASS] Validate configuration button clicked.")

            # Assert write button is disabled in browser Sandbox
            write_btn = page.locator("[data-testid='fiscalnet-write-real-folder-button']")
            assert write_btn.is_disabled(), "[FAIL] Write button is enabled in browser environment!"
            safe_print("[PASS] Write button is disabled in browser sandbox mode.")

            # Cleanup seeded data
            page.evaluate(f"window.supabase.from('products').delete().eq('id', '{product_id}')")
            safe_print("[PASS] Database cleaned up.")

        finally:
            browser.close()

def run_e2e_electron_mocked():
    safe_print("\n=== RUNNING ELECTRON MOCKED E2E TESTS ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        
        # Inject mock Electron API
        context.add_init_script("""
            window.electronAPI = {
                isElectron: true,
                writeFiscalNetFile: async (args) => {
                    window.__lastWriteArgs = args;
                    return { success: true, filePath: args.bonuriPath + '/' + args.filename };
                },
                readFiscalNetResponse: async (args) => {
                    window.__lastReadArgs = args;
                    return { success: true, content: 'BONOK=1\\r\\nNUMARBON=9988' };
                }
            };
        """)
        
        page = context.new_page()
        
        try:
            # Login
            page.goto("http://localhost:5173/#/login")
            page.locator("input[type='text']").wait_for(state="visible")
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible")

            # Seed transaction via Supabase RPC
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                const { data: userData } = await supabase.auth.getUser();
                const profileId = userData.user.id;
                const barcode = 'E2E_PILOT_EL_' + Math.floor(Math.random() * 10000000);
                
                const { data: prod } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PROD_PILOT_EL_' + barcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false
                }).select().single();

                await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    price_sale: 7.00,
                    vat_group: 'A',
                    vat_percent: 19
                });

                await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: prod.id,
                    zone: 'magazin',
                    quantity: 5
                });

                const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: profileId
                });
                
                let shiftId = shift ? shift.shift_id : null;
                if (!shiftId) {
                    shiftId = await supabase.rpc('open_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: profileId,
                        p_opening_cash: 100.00
                    });
                }

                const { data: saleId } = await supabase.rpc('finalize_sale', {
                    p_store_id: storeId,
                    p_profile_id: profileId,
                    p_items: [{ product_id: prod.id, quantity: 1 }],
                    p_payments: [{ method: 'cash', amount: 7.00 }],
                    p_shift_id: shiftId
                });

                const saleIdStr = typeof saleId === 'string' ? saleId : (saleId && typeof saleId === 'object' && 'sale_id' in saleId ? saleId.sale_id : null);
                return { saleId: saleIdStr, productId: prod.id };
            }""")
            
            sale_id = seed_res['saleId']
            product_id = seed_res['productId']
            short_sale_id = sale_id[:8]

            # Navigate to sales history
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_timeout(1000)
            
            # Open details
            row = page.locator(f"tr:has-text('{short_sale_id}')")
            row.first.locator("button[title='Detalii Bon']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible")

            # Export to show preview
            page.locator("[data-testid='fiscalnet-export-button']").click()
            page.locator("[data-testid='fiscalnet-pilot-section']").wait_for(state="visible")

            # Verify runtime status displays active Electron
            status_el = page.locator("[data-testid='fiscalnet-runtime-status']")
            status_text = status_el.inner_text()
            assert "ELECTRON" in status_text.upper() or "DESKTOP BRIDGE ACTIV" in status_text.upper(), f"Unexpected Electron status: {status_text}"
            safe_print("[PASS] Electron environment detected.")

            # Configure paths and validate
            page.locator("[data-testid='fiscalnet-bonuri-path-input']").fill("C:\\TestElectron\\Bonuri")
            page.locator("[data-testid='fiscalnet-raspuns-path-input']").fill("C:\\TestElectron\\Raspuns")
            page.locator("[data-testid='fiscalnet-validate-config-button']").click()
            page.wait_for_timeout(200)

            # Toggle pilot checkbox
            toggle = page.locator("[data-testid='fiscalnet-real-write-toggle']")
            toggle.check()

            # Assert write button is now enabled
            write_btn = page.locator("[data-testid='fiscalnet-write-real-folder-button']")
            assert not write_btn.is_disabled(), "[FAIL] Write button should be enabled in Electron!"
            
            # Click write to trigger dialog
            write_btn.click()
            dialog = page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']")
            dialog.wait_for(state="visible")
            safe_print("[PASS] Double confirmation dialog shown.")

            # Type invalid confirmation text
            confirm_input = page.locator("[data-testid='fiscalnet-real-write-confirm-input']")
            confirm_input.fill("GRESIT")
            
            confirm_btn = page.locator("[data-testid='fiscalnet-real-write-confirm-button']")
            assert confirm_btn.is_disabled(), "[FAIL] Confirm button enabled with invalid confirmation text!"
            safe_print("[PASS] Confirm button remains disabled for mismatched input.")

            # Type exact confirmation text
            confirm_input.fill("SCRIE BON FISCALNET")
            assert not confirm_btn.is_disabled(), "[FAIL] Confirm button disabled with correct confirmation text!"
            
            # Click confirm to execute mock write
            confirm_btn.click()
            page.wait_for_timeout(500)
            safe_print("[PASS] Correct confirmation typed and write triggered.")

            # Assert write call arguments inside the page
            write_args = page.evaluate("window.__lastWriteArgs")
            assert write_args['bonuriPath'] == "C:\\TestElectron\\Bonuri"
            assert write_args['filename'] == f"{sale_id}.txt"
            assert "S^" in write_args['content']
            safe_print("[PASS] Mock IPC write called with correct arguments.")

            # Read response
            read_btn = page.locator("[data-testid='fiscalnet-read-response-button']")
            read_btn.wait_for(state="visible")
            read_btn.click()
            page.wait_for_timeout(500)

            # Assert response read arguments
            read_args = page.evaluate("window.__lastReadArgs")
            assert read_args['raspunsPath'] == "C:\\TestElectron\\Raspuns"
            assert read_args['filename'] == f"{sale_id}.txt"

            # Verify response parsed result is shown
            result_el = page.locator("[data-testid='fiscalnet-response-file-result']")
            result_el.wait_for(state="visible")
            result_text = result_el.inner_text()
            assert "BONOK=1" in result_text or "9988" in result_text
            safe_print("[PASS] Mock IPC response read and parsed result displayed correctly.")

            # Cleanup seeded data
            page.evaluate(f"window.supabase.from('products').delete().eq('id', '{product_id}')")
            safe_print("[PASS] Database cleaned up.")

        finally:
            browser.close()

if __name__ == '__main__':
    run_static_checks()
    try:
        run_e2e_browser_only()
        run_e2e_electron_mocked()
        safe_print("\n[SUCCESS] E2E Playwright test 6G.FN.2 passed successfully!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
