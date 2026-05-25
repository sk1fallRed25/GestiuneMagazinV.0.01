import sys
import time
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_test():
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(service_workers="block")
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)

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
        page.locator("h1:has-text('Dashboard')").wait_for(state="visible", timeout=30000)
        safe_print("[PASS] Logged in successfully.")

        # Switch to Magazin Principal to be absolutely certain
        safe_print("Checking active store...")
        switcher = page.locator("button[aria-label*='context']")
        if switcher.is_visible():
            current_store_text = switcher.inner_text()
            if "Magazin Principal" not in current_store_text:
                safe_print(f"Switching from '{current_store_text}' to 'Magazin Principal'...")
                switcher.click()
                page.wait_for_timeout(500)
                page.locator("button:has-text('Magazin Principal')").click()
                page.wait_for_timeout(2000)
            else:
                safe_print("Already on Magazin Principal.")
        else:
            safe_print("Switcher is not interactive (single store or static context).")

        # Ensure active shift is open via database RPC check
        safe_print("\n2. Ensuring active shift is open...")
        shift_status = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No user logged in' };
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            if (!stores || stores.length === 0) return { success: false, error: 'Store not found' };
            const storeId = stores[0].id;
            const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                p_store_id: storeId,
                p_profile_id: user.id
            });
            if (!shift || !shift.shift_id) {
                const { data: registers } = await supabase.from('cash_registers').select('id').eq('store_id', storeId).limit(1);
                if (!registers || registers.length === 0) return { success: false, error: 'No cash register' };
                const { data: openShift, error } = await supabase.rpc('open_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: user.id,
                    p_cash_register_id: registers[0].id,
                    p_opening_cash: 100.00,
                    p_notes: 'E2E Mixed Payment Test Shift'
                });
                if (error) return { success: false, error: error.message };
                return { success: true, opened: true, shift: openShift };
            }
            return { success: true, opened: false, shift };
        }""")
        safe_print(f"[DEBUG] Shift check status: {shift_status}")
        if not shift_status.get('success'):
            raise Exception(f"Failed to ensure open shift: {shift_status.get('error')}")
        safe_print("[PASS] Shift is open.")

        # Navigate to POS
        safe_print("\n3. Navigating to POS page...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        
        # Wait for search input to be visible and page to settle
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(2000)

        # Clear cart if any items are there
        trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
        while trash_btn.is_visible():
            trash_btn.click()
            page.wait_for_timeout(500)

        # Add OTET 1L to cart once
        safe_print("Searching for OTET 1L...")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        
        product_btn = page.locator("button:has-text('OTET 1L')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        page.wait_for_timeout(500)
        
        # Click the plus button in the cart 19 times
        safe_print("Incrementing quantity to 20 in cart using + button...")
        plus_btn = page.locator("button", has=page.locator("svg.lucide-plus")).first
        for i in range(19):
            plus_btn.click()
            page.wait_for_timeout(100)

        # Extract Total
        total_text = page.locator("span.text-5xl").inner_text()
        safe_print(f"Total Text extracted: {total_text}")
        match = re.search(r"([\d.]+)", total_text)
        if not match:
            raise Exception(f"Could not extract numeric total from: {total_text}")
        total_val = float(match.group(1))
        safe_print(f"Total numeric value: {total_val}")

        # Choose MIXT payment method
        safe_print("Clicking MIXT payment method...")
        page.locator("button:has-text('MIXT')").click()
        page.wait_for_timeout(1000)

        cash_input = page.locator("label:has-text('SUMĂ CASH')").locator("..").locator("input")
        card_input = page.locator("label:has-text('SUMĂ CARD')").locator("..").locator("input")

        # Verify initial values
        cash_val = cash_input.input_value()
        card_val = card_input.input_value()
        safe_print(f"Initial cash value: '{cash_val}', card value: '{card_val}'")
        # Sum should match total
        assert abs((float(cash_val) + float(card_val)) - total_val) < 0.01, "Initial cash + card does not equal total"

        # TEST 1: Modifying CASH auto-balances CARD
        new_cash_input = "1.50"
        expected_card = f"{total_val - 1.50:.2f}"
        safe_print(f"\nTEST 1: Filling CASH with '{new_cash_input}'...")
        cash_input.fill(new_cash_input)
        page.wait_for_timeout(300)
        # Blur the cash input to ensure autobalance and formatting
        cash_input.blur()
        page.wait_for_timeout(500)

        current_cash = cash_input.input_value()
        current_card = card_input.input_value()
        safe_print(f"After CASH edit -> CASH: '{current_cash}', CARD: '{current_card}'")
        assert current_cash == "1.50", f"CASH value should be '1.50', got '{current_cash}'"
        assert current_card == expected_card, f"CARD value should be '{expected_card}', got '{current_card}'"
        safe_print("[PASS] Test 1: Modifying CASH auto-balances CARD.")

        # TEST 2: Modifying CARD auto-balances CASH
        new_card_input = "2.00"
        expected_cash = f"{total_val - 2.00:.2f}"
        safe_print(f"\nTEST 2: Filling CARD with '{new_card_input}'...")
        card_input.fill(new_card_input)
        page.wait_for_timeout(300)
        # Blur the card input
        card_input.blur()
        page.wait_for_timeout(500)

        current_cash = cash_input.input_value()
        current_card = card_input.input_value()
        safe_print(f"After CARD edit -> CASH: '{current_cash}', CARD: '{current_card}'")
        assert current_card == "2.00", f"CARD value should be '2.00', got '{current_card}'"
        assert current_cash == expected_cash, f"CASH value should be '{expected_cash}', got '{current_cash}'"
        safe_print("[PASS] Test 2: Modifying CARD auto-balances CASH.")

        # TEST 2B: Filling CASH over total limits it and makes CARD 0
        safe_print(f"\nTEST 2B: Filling CASH with '{total_val + 1.00:.2f}' (over total)...")
        cash_input.fill(f"{total_val + 1.00:.2f}")
        page.wait_for_timeout(300)
        cash_input.blur()
        page.wait_for_timeout(500)
        
        current_cash = cash_input.input_value()
        current_card = card_input.input_value()
        safe_print(f"After CASH over total edit -> CASH: '{current_cash}', CARD: '{current_card}'")
        assert current_cash == f"{total_val:.2f}", f"CASH value should be capped at total '{total_val:.2f}', got '{current_cash}'"
        assert current_card == "0.00", f"CARD value should balance to '0.00', got '{current_card}'"
        safe_print("[PASS] Test 2B: Over total input limits the value and balances the other field to 0.")

        # Re-establish card preference to 2.00 to keep the rest of the test identical
        safe_print("\nRe-establishing CARD to 2.00 for Test 3...")
        card_input.fill("2.00")
        page.wait_for_timeout(300)
        card_input.blur()
        page.wait_for_timeout(500)

        # TEST 3: Cart total changes (adding another item) retains last-edited preference (which was CARD)
        safe_print("\nTEST 3: Adding 21st OTET 1L to cart...")
        plus_btn.click()
        page.wait_for_timeout(1000)

        # Get new total
        new_total_text = page.locator("span.text-5xl").inner_text()
        new_match = re.search(r"([\d.]+)", new_total_text)
        new_total_val = float(new_match.group(1))
        safe_print(f"New total value: {new_total_val}")

        # Since CARD was edited last (Test 2), CARD should remain at 2.00, and CASH should adjust
        expected_cash_updated = f"{new_total_val - 2.00:.2f}"
        updated_cash = cash_input.input_value()
        updated_card = card_input.input_value()
        safe_print(f"After cart update -> CASH: '{updated_cash}', CARD: '{updated_card}'")
        assert updated_card == "2.00", f"CARD value should remain '2.00', got '{updated_card}'"
        assert updated_cash == expected_cash_updated, f"CASH value should balance to '{expected_cash_updated}', got '{updated_cash}'"
        safe_print("[PASS] Test 3: Cart total change respects last-edited field preference.")

        # TEST 4: Finalize Sale
        safe_print("\nTEST 4: Finalizing sale with auto-balanced payments...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.wait_for_timeout(2000)

        # Check if cart is reset (total is 0)
        final_total_text = page.locator("span.text-5xl").inner_text()
        final_match = re.search(r"([\d.]+)", final_total_text)
        final_val = float(final_match.group(1)) if final_match else 0.0
        safe_print(f"Final cart total: {final_val}")
        assert final_val == 0.0, "Cart was not emptied after finalize sale"
        safe_print("[PASS] Test 4: Sale finalized successfully, cart reset.")

        # Verify sale in database via page.evaluate
        safe_print("\n5. Verifying sale record in database...")
        db_sale = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: sales, error } = await supabase.from('sales')
                .select('*, payments(*)')
                .order('created_at', { ascending: false })
                .limit(1);
            if (error) return { error: error.message };
            return sales[0];
        }""")
        safe_print(f"[DEBUG] Database sale: {db_sale}")
        assert db_sale is not None, "No sale found in database"
        assert db_sale['payment_method'] == 'mixed', f"Sale payment method should be 'mixed', got {db_sale['payment_method']}"
        payments = db_sale['payments']
        assert len(payments) == 2, f"Sale should have exactly 2 payments, got {len(payments)}"
        
        cash_payment = next((p for p in payments if p['method'] == 'cash'), None)
        card_payment = next((p for p in payments if p['method'] == 'card'), None)
        
        assert cash_payment is not None, "Cash payment record not found"
        assert card_payment is not None, "Card payment record not found"
        
        safe_print(f"DB Payments: CASH={cash_payment['amount']}, CARD={card_payment['amount']}")
        assert float(card_payment['amount']) == 2.00, f"DB CARD payment amount should be 2.00, got {card_payment['amount']}"
        assert abs(float(cash_payment['amount']) - (new_total_val - 2.00)) < 0.01, f"DB CASH payment amount should be {new_total_val - 2.00}, got {cash_payment['amount']}"
        safe_print("[PASS] Database sale and payments verified successfully.")

        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] E2E test for POS Mixed Payment Auto-Balance passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e)
        safe_print(f"\n[FAIL] Test failed: {err_str}")
        sys.exit(1)
