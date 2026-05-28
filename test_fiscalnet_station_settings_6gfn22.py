import sys
import os
import re
import subprocess
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n=== RUNNING STATIC CHECKS ===")
    
    # 1. Verify FiscalNetStationSettings.tsx file exists
    settings_component_path = "src/features/fiscal-net/components/FiscalNetStationSettings.tsx"
    assert os.path.exists(settings_component_path), f"[FAIL] {settings_component_path} does not exist!"
    safe_print("[PASS] FiscalNetStationSettings.tsx exists.")

    # 2. Check getFiscalNetConfig / saveFiscalNetConfig exports in fiscal-net/fiscalNetConfigService.ts
    index_path = "src/features/fiscal-net/fiscalNetConfigService.ts"
    with open(index_path, "r", encoding="utf-8") as f:
        index_content = f.read()
    assert "getFiscalNetConfig" in index_content, "[FAIL] getFiscalNetConfig export not found in fiscal-net/fiscalNetConfigService.ts"
    assert "saveFiscalNetConfig" in index_content, "[FAIL] saveFiscalNetConfig export not found in fiscal-net/fiscalNetConfigService.ts"
    safe_print("[PASS] Exports verified in fiscal-net/fiscalNetConfigService.ts.")

    # 3. Check for settings panel inclusion in StoreSettingsPage.tsx
    settings_page_path = "src/features/store-settings/StoreSettingsPage.tsx"
    with open(settings_page_path, "r", encoding="utf-8") as f:
        page_content = f.read()
    assert "FiscalNetStationSettings" in page_content, "[FAIL] FiscalNetStationSettings panel not integrated in StoreSettingsPage.tsx"
    safe_print("[PASS] FiscalNetStationSettings integration verified in StoreSettingsPage.tsx.")

def run_e2e_tests():
    safe_print("\n=== RUNNING STATION SETTINGS E2E TESTS ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Block service workers and mock electronAPI
        context = browser.new_context(service_workers="block")
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
        """)
        
        page = context.new_page()
        
        # Listen to all console events and errors from the page
        def handle_console(msg):
            safe_print(f"[BROWSER LOG] {msg.type}: {msg.text}")
        page.on("console", handle_console)
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            # Step 1: Login as Admin
            page.goto("http://localhost:5173/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("Logged in as admin.")

            # Step 2: Navigate to Store Settings
            page.goto("http://localhost:5173/#/setari-magazin")
            page.locator("[data-testid='fiscalnet-station-settings']").wait_for(state="visible", timeout=10000)
            safe_print("Navigated to Store Settings Page and found FiscalNet Panel.")

            # Step 3: Configure Settings in the Panel
            page.locator("[data-testid='fiscalnet-settings-enabled']").check()
            page.locator("[data-testid='fiscalnet-settings-bonuri-path']").fill("C:\\StationConfig\\Bonuri")
            page.locator("[data-testid='fiscalnet-settings-raspuns-path']").fill("C:\\StationConfig\\Raspuns")
            page.locator("[data-testid='fiscalnet-settings-real-write']").check()
            
            # Click Validate Settings
            page.locator("[data-testid='fiscalnet-settings-validate-button']").click()
            page.locator("text=Configurată & Validată").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Station configuration validated in UI.")

            # Click Save Settings
            page.locator("[data-testid='fiscalnet-settings-save-button']").click()
            page.wait_for_timeout(500)
            safe_print("[PASS] Station configuration saved.")

            # Reload Page and verify settings are persisted in settings panel
            page.reload()
            page.locator("[data-testid='fiscalnet-station-settings']").wait_for(state="visible", timeout=10000)
            
            bonuri_val = page.locator("[data-testid='fiscalnet-settings-bonuri-path']").input_value()
            raspuns_val = page.locator("[data-testid='fiscalnet-settings-raspuns-path']").input_value()
            assert bonuri_val == "C:\\StationConfig\\Bonuri", f"Expected C:\\StationConfig\\Bonuri but got {bonuri_val}"
            assert raspuns_val == "C:\\StationConfig\\Raspuns", f"Expected C:\\StationConfig\\Raspuns but got {raspuns_val}"
            safe_print("[PASS] Configuration successfully loaded and verified after reload.")

            # Seed a dummy sale
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                const { data: userData } = await supabase.auth.getUser();
                const profileId = userData.user.id;
                const barcode = 'E2E_SETT_' + Math.floor(Math.random() * 10000000);
                
                const { data: prod } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PROD_SETT_' + barcode,
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
                return { saleId: saleIdStr, productId: prod.id, profileId };
            }""")
            
            sale_id = seed_res['saleId']
            product_id = seed_res['productId']
            profile_id = seed_res['profileId']
            short_sale_id = sale_id[:8]
            safe_print(f"Seeded sale {sale_id}")





            # Go to sales history
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_timeout(1500)

            # Now, simulate Cashier by setting the mock flag
            page.evaluate("""() => {
                window.__mockCasier = true;
            }""")
            safe_print("Simulated user role change to casier.")
            
            # Open details modal
            row = page.locator(f"tr:has-text('{short_sale_id}')")
            row.first.locator("button[title='Detalii Bon']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible")
            
            # Click Export to show preview
            page.locator("[data-testid='fiscalnet-export-button']").click()
            page.locator("[data-testid='fiscalnet-pilot-section']").wait_for(state="visible")

            # Verify input fields are hidden for cashier
            assert page.locator("[data-testid='fiscalnet-bonuri-path-input']").count() == 0, "[FAIL] Bonuri path input should be hidden for cashier!"
            assert page.locator("[data-testid='fiscalnet-raspuns-path-input']").count() == 0, "[FAIL] Raspuns path input should be hidden for cashier!"
            safe_print("[PASS] Input fields successfully hidden for cashier.")

            # Verify configuration status message shows the correct configured path
            status_box = page.locator("text=FiscalNet configurat pe această stație POS.")
            status_box.wait_for(state="visible", timeout=3000)
            
            bonuri_status = page.locator("text=Bonuri: C:\\StationConfig\\Bonuri")
            bonuri_status.wait_for(state="visible", timeout=3000)
            safe_print("[PASS] Configured status paths shown correctly to cashier.")

            # Write the file as cashier (without manual path inputs in modal)
            write_btn = page.locator("[data-testid='fiscalnet-write-real-folder-button']")
            assert not write_btn.is_disabled(), "[FAIL] Write button should be enabled for cashier since config is set!"
            
            # Hook dialog
            page.on("dialog", lambda dialog: dialog.accept())
            write_btn.click()
            
            # Confirm
            dialog = page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']")
            dialog.wait_for(state="visible", timeout=3000)
            page.locator("[data-testid='fiscalnet-real-write-confirm-input']").fill("SCRIE BON FISCALNET")
            page.locator("[data-testid='fiscalnet-real-write-confirm-button']").click()
            
            # Verify IPC write used the settings config paths
            page.wait_for_timeout(1000)
            last_args = page.evaluate("window.mockLastWriteArgs")
            assert last_args is not None, "[FAIL] electronAPI.writeFiscalNetFile was not called!"
            assert last_args['bonuriPath'] == "C:\\StationConfig\\Bonuri", f"Expected C:\\StationConfig\\Bonuri but got {last_args['bonuriPath']}"
            assert last_args['raspunsPath'] == "C:\\StationConfig\\Raspuns", f"Expected C:\\StationConfig\\Raspuns but got {last_args['raspunsPath']}"
            safe_print("[PASS] E2E cashier successfully wrote receipt file using station settings.")

            # Cleanup user role back to platform_owner or admin
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('profiles').update({{ role: 'platform_owner' }}).eq('id', '{profile_id}');
            }}""")
            safe_print("Restored user role in database.")

            # Cleanup product
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('product_prices').delete().eq('product_id', '{product_id}');
                await supabase.from('stock_batches').delete().eq('product_id', '{product_id}');
                await supabase.from('products').delete().eq('id', '{product_id}');
            }}""")
            safe_print("Cleaned up seeded database items.")

        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_static_checks()
        run_e2e_tests()
        safe_print("\n[SUCCESS] E2E Playwright test 6G.FN.2.2 passed successfully!")
        sys.exit(0)
    except Exception as e:
        safe_print(f"\n[FAIL] Test failed: {e}")
        sys.exit(1)
