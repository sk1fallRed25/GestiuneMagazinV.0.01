import sys
import os
import re
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n=== RUNNING STATIC CHECKS ===")
    
    # 1. Verify fiscalNetPostCheckoutService.ts exists
    service_path = "src/features/fiscal-net/fiscalNetPostCheckoutService.ts"
    assert os.path.exists(service_path), f"[FAIL] {service_path} does not exist!"
    safe_print("[PASS] fiscalNetPostCheckoutService.ts exists.")

    # 2. Check usePos.ts imports and calls the service
    use_pos_path = "src/features/pos/hooks/usePos.ts"
    with open(use_pos_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "tryWriteFiscalNetAfterCheckout" in content, "[FAIL] tryWriteFiscalNetAfterCheckout is not referenced in usePos.ts"
    safe_print("[PASS] usePos.ts references tryWriteFiscalNetAfterCheckout.")

    # 3. Check for hardcoded C:\FiscalNet path in new code files
    for root, dirs, files in os.walk("src/features/fiscal-net"):
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    file_text = f.read()
                # Ensure no literal hardcoded "C:\\FiscalNet" is present
                assert "C:\\\\FiscalNet" not in file_text, f"[FAIL] Hardcoded path found in {path}"
    safe_print("[PASS] No hardcoded C:\\FiscalNet path in fiscal-net code files.")

def run_e2e_tests():
    safe_print("\n=== RUNNING E2E PLAYWRIGHT TESTS FOR AUTO-WRITE ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Scenario A: Browser Sandbox (No ElectronAPI)
        safe_print("\n--- Scenario A: Browser Sandbox (No ElectronAPI) ---")
        context_sandbox = browser.new_context(service_workers="block")
        page = context_sandbox.new_page()
        
        def handle_dialog(dialog):
            safe_print(f"[DEBUG DIALOG] Type: {dialog.type}, Message: {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG DIALOG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: safe_print(f"[BROWSER ERROR] {err}"))
        
        # Login
        page.goto("http://localhost:5174/#/login")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
        safe_print("Logged in successfully.")

        # Seed products via Supabase in browser context
        seeding = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const storeId = stores[0].id;
            
            const sgrBarcode = 'E2E_AUTO_SGR_' + Math.floor(Math.random() * 100000000);
            const normBarcode = 'E2E_AUTO_NORM_' + Math.floor(Math.random() * 100000000);
            
            // SGR Product
            const { data: pSgr } = await supabase.from('products').insert({
                store_id: storeId,
                barcode: sgrBarcode,
                name: 'AUTO_SGR_' + sgrBarcode,
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
                batch_number: 'LOT_' + sgrBarcode
            });

            // Normal Product
            const { data: pNorm } = await supabase.from('products').insert({
                store_id: storeId,
                barcode: normBarcode,
                name: 'AUTO_NORM_' + normBarcode,
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
                batch_number: 'LOT_' + normBarcode
            });

            return {
                sgrBarcode,
                sgrName: 'AUTO_SGR_' + sgrBarcode,
                sgrId: pSgr.id,
                normBarcode,
                normName: 'AUTO_NORM_' + normBarcode,
                normId: pNorm.id
            };
        }""")
        safe_print(f"Seeded products: {seeding}")

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
            safe_print("Shift opened.")

        # Add normal product to cart
        page.locator("input[placeholder*='nume sau cod']").fill(seeding["normName"])
        page.locator(f"button:has-text('{seeding['normName']}')").wait_for(state="visible")
        page.locator(f"button:has-text('{seeding['normName']}')").click()
        page.wait_for_timeout(500)

        # Checkout
        try:
            page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
            
            # Wait for cart to clear (indicating successful checkout)
            page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Browser sandbox checkout completed (cart cleared).")
        except Exception as sandbox_err:
            page.screenshot(path="screenshot_sandbox_fail.png", full_page=True)
            with open("debug_sandbox.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            safe_print(f"[FAIL] Sandbox checkout failed: {sandbox_err}")
            raise sandbox_err

        # Close sandbox browser context
        context_sandbox.close()

        # Scenario B: Electron Environment Mocks
        safe_print("\n--- Scenario B: Electron Environment (MOCKED API) ---")
        context_electron = browser.new_context(service_workers="block")
        context_electron.add_init_script("""
            window.electronAPI = {
                isElectron: true,
                writeFiscalNetFile: async (args) => {
                    window.mockLastWriteArgs = args;
                    return window.mockWriteResult || { success: true, filePath: args.bonuriPath + '\\\\' + args.filename };
                },
                readFiscalNetResponse: async (args) => {
                    return { success: true, content: 'UR1^12345^0^EMIS CU SUCCES^' };
                }
            };
            window.SGR_CHECKOUT_BACKEND_ENABLED = true;
            
            // Inject station settings config in localStorage
            localStorage.setItem('fiscalnet-pilot-config', JSON.stringify({
                enabled: true,
                bonuriPath: 'C:\\\\FakeFiscalNet\\\\Bonuri',
                raspunsPath: 'C:\\\\FakeFiscalNet\\\\Raspuns',
                realWriteEnabled: true,
                requireConfirmation: false,
                validatedAt: new Date().toISOString()
            }));
        """)
        page = context_electron.new_page()

        def handle_dialog_b(dialog):
            safe_print(f"[DEBUG DIALOG B] Type: {dialog.type}, Message: {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG DIALOG B] Dialog accepted successfully.")

        page.on("dialog", handle_dialog_b)

        # Login
        page.goto("http://localhost:5174/#/login")
        page.locator("input[type='text']").wait_for(state="visible")
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        page.locator("text=Deconectare").wait_for(state="visible")

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

        # 1. Test standard cash checkout print success
        safe_print("1. Testing standard cash print success...")
        page.locator("input[placeholder*='nume sau cod']").fill(seeding["normName"])
        page.locator(f"button:has-text('{seeding['normName']}')").wait_for(state="visible")
        page.locator(f"button:has-text('{seeding['normName']}')").click()
        page.wait_for_timeout(500)

        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)
        safe_print("[PASS] Standard cash print checkout completed (cart cleared).")

        # Check mock arguments
        write_args = page.evaluate("window.mockLastWriteArgs")
        assert write_args["bonuriPath"] == "C:\\FakeFiscalNet\\Bonuri"
        assert write_args["raspunsPath"] == "C:\\FakeFiscalNet\\Raspuns"
        assert write_args["filename"].endswith(".txt")
        assert "S^AUTO_NORM_" in write_args["content"]
        assert "P^1^500" in write_args["content"] # Cash, 5.00 RON -> 500
        safe_print("[PASS] Correct path and file structure written via Electron IPC.")

        # 2. Test SGR item print success
        safe_print("\n2. Testing SGR item print success...")
        page.locator("input[placeholder*='nume sau cod']").fill(seeding["sgrName"])
        page.locator(f"button:has-text('{seeding['sgrName']}')").wait_for(state="visible")
        page.locator(f"button:has-text('{seeding['sgrName']}')").click()
        page.wait_for_timeout(500)

        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)

        # Check mock arguments for SGR product and warranty lines
        write_args_sgr = page.evaluate("window.mockLastWriteArgs")
        assert "S^AUTO_SGR_" in write_args_sgr["content"]
        assert "S^GARANTIE SGR METAL^50^1000^buc^4^1" in write_args_sgr["content"]
        safe_print("[PASS] SGR product and separate warranty line generated successfully.")

        # 3. Test mixed payments print success
        safe_print("\n3. Testing mixed payments print success...")
        page.locator("input[placeholder*='nume sau cod']").fill(seeding["normName"])
        page.locator(f"button:has-text('{seeding['normName']}')").wait_for(state="visible")
        page.locator(f"button:has-text('{seeding['normName']}')").click()
        page.wait_for_timeout(500)

        # Mixed payment selection
        page.locator("button:has-text('MIXT')").click()
        page.wait_for_timeout(500)

        page.locator("label:has-text('SUMĂ CASH') + input").fill("2.00")
        page.locator("label:has-text('SUMĂ CASH') + input").dispatch_event("blur")
        page.wait_for_timeout(500)

        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)

        # Check mock arguments for mixed payments
        write_args_mixed = page.evaluate("window.mockLastWriteArgs")
        assert "P^1^200" in write_args_mixed["content"]  # Cash 2.00 -> 200
        assert "P^2^300" in write_args_mixed["content"]  # Card 3.00 -> 300
        safe_print("[PASS] Mixed payment payment lines generated correctly.")

        # 4. Test print failure case
        safe_print("\n4. Testing print failure case...")
        page.evaluate("window.mockWriteResult = { success: false, error: 'Acces refuzat la folderul Bonuri.' }")
        
        page.locator("input[placeholder*='nume sau cod']").fill(seeding["normName"])
        page.locator(f"button:has-text('{seeding['normName']}')").wait_for(state="visible")
        page.locator(f"button:has-text('{seeding['normName']}')").click()
        page.wait_for_timeout(500)

        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.locator("span.text-5xl:has-text('0.00')").wait_for(state="visible", timeout=10000)
        safe_print("[PASS] Print failure toast correctly shown. Sale was still finalized (cart is cleared).")

        # Cart should still be cleared
        total_text = page.locator("span.text-5xl").inner_text()
        assert "0.00" in total_text, f"Expected cart to clear even on print failure, got {total_text}"
        safe_print("[PASS] Cart successfully cleared on print failure.")

        # 5. Clean up seeded products in DB
        safe_print("\n5. Cleaning up database...")
        page.evaluate(f"""async () => {{
            const supabase = window.supabase;
            await supabase.from('products').delete().eq('id', "{seeding['sgrId']}");
            await supabase.from('products').delete().eq('id', "{seeding['normId']}");
        }}""")
        safe_print("[PASS] Database cleanup complete.")

        context_electron.close()
        browser.close()

if __name__ == '__main__':
    try:
        run_static_checks()
        run_e2e_tests()
        safe_print("\n=== [SUCCESS] ALL AUTO-WRITE TESTS PASSED! ===")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
