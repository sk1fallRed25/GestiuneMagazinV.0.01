import sys
import os
import subprocess
import random

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR NIR CALCULATIONS & PRICE SAFETY (6REC.1.2)")
    safe_print("======================================================================\n")

    picker_path = os.path.join("src", "features", "reception", "components", "ReceptionProductPicker.tsx")
    assert os.path.exists(picker_path), "ReceptionProductPicker.tsx does not exist"

    with open(picker_path, "r", encoding="utf-8") as f:
        picker_content = f.read()

    # Verify that the testids are present
    assert 'data-testid="reception-invoice-quantity"' in picker_content, "Missing reception-invoice-quantity testid"
    assert 'data-testid="reception-received-quantity"' in picker_content, "Missing reception-received-quantity testid"
    assert 'data-testid="reception-unit-purchase-price"' in picker_content, "Missing reception-unit-purchase-price testid"
    assert 'data-testid="reception-line-net-value"' in picker_content, "Missing reception-line-net-value testid"
    assert 'data-testid="reception-vat-percent"' in picker_content, "Missing reception-vat-percent testid"
    assert 'data-testid="reception-vat-value"' in picker_content, "Missing reception-vat-value testid"
    assert 'data-testid="reception-line-gross-value"' in picker_content, "Missing reception-line-gross-value testid"
    assert 'data-testid="reception-unit-cost-calculation"' in picker_content, "Missing reception-unit-cost-calculation testid"
    
    assert 'data-testid="reception-quantity-difference"' in picker_content, "Missing reception-quantity-difference testid"
    assert 'data-testid="reception-no-difference-badge"' in picker_content, "Missing reception-no-difference-badge testid"
    
    assert 'data-testid="reception-keep-current-price-option"' in picker_content, "Missing reception-keep-current-price-option testid"
    assert 'data-testid="reception-apply-proposed-price-option"' in picker_content, "Missing reception-apply-proposed-price-option testid"
    assert 'data-testid="reception-manual-sale-price-input"' in picker_content, "Missing reception-manual-sale-price-input testid"
    assert 'data-testid="reception-price-difference-warning"' in picker_content, "Missing reception-price-difference-warning testid"

    safe_print("PASS: Static checks on testids and warnings verified.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR NIR CALCULATIONS & PRICE SAFETY (6REC.1.2)")
    safe_print("======================================================================\n")

    port = "5173"
    for p in ["5176", "5174", "5175", "5173"]:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect(("127.0.0.1", int(p)))
            s.close()
            port = p
            break
        except Exception:
            pass

    app_url = f"http://127.0.0.1:{port}"
    safe_print(f"Connecting to app at {app_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        try:
            # 1. Login
            safe_print("Step 1: Logging in...")
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("Login successful.")
            page.wait_for_timeout(1000)

            # Ensure active store is Magazin Principal
            try:
                store_btn = page.locator("#store-context-switcher-btn")
                store_btn.wait_for(state="visible", timeout=15000)
                current_store_text = store_btn.locator("p.truncate").first.inner_text()
                if "Magazin Principal" not in current_store_text:
                    safe_print(f"Switching store to 'Magazin Principal'...")
                    page.on("dialog", lambda dialog: dialog.accept())
                    store_btn.click()
                    page.locator("button:has-text('Magazin Principal')").first.click()
                    page.wait_for_timeout(2000)
            except Exception as e:
                safe_print(f"Could not switch store: {e}")

            # 2. Go to Goods Reception
            safe_print("\nStep 2: Accessing Goods Reception...")
            page.goto(f"{app_url}/#/receptie")
            page.locator('[data-testid="reception-page"]').wait_for(state="visible", timeout=10000)
            safe_print("Goods Reception page loaded.")

            # Fill in dummy document info to enable adding line/saving draft
            page.locator('[data-testid="reception-invoice-number-input"]').fill("INV-6REC12-TEST")
            page.locator('[data-testid="reception-supplier-select"]').fill("Furnizor Test E2E")

            # 3. Search and select product
            safe_print("\nStep 3: Searching and selecting Paine 300GR...")
            search_input = page.locator('[data-testid="reception-product-search"]')
            search_input.fill("Paine")
            
            dropdown = page.locator('[data-testid="reception-product-search-dropdown"]')
            dropdown.wait_for(state="visible", timeout=5000)
            
            option = page.locator('[data-testid="reception-product-search-option"]').first
            option.click()
            
            dropdown.wait_for(state="hidden", timeout=3000)
            safe_print("[PASS] Dropdown closed successfully.")

            # Verify product card is visible
            selected_card = page.locator('[data-testid="reception-selected-product-card"]')
            selected_card.wait_for(state="visible", timeout=3000)
            assert "Paine" in selected_card.inner_text()
            safe_print("[PASS] Product card is visible.")

            # 4. Fill calculations and verify unit cost
            safe_print("\nStep 4: Filling quantities and invoice values...")
            
            invoice_qty = page.locator('[data-testid="reception-invoice-quantity"]')
            received_qty = page.locator('[data-testid="reception-received-quantity"]')
            line_net_val = page.locator('[data-testid="reception-line-net-value"]')
            vat_pct_select = page.locator('[data-testid="reception-vat-percent"]')
            
            invoice_qty.fill("12")
            received_qty.fill("12")
            line_net_val.fill("4.56")
            
            # Select 19% VAT
            vat_pct_select.select_option("19")
            page.wait_for_timeout(300)

            # Check purchase price unit calculation: 4.56 / 12 = 0.38
            unit_price_input = page.locator('[data-testid="reception-unit-purchase-price"]')
            unit_price_val = unit_price_input.input_value()
            assert abs(float(unit_price_val) - 0.3800) < 0.001, f"Expected unit cost 0.3800, got {unit_price_val}"
            safe_print(f"[PASS] Unit cost calculated correctly: {unit_price_val}")

            # Verify VAT and Gross calculations
            vat_value_el = page.locator('[data-testid="reception-vat-value"]')
            gross_value_el = page.locator('[data-testid="reception-line-gross-value"]')
            
            # 4.56 * 0.19 = 0.8664 -> 0.87
            vat_val_text = vat_value_el.inner_text()
            assert "0.87" in vat_val_text, f"Expected VAT 0.87, got {vat_val_text}"
            
            # 4.56 + 0.87 = 5.43
            gross_val_text = gross_value_el.inner_text()
            assert "5.43" in gross_val_text, f"Expected Gross 5.43, got {gross_val_text}"
            safe_print("[PASS] VAT and Gross values calculated correctly.")

            # Verify unit cost calculation formula display text
            calc_text_el = page.locator('[data-testid="reception-unit-cost-calculation"]')
            calc_text = calc_text_el.inner_text()
            assert "4.56" in calc_text and "12" in calc_text and "0.3800" in calc_text
            safe_print(f"[PASS] Cost unitar calculation text: {calc_text}")

            # Verify difference is 0 and Fara diferente badge is visible
            diff_el = page.locator('[data-testid="reception-quantity-difference"]')
            assert "0" in diff_el.inner_text()
            page.locator('[data-testid="reception-no-difference-badge"]').wait_for(state="visible", timeout=2000)
            safe_print("[PASS] Quantity difference is 0 and no-difference badge is visible.")

            # 5. Verify prices and price warning
            safe_print("\nStep 5: Checking price options and safety warning...")
            
            # Check warning appears (proposed price is ~0.59 vs current price ~4.00)
            page.locator('[data-testid="reception-price-difference-warning"]').wait_for(state="visible", timeout=3000)
            safe_print("[PASS] Price difference safety warning is displayed.")

            # Choose "Keep Current Price"
            keep_current_price = page.locator('[data-testid="reception-keep-current-price-option"]')
            keep_current_price.click()
            page.wait_for_timeout(300)

            # 6. Add line and check it appears in draft table
            safe_print("\nStep 6: Adding line to draft...")
            page.locator('[data-testid="reception-add-line-button"]').click()
            page.wait_for_timeout(1000)

            # Check product is in table
            draft_table = page.locator("table")
            draft_table.wait_for(state="visible", timeout=3000)
            assert page.locator("text=Paine 300GR").is_visible(), "Product was not added to the draft table"
            assert page.locator("text=Facturat: 12").is_visible(), "Invoice quantity not shown in draft table"
            assert page.locator("text=Recepționat: 12").is_visible(), "Received quantity not shown in draft table"
            safe_print("[PASS] Line added and verified in draft table.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                safe_print(f"Current URL: {page.url}")
            except Exception:
                pass
            page.screenshot(path="screenshot_reception_nir_calculation_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL NIR CALCULATIONS & PRICE SAFETY E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
