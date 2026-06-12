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
    safe_print("RUNNING STATIC CHECKS FOR PRODUCT SEARCH DROPDOWN FIX (6REC.1.1)")
    safe_print("======================================================================\n")

    picker_path = os.path.join("src", "features", "reception", "components", "ReceptionProductPicker.tsx")
    assert os.path.exists(picker_path), "ReceptionProductPicker.tsx does not exist"

    with open(picker_path, "r", encoding="utf-8") as f:
        picker_content = f.read()

    # Verify that the testids are present
    assert 'data-testid="reception-product-search"' in picker_content, "Missing reception-product-search testid"
    assert 'data-testid="reception-product-search-dropdown"' in picker_content, "Missing reception-product-search-dropdown testid"
    assert 'data-testid="reception-product-search-option"' in picker_content, "Missing reception-product-search-option testid"
    assert 'data-testid="reception-selected-product-card"' in picker_content, "Missing reception-selected-product-card testid"
    assert 'data-testid="reception-item-quantity"' in picker_content, "Missing reception-item-quantity testid"
    assert 'data-testid="reception-item-purchase-price"' in picker_content, "Missing reception-item-purchase-price testid"
    assert 'data-testid="reception-item-sale-price"' in picker_content, "Missing reception-item-sale-price testid"
    assert 'data-testid="reception-add-line-button"' in picker_content, "Missing reception-add-line-button testid"

    # Verify dropdown state triggers
    assert 'isOpen' in picker_content, "Dropdown visibility logic missing"
    assert 'quantityInputRef.current?.focus()' in picker_content, "Focus redirection to quantity input is missing"
    
    safe_print("PASS: Static checks on testids and dropdown behavior verified.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR PRODUCT SEARCH DROPDOWN FIX (6REC.1.1)")
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

            # 3. Search for product and verify dropdown appears
            safe_print("\nStep 3: Searching for existing product...")
            search_input = page.locator('[data-testid="reception-product-search"]')
            search_input.fill("Paine")
            
            # Wait for dropdown to become visible
            dropdown = page.locator('[data-testid="reception-product-search-dropdown"]')
            dropdown.wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Dropdown appeared successfully.")

            # 4. Click option and verify dropdown closes, selected card appears, focus is on quantity
            safe_print("\nStep 4: Selecting product from dropdown...")
            option = page.locator('[data-testid="reception-product-search-option"]').first
            option_text = option.inner_text()
            safe_print(f"Clicking option: {option_text.splitlines()[0]}")
            option.click()

            # Verify dropdown disappears
            dropdown.wait_for(state="hidden", timeout=3000)
            safe_print("[PASS] Dropdown disappeared immediately after selection.")

            # Verify selected product card appears
            selected_card = page.locator('[data-testid="reception-selected-product-card"]')
            selected_card.wait_for(state="visible", timeout=3000)
            assert "Paine" in selected_card.inner_text(), "Selected card does not contain the product name"
            safe_print("[PASS] Selected product card is visible and displays product info.")

            # Verify focus is on quantity input
            quantity_input = page.locator('[data-testid="reception-item-quantity"]')
            # Wait for focus to be transferred (since it runs via setTimeout in UI)
            page.wait_for_timeout(300)
            # Playwright check for focused element
            active_info = page.evaluate("({ tagName: document.activeElement.tagName, id: document.activeElement.id, testId: document.activeElement.getAttribute('data-testid'), className: document.activeElement.className })")
            safe_print(f"DEBUG: Active element is {active_info}")
            is_focused = page.evaluate("document.activeElement === document.querySelector('[data-testid=\"reception-item-quantity\"]')")
            assert is_focused, "Quantity input is not focused after product selection"
            safe_print("[PASS] Focus successfully moved to the quantity input.")

            # 5. Fill fields and add line
            safe_print("\nStep 5: Completing line fields and adding line...")
            quantity_input.fill("10")
            
            purchase_price_input = page.locator('[data-testid="reception-item-purchase-price"]')
            purchase_price_input.fill("20.00")
            
            # Click add line
            add_button = page.locator('[data-testid="reception-add-line-button"]')
            add_button.click()
            page.wait_for_timeout(1000)

            # Verify product is in the reception lines list and no dropdown remains on screen
            assert page.locator("text=Paine 300GR").is_visible(), "Product was not added to the lines table"
            assert not page.locator('[data-testid="reception-product-search-dropdown"]').is_visible(), "Dropdown is still visible"
            safe_print("[PASS] Line added successfully and search dropdown is closed.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                safe_print(f"Current URL: {page.url}")
            except Exception:
                pass
            page.screenshot(path="screenshot_reception_product_search_dropdown_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL PRODUCT SEARCH DROPDOWN E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
