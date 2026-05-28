import sys
import os
import subprocess
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n=== RUNNING STATIC SECURITY CHECKS ===")
    
    # 1. Check electron-main.js helpers
    main_path = "electron-main.js"
    with open(main_path, "r", encoding="utf8") as f:
        main_content = f.read()
        
    required_helpers = [
        "isSafeTxtFilename",
        "assertDirectoryExists",
        "resolveInside",
        "serializeError"
    ]
    for helper in required_helpers:
        assert helper in main_content, f"[FAIL] Security helper '{helper}' missing from electron-main.js!"
    safe_print("[PASS] All security helpers are defined in electron-main.js.")

    # 2. Check SaleDetailsModal.tsx for correct error messaging
    modal_path = "src/features/sales-history/components/SaleDetailsModal.tsx"
    with open(modal_path, "r", encoding="utf8") as f:
        modal_content = f.read()

    assert "Scrierea directă este disponibilă doar în aplicația desktop." in modal_content, \
        "[FAIL] Correct sandbox warning toast text not found in SaleDetailsModal.tsx!"
    safe_print("[PASS] SaleDetailsModal.tsx sandbox warning toast configured correctly.")

def run_node_ipc_tests():
    safe_print("\n=== RUNNING LOW-LEVEL NODE IPC SECURITY TESTS ===")
    node_cmd = ["node", "test_fiscalnet_ipc_node.js"]
    safe_print(f"Executing: {' '.join(node_cmd)}")
    res = subprocess.run(node_cmd, capture_output=True, text=True)
    
    safe_print("Node.js Output:")
    safe_print(res.stdout)
    if res.stderr:
        safe_print("Node.js Errors:")
        safe_print(res.stderr)
        
    assert res.returncode == 0, "[FAIL] Node IPC security tests failed!"
    safe_print("[PASS] Node IPC security tests passed successfully.")

def run_e2e_sandbox_tests():
    safe_print("\n=== RUNNING PLAYWRIGHT SANDBOX TOAST E2E TESTS ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        context.add_init_script("""
            window.electronAPI = {
                isElectron: true
            };
        """)
        page = context.new_page()
        
        # Listen to all console events and errors from the page
        def handle_console(msg):
            safe_print(f"[BROWSER LOG] {msg.type}: {msg.text}")
        page.on("console", handle_console)
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        try:
            # Login
            page.goto("http://localhost:5173/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
            safe_print("Logged in.")

            # Seed a dummy sale
            seed_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                const { data: userData } = await supabase.auth.getUser();
                const profileId = userData.user.id;
                const barcode = 'E2E_IPC_SEC_' + Math.floor(Math.random() * 10000000);
                
                const { data: prod } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PROD_IPC_SEC_' + barcode,
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
            safe_print(f"Seeded sale: {sale_id}")

            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_timeout(1000)
            safe_print(f"DEBUG: window.electronAPI: {page.evaluate('window.electronAPI')}")
            
            row = page.locator(f"tr:has-text('{short_sale_id}')")
            row.first.locator("button[title='Detalii Bon']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible")
            
            page.locator("[data-testid='fiscalnet-export-button']").click()
            page.locator("[data-testid='fiscalnet-pilot-section']").wait_for(state="visible")
            
            # Configure and validate config first
            page.locator("[data-testid='fiscalnet-real-write-toggle']").check()
            page.locator("[data-testid='fiscalnet-bonuri-path-input']").fill("C:\\TestFiscalNet\\Bonuri")
            page.locator("[data-testid='fiscalnet-raspuns-path-input']").fill("C:\\TestFiscalNet\\Raspuns")
            page.locator("[data-testid='fiscalnet-validate-config-button']").click()
            page.wait_for_timeout(500)


            
            # Hook dialog handler in case alert or confirmation is triggered
            page.on("dialog", lambda dialog: dialog.accept())
            
            # Click the write button to trigger validation dialog
            page.locator("[data-testid='fiscalnet-write-real-folder-button']").click()
            
            # Fill double confirmation partially
            dialog = page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']")
            dialog.wait_for(state="visible", timeout=3000)
            page.locator("[data-testid='fiscalnet-real-write-confirm-input']").fill("SCRIE BON FISCALNE")
            
            # Delete electronAPI to simulate browser sandbox environment
            page.evaluate("delete window.electronAPI")
            
            # Finish typing to trigger React state change and closure update
            page.locator("[data-testid='fiscalnet-real-write-confirm-input']").fill("SCRIE BON FISCALNET")
            

            
            page.locator("[data-testid='fiscalnet-real-write-confirm-button']").click()
            page.wait_for_timeout(1000)
            

            
            # Check for toast error message
            toast_el = page.locator("text=Scrierea direct")
            toast_el.wait_for(state="attached", timeout=5000)
            safe_print("[PASS] Sandbox write block toast successfully displayed.")

        except Exception as e:
            try:
                page.screenshot(path="screenshot_sandbox.png")
                safe_print("Saved failure screenshot to screenshot_sandbox.png")
                # Save HTML to scratch file to avoid terminal truncation
                import os
                os.makedirs("scratch", exist_ok=True)
                with open("scratch/body_html.html", "w", encoding="utf-8") as f:
                    f.write(page.evaluate("document.body.innerHTML"))
                safe_print("Saved failure HTML dump to scratch/body_html.html")
            except Exception as se:
                safe_print(f"Failed to save screenshot or HTML: {se}")
            raise e
        finally:
            if 'product_id' in locals():
                try:
                    page.evaluate(f"window.supabase.from('products').delete().eq('id', '{product_id}')")
                    safe_print("Cleaned up seeded product.")
                except Exception as e:
                    safe_print(f"Cleanup failed: {e}")
            browser.close()

def run_e2e_electron_hardened_tests():
    safe_print("\n=== RUNNING PLAYWRIGHT HARDENED ELECTRON IPC E2E TESTS ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        
        # Inject mock Electron API that returns security & size validation failures
        context.add_init_script("""
            window.electronAPI = {
                isElectron: true,
                writeFiscalNetFile: async (args) => {
                    return { success: false, error: 'Securitate: Cale sau nume fisier invalid.' };
                },
                readFiscalNetResponse: async (args) => {
                    return { success: false, error: 'Fișierul de răspuns este prea mare pentru parsare.' };
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

            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_timeout(1000)
            
            # Open first sale row details
            row = page.locator("tr").nth(1)
            row.locator("button[title='Detalii Bon']").click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible")
            
            page.locator("[data-testid='fiscalnet-export-button']").click()
            page.locator("[data-testid='fiscalnet-pilot-section']").wait_for(state="visible")
            
            # Setup paths, validate
            page.locator("[data-testid='fiscalnet-bonuri-path-input']").fill("C:\\Mock\\Bonuri")
            page.locator("[data-testid='fiscalnet-raspuns-path-input']").fill("C:\\Mock\\Raspuns")
            page.locator("[data-testid='fiscalnet-validate-config-button']").click()
            page.wait_for_timeout(200)
            
            page.locator("[data-testid='fiscalnet-real-write-toggle']").check()
            
            # Trigger write
            page.locator("[data-testid='fiscalnet-write-real-folder-button']").click()
            page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']").wait_for(state="visible")
            
            page.locator("[data-testid='fiscalnet-real-write-confirm-input']").fill("SCRIE BON FISCALNET")
            page.locator("[data-testid='fiscalnet-real-write-confirm-button']").click()
            page.wait_for_timeout(1000)
            
            # Check for security error toast
            toast_el = page.locator("text=Securitate: Cale sau nume fisier invalid.")
            toast_el.wait_for(state="attached", timeout=5000)
            safe_print("[PASS] Security error toast from Electron correctly displayed.")
            
            # Close the dialog since write failed and it stayed open
            page.locator("[data-testid='fiscalnet-real-write-confirm-cancel-button']").click()
            page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']").wait_for(state="hidden")
            
            # Force show read response button inside SaleDetailsModal state using page.evaluate (to test read failure toast)
            page.evaluate("""() => {
                // We mock the state lastWrittenFile inside SaleDetailsModal if we can,
                // or we can simulate it since the component shows the read button if lastWrittenFile is present.
                // We'll just write something to lastWrittenFile or manually click if visible.
            }""")
            
            # Since the write failed, the read button might not show up.
            # But let's verify if we can force trigger the read call or mock the UI flow.
            # Wait, let's verify that the toast messages are fully functional.
            # We can also check if we can trigger the click on the read button.
            # Let's inspect the SaleDetailsModal.tsx: it shows read button only if lastWrittenFile is truthy.
            # Let's mock a success write once to show the button, then mock a failed read!
            # Let's refresh/reinitialize the mock with dynamic behaviors:
            page.evaluate("""() => {
                window.electronAPI.writeFiscalNetFile = async (args) => {
                    return { success: true, filePath: 'C:\\Mock\\Bonuri\\sale.txt' };
                };
            }""")
            
            # Trigger write again
            page.locator("[data-testid='fiscalnet-write-real-folder-button']").click()
            page.locator("[data-testid='fiscalnet-real-write-confirm-dialog']").wait_for(state="visible")
            page.locator("[data-testid='fiscalnet-real-write-confirm-input']").fill("SCRIE BON FISCALNET")
            page.locator("[data-testid='fiscalnet-real-write-confirm-button']").click()
            page.wait_for_timeout(1000)
            
            # Write succeeded, so read button should be visible
            read_btn = page.locator("[data-testid='fiscalnet-read-response-button']")
            read_btn.wait_for(state="visible", timeout=5000)
            
            # Now click read response (it calls readFiscalNetResponse which returns size limit failure)
            read_btn.click()
            page.wait_for_timeout(1000)
            
            # Check for error toast
            read_toast = page.locator("text=prea mare pentru parsare")
            read_toast.wait_for(state="attached", timeout=5000)
            safe_print("[PASS] Read size limit error toast correctly displayed.")

        finally:
            browser.close()

if __name__ == '__main__':
    run_static_checks()
    run_node_ipc_tests()
    try:
        run_e2e_sandbox_tests()
        run_e2e_electron_hardened_tests()
        safe_print("\n[SUCCESS] E2E Playwright test 6G.FN.2.1 passed successfully!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
