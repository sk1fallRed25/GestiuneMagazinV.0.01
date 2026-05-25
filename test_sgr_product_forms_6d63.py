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
        
        try:
            # A. Login
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
            
            # Switch to Magazin Principal if the switcher button is present (multi-store account)
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

            # B. Adăugare Rapidă
            safe_print("\n2. Navigating to Fast Add Page...")
            page.goto("http://localhost:5173/#/fast-add")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Adăugare Rapidă (v2)')").wait_for(state="visible", timeout=10000)

            safe_print("Filling Fast Add form...")
            page.locator("input[placeholder='||||||||||||']").fill("E2E_SGR_TEST_123")
            page.locator("input[placeholder='Ex: Coca Cola 2L']").fill("SGR_E2E_TEST_PRODUCT")
            page.locator("input[placeholder='buc, kg, L...']").fill("buc")
            page.locator("input[id='priceSale']").fill("5.00")
            page.locator("input[placeholder='0.00']").last.fill("3.00")
            
            # Fill Stock and Batch Number to make it batch-managed
            page.locator("label:has-text('Stoc Inițial') + input").fill("10")
            page.locator("label:has-text('Nr. Lot') + input").fill("E2E_LOT_123")
            
            # Verify SGR selector is visible
            sgr_selector = page.locator("[data-testid='product-sgr-selector']")
            sgr_selector.wait_for(state="visible", timeout=5000)
            
            # Select SGR - PLASTIC
            safe_print("Selecting SGR - PLASTIC...")
            sgr_selector.select_option("plastic")
            page.wait_for_timeout(500)

            # Save product
            safe_print("Saving SGR product...")
            page.locator("button:has-text('SALVEAZĂ PRODUS')").click()
            page.locator("text=Adăugat/Actualizat cu succes!").wait_for(state="visible", timeout=10000)
            safe_print("[PASS] Product saved successfully.")

            # C. Reset formular
            safe_print("\n3. Verifying Form Reset...")
            # SGR selector should go back to 'none'
            sgr_value = sgr_selector.evaluate("el => el.value")
            assert sgr_value == 'none', f"SGR selector should reset to 'none', got '{sgr_value}'"
            safe_print("[PASS] SGR Selector correctly reset to 'none'.")

            # Verify in DB via window.supabase
            safe_print("Checking DB records for newly created product...")
            db_product = page.evaluate("""async () => {
                const { data } = await window.supabase
                    .from('products')
                    .select('*')
                    .eq('barcode', 'E2E_SGR_TEST_123')
                    .neq('status', 'deleted')
                    .maybeSingle();
                return data;
            }""")
            
            assert db_product is not None, "Product should exist in DB"
            assert db_product.get('sgr_enabled') is True, f"sgr_enabled should be True, got {db_product.get('sgr_enabled')}"
            assert db_product.get('sgr_type') == 'plastic', f"sgr_type should be 'plastic', got {db_product.get('sgr_type')}"
            
            db_price = page.evaluate("""async (prodId) => {
                const { data } = await window.supabase
                    .from('product_prices')
                    .select('*')
                    .eq('product_id', prodId)
                    .maybeSingle();
                return data;
            }""", db_product['id'])
            
            assert db_price is not None, "Product price should exist in DB"
            assert db_price.get('vat_group') == 'A', f"vat_group should remain 'A', got {db_price.get('vat_group')}"
            safe_print("[PASS] DB verification after creation complete.")

            # D. Product Table and Edit Modal
            safe_print("\n4. Verifying Product Table and Edit Modal...")
            page.goto("http://localhost:5173/#/produse")
            page.wait_for_load_state("networkidle")
            page.locator("h1:has-text('Monitorizare Stocuri & Produse')").wait_for(state="visible", timeout=10000)
            
            # Search for SGR_E2E_TEST_PRODUCT
            search_input = page.locator("input[placeholder*='denumire']")
            search_input.fill("SGR_E2E_TEST_PRODUCT")
            page.wait_for_timeout(1000)

            # Check SGR badge in table
            sgr_badge = page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("[data-testid='product-sgr-badge']")
            sgr_badge.wait_for(state="visible", timeout=5000)
            badge_text = sgr_badge.inner_text().strip()
            assert badge_text == "SGR - PLASTIC", f"Badge text should be 'SGR - PLASTIC', got '{badge_text}'"
            safe_print("[PASS] SGR Badge is displayed correctly in ProductTable.")

            # Open Edit Modal
            page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("button[title='Editează produs']").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="visible", timeout=5000)

            # Verify selector shows plastic
            modal_sgr_selector = page.locator("form [data-testid='product-sgr-selector']")
            modal_sgr_selector.wait_for(state="visible", timeout=5000)
            modal_sgr_val = modal_sgr_selector.evaluate("el => el.value")
            assert modal_sgr_val == 'plastic', f"Modal SGR selector should show 'plastic', got '{modal_sgr_val}'"

            # Change to SGR - METAL
            safe_print("Updating SGR to METAL in Edit Modal...")
            modal_sgr_selector.select_option("metal")
            page.wait_for_timeout(500)
            page.locator("button[type='submit']:has-text('Actualizare Nomenclator')").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="detached", timeout=5000)
            safe_print("Product saved in edit modal.")

            # Verify updated badge in table
            sgr_badge_updated = page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("[data-testid='product-sgr-badge']")
            sgr_badge_updated.wait_for(state="visible", timeout=5000)
            badge_text_updated = sgr_badge_updated.inner_text().strip()
            assert badge_text_updated == "SGR - METAL", f"Badge text should be 'SGR - METAL', got '{badge_text_updated}'"
            
            # Verify in DB
            db_product_updated = page.evaluate("""async () => {
                const { data } = await window.supabase
                    .from('products')
                    .select('*')
                    .eq('barcode', 'E2E_SGR_TEST_123')
                    .neq('status', 'deleted')
                    .maybeSingle();
                return data;
            }""")
            assert db_product_updated.get('sgr_enabled') is True
            assert db_product_updated.get('sgr_type') == 'metal'
            safe_print("[PASS] Product updated to METAL successfully.")

            # E. Dezactivare SGR
            safe_print("\n5. Disabling SGR in Edit Modal...")
            page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("button[title='Editează produs']").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="visible", timeout=5000)
            
            modal_sgr_selector = page.locator("form [data-testid='product-sgr-selector']")
            modal_sgr_selector.select_option("none")
            page.wait_for_timeout(500)
            page.locator("button[type='submit']:has-text('Actualizare Nomenclator')").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="detached", timeout=5000)

            # Verify badge is gone
            search_input.fill("")
            page.wait_for_timeout(500)
            search_input.fill("SGR_E2E_TEST_PRODUCT")
            page.wait_for_timeout(1000)
            badge_count = page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("[data-testid='product-sgr-badge']").count()
            assert badge_count == 0, f"SGR badge should be gone, found {badge_count}"

            # Verify in DB
            db_product_disabled = page.evaluate("""async () => {
                const { data } = await window.supabase
                    .from('products')
                    .select('*')
                    .eq('barcode', 'E2E_SGR_TEST_123')
                    .neq('status', 'deleted')
                    .maybeSingle();
                return data;
            }""")
            assert db_product_disabled.get('sgr_enabled') is False
            assert db_product_disabled.get('sgr_type') is None
            safe_print("[PASS] SGR disabled successfully.")

            # F. Produs cu loturi reale
            safe_print("\n6. Verifying SGR on batch-managed product...")
            search_input.fill("")
            page.wait_for_timeout(500)
            search_input.fill("SGR_E2E_TEST_PRODUCT")
            page.wait_for_timeout(1000)
            page.locator("tr", has_text="SGR_E2E_TEST_PRODUCT").locator("button[title='Editează produs']").click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="visible", timeout=5000)

            stoc_depozit_input = page.locator("label:has-text('Stoc Depozit') + input")
            stoc_magazin_input = page.locator("label:has-text('Stoc Magazin') + input")
            
            assert stoc_depozit_input.is_disabled(), "Stoc Depozit input should be disabled for real-batch product!"
            assert stoc_magazin_input.is_disabled(), "Stoc Magazin input should be disabled for real-batch product!"
            
            modal_sgr_selector = page.locator("form [data-testid='product-sgr-selector']")
            assert not modal_sgr_selector.is_disabled(), "SGR Selector should be enabled even on batch-managed products!"
            safe_print("[PASS] SGR Selector is editable on batch-managed products while stock is locked.")
            
            # Close Modal
            page.locator("button", has=page.locator("svg.lucide-x")).click()
            page.locator("h2:has-text('Parametri Produs')").wait_for(state="detached", timeout=5000)

            # G. Cleanup
            safe_print("\n7. Cleaning up test data...")
            page.evaluate("""async () => {
                await window.supabase
                    .from('products')
                    .delete()
                    .eq('barcode', 'E2E_SGR_TEST_123');
            }""")
            safe_print("[PASS] Cleanup complete.")

        except Exception as e:
            safe_print("[FAIL] Exception occurred during test run!")
            page.screenshot(path="screenshot_error_sgr_6d63.png", full_page=True)
            safe_print("[DEBUG] Screenshot saved to screenshot_error_sgr_6d63.png")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] SGR Product Forms E2E Test 6D.6.3 passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
