import sys
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_test():
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
        def ensure_tax_settings(vat_payer: bool, default_group: str = None):
            btn_text = '✓ Plătitor' if vat_payer else '✗ Neplătitor'
            page.locator(f"button:has-text('{btn_text}')").click()
            page.wait_for_timeout(500)
            
            group_indices = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
            
            if vat_payer and default_group:
                idx = group_indices[default_group]
                page.locator("div.grid-cols-5 button").nth(idx).click()
                page.wait_for_timeout(500)
                
            save_btn = page.locator("button:has-text('Salvează')")
            if save_btn.is_visible():
                safe_print("Save button is visible, clicking Save...")
                save_btn.click()
                page.locator("text=Setările au fost salvate cu succes!").wait_for(state="visible", timeout=15000)
            else:
                safe_print("Store settings are already in the desired state, no save needed.")
        
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
            
            safe_print("Waiting for Dashboard to load...")
            page.locator("button[aria-label='Selectează magazinul activ']").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")
            
            # --- SCENARIO 1: VAT PAYER STORE ---
            safe_print("\n--- SCENARIO 1: VAT PAYER STORE ---")
            
            # Switch to Magazin Principal
            current_store_text = page.locator("button[aria-label='Selectează magazinul activ']").inner_text()
            if "Magazin Principal" not in current_store_text:
                safe_print("Switching to Magazin Principal...")
                page.locator("button[aria-label='Selectează magazinul activ']").click()
                page.wait_for_timeout(500)
                page.locator("button:has-text('Magazin Principal')").click()
                page.wait_for_timeout(2000)
            else:
                safe_print("Already on Magazin Principal.")
            
            # Go to Store Settings
            safe_print("Navigating to Store Settings...")
            page.goto("http://localhost:5173/#/setari-magazin")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Setări Magazin')").wait_for(state="visible", timeout=10000)
            
            # Configure store settings as VAT Payer
            safe_print("Configuring Store settings as VAT Payer...")
            ensure_tax_settings(True, 'A')
            safe_print("[PASS] Store Settings configured successfully as VAT Payer.")
            
            # Go to Products Page
            safe_print("Navigating to Products Page...")
            page.goto("http://localhost:5173/#/produse")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Monitorizare Stocuri & Produse')").wait_for(state="visible", timeout=10000)
            
            # Search for OTET 1L
            safe_print("Searching for product 'OTET 1L'...")
            search_input = page.locator("input[placeholder*='denumire']")
            search_input.fill("OTET 1L")
            page.wait_for_timeout(1000)
            
            # Open Edit Modal
            safe_print("Opening edit modal for 'OTET 1L'...")
            page.locator("tr", has_text="OTET 1L").locator("button[title='Editează produs']").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="visible", timeout=5000)
            
            # Verify VAT Selector is visible & contains select options
            safe_print("Verifying VAT Selector in Product Modal...")
            page.locator("label:has-text('Grupă TVA Fiscală')").wait_for(state="visible", timeout=5000)
            select_el = page.locator("form select")
            select_el.wait_for(state="visible", timeout=5000)
            
            # Select group B
            safe_print("Updating VAT Group to B (11%)...")
            select_el.select_option("B")
            page.wait_for_timeout(500)
            
            # Click Save in Modal
            page.locator("button[type='submit']:has-text('Actualizare Nomenclator')").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="detached", timeout=5000)
            safe_print("[PASS] Product edit modal saved successfully.")
            
            # Verify badge in table displays B (11%)
            safe_print("Verifying updated VAT badge in Product Table...")
            page.locator("tr", has_text="OTET 1L").locator("text=B (11%)").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Product Table displays correct VAT badge: B (11%).")
            
            # Go to Fast Add v2
            safe_print("Navigating to Fast Add...")
            page.goto("http://localhost:5173/#/fast-add")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Adăugare Rapidă (v2)')").wait_for(state="visible", timeout=10000)
            
            # Verify VAT selector is visible
            safe_print("Verifying VAT selector in Fast Add...")
            page.locator("label:has-text('Grupă TVA Fiscală')").wait_for(state="visible", timeout=5000)
            fast_add_select = page.locator("div.space-y-2").filter(has=page.locator("label:has-text('Grupă TVA Fiscală')")).locator("select")
            fast_add_select.wait_for(state="visible", timeout=5000)
            
            # Fill Fast Add Form
            safe_print("Filling Fast Add Form for VAT payer product...")
            page.locator("input[placeholder='||||||||||||']").fill("E2E_PAYER_123")
            page.locator("input[placeholder='Ex: Coca Cola 2L']").fill("VAT_E2E_PAYER_SODA")
            page.locator("input[placeholder='buc, kg, L...']").fill("buc")
            page.locator("input[id='priceSale']").fill("4.50")
            page.locator("input[placeholder='0.00']").last.fill("2.50")
            
            # Select Group C (11%)
            fast_add_select.select_option("C")
            page.wait_for_timeout(500)
            
            # Click Save Product
            safe_print("Saving product in Fast Add...")
            page.locator("button:has-text('SALVEAZĂ PRODUS')").click()
            page.locator("text=Adăugat/Actualizat cu succes!").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Fast Add product saved successfully.")
            
            # Verify in Product Table
            safe_print("Verifying Fast Add product badge in Product Table...")
            page.goto("http://localhost:5173/#/produse")
            page.wait_for_load_state("networkidle")
            page.locator("input[placeholder*='denumire']").fill("VAT_E2E_PAYER_SODA")
            page.wait_for_timeout(1000)
            page.locator("tr", has_text="VAT_E2E_PAYER_SODA").locator("text=C (11%)").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Product Table displays correct VAT badge for newly added product: C (11%).")
            
            # --- SCENARIO 2: NON-VAT PAYER STORE ---
            safe_print("\n--- SCENARIO 2: NON-VAT PAYER STORE ---")
            
            # Switch to Magazin Test 12345678 Punct 902
            safe_print("Switching to Magazin Test 12345678 Punct 902...")
            page.locator("button[aria-label='Selectează magazinul activ']").click()
            page.wait_for_timeout(500)
            page.locator("button:has-text('Magazin Test 12345678 Punct 902')").click()
            page.wait_for_timeout(2000)
            
            # Verify active switcher header
            page.locator("button[aria-label='Selectează magazinul activ']:has-text('Magazin Test 12345678 Punct 902')").wait_for(state="visible", timeout=5000)
            
            # Go to Store Settings
            safe_print("Navigating to Store Settings...")
            page.goto("http://localhost:5173/#/setari-magazin")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Setări Magazin')").wait_for(state="visible", timeout=10000)
            
            # Configure store settings as Non-VAT Payer
            safe_print("Configuring Store settings as Non-VAT Payer...")
            ensure_tax_settings(False)
            safe_print("[PASS] Store Settings configured successfully as Non-VAT Payer.")
            
            # Go to Fast Add
            safe_print("Navigating to Fast Add...")
            page.goto("http://localhost:5173/#/fast-add")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Adăugare Rapidă (v2)')").wait_for(state="visible", timeout=10000)
            
            # Verify VAT Selector is hidden/locked (select count is 0, banner is visible)
            safe_print("Verifying VAT Selector in Fast Add (Non-Payer)...")
            page.locator("text=Magazin neplătitor TVA").wait_for(state="visible", timeout=5000)
            assert page.locator("div.space-y-2").filter(has=page.locator("label:has-text('Grupă TVA Fiscală')")).locator("select").count() == 0, "Select element should not be rendered for non-vat payer store!"
            safe_print("[PASS] VAT selector dropdown is hidden/locked and notice banner is displayed.")
            
            # Fill Fast Add Form
            safe_print("Filling Fast Add Form for non-vat payer product...")
            page.locator("input[placeholder='||||||||||||']").fill("E2E_NONPAYER_123")
            page.locator("input[placeholder='Ex: Coca Cola 2L']").fill("VAT_E2E_NONPAYER_COLA")
            page.locator("input[placeholder='buc, kg, L...']").fill("buc")
            page.locator("input[id='priceSale']").fill("6.00")
            page.locator("input[placeholder='0.00']").last.fill("4.00")
            page.wait_for_timeout(500)
            
            # Save Product
            safe_print("Saving non-payer product in Fast Add...")
            page.locator("button:has-text('SALVEAZĂ PRODUS')").click()
            page.locator("text=Adăugat/Actualizat cu succes!").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Fast Add non-payer product saved successfully.")
            
            # Go to Products Page
            safe_print("Navigating to Products Page...")
            page.goto("http://localhost:5173/#/produse")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Monitorizare Stocuri & Produse')").wait_for(state="visible", timeout=10000)
            
            # Search for newly added non-payer product
            safe_print("Searching for product 'VAT_E2E_NONPAYER_COLA'...")
            page.locator("input[placeholder*='denumire']").fill("VAT_E2E_NONPAYER_COLA")
            page.wait_for_timeout(1000)
            
            # Verify badge displays E (0%)
            page.locator("tr", has_text="VAT_E2E_NONPAYER_COLA").locator("text=E (0%)").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Product Table displays correct VAT badge: E (0%).")
            
            # Open Edit Modal
            safe_print("Opening edit modal for 'VAT_E2E_NONPAYER_COLA'...")
            page.locator("tr", has_text="VAT_E2E_NONPAYER_COLA").locator("button[title='Editează produs']").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="visible", timeout=5000)
            
            # Verify Selector is hidden/locked and banner is visible inside modal
            safe_print("Verifying VAT Selector in edit modal (Non-Payer)...")
            page.locator("text=Magazin neplătitor TVA").wait_for(state="visible", timeout=5000)
            assert page.locator("form select").count() == 0, "Select element should not be rendered in edit modal for non-vat payer store!"
            safe_print("[PASS] VAT selector dropdown is hidden/locked in edit modal and notice banner is displayed.")
            
            # Close Modal
            page.locator("button", has=page.locator("svg.lucide-x")).click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="detached", timeout=5000)
            safe_print("[PASS] Closed edit modal.")
            
            # --- CLEANUP ---
            safe_print("\n--- CLEANING UP TEST DATA ---")
            page.evaluate("""async () => {
                const supabase = window.supabase;
                // Delete newly created products
                await supabase.from('products').delete().in('barcode', ['E2E_PAYER_123', 'E2E_NONPAYER_123']);
                // Reset OTET 1L vat group to A
                const { data: otet } = await supabase.from('products').select('id').eq('barcode', '6422336000013').single();
                if (otet) {
                    await supabase.from('product_prices').update({ vat_group: 'A' }).eq('product_id', otet.id);
                }
            }""")
            safe_print("[PASS] Cleaned up products and reset OTET 1L VAT group to A.")
            
        except Exception as e:
            safe_print("[FAIL] Exception occurred during test run!")
            page.screenshot(path="screenshot_error_vat_6d5.png", full_page=True)
            safe_print("[DEBUG] Screenshot saved to screenshot_error_vat_6d5.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Store Settings + Product VAT E2E Test 6D.5 passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
