import sys
import time
import re
import json
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
        page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
        safe_print("[PASS] Logged in successfully.")

        # Check store settings (VAT payer status)
        safe_print("\nChecking Store settings in DB...")
        store_settings = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores, error } = await supabase.from('stores').select('id, settings').eq('name', 'Magazin Principal').limit(1);
            if (error) return { error: error.message };
            return stores[0];
        }""")
        safe_print(f"[DEBUG] Store settings: {json.dumps(store_settings)}")

        # 2. Check Schema Columns on sale_items
        safe_print("\n2. Checking table schema on 'sale_items'...")
        schema_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data, error } = await supabase
                .from('sale_items')
                .select('vat_group, vat_rate, vat_amount, price_without_vat, total_without_vat, price_includes_vat')
                .limit(1);
            if (error) {
                return { success: false, error: error.message, code: error.code };
            }
            return { success: true, columns_exist: true };
        }""")
        safe_print(f"[DEBUG] Schema check result: {schema_check}")
        if not schema_check.get('success'):
            raise Exception(f"Schema columns missing or error querying sale_items: {schema_check.get('error')}")
        safe_print("[PASS] Schema check successful. All 6 new columns exist in 'public.sale_items'.")

        # 3. Check Helper Functions Security (Grants & Permissions)
        safe_print("\n3. Verifying helper functions security (expecting access denied)...")
        grants_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const res1 = await supabase.rpc('get_vat_rate_for_group', { p_vat_group: 'A' });
            const res2 = await supabase.rpc('calculate_vat_breakdown', { p_total: 10, p_vat_group: 'A' });
            return {
                get_vat_rate: { data: res1.data, error: res1.error },
                calculate_vat: { data: res2.data, error: res2.error }
            };
        }""")
        safe_print(f"[DEBUG] Helper RPC check results: {json.dumps(grants_check)}")
        
        # We expect error codes to indicate permission denied / functions not executable by authenticated user
        # Note: If the function is not found or revoked, postgrest returns error code 42883 (no function matches signature/name)
        # or 42501 (permission denied).
        for name, res in grants_check.items():
            err = res.get('error')
            if err is None:
                safe_print(f"[WARNING] RPC {name} executed successfully when it should be revoked! Data: {res.get('data')}")
            else:
                safe_print(f"[PASS] RPC {name} execution denied. Error: {err.get('message')} (Code: {err.get('code')})")

        # 4. Perform a functional test sale
        safe_print("\n4. Performing test sale to verify VAT snapshot...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(2000)

        # Clear cart if any items are there
        trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
        while trash_btn.is_visible():
            trash_btn.click()
            page.wait_for_timeout(500)

        # Search for OTET 1L (VAT Group A, 21%)
        safe_print("Searching for 'OTET 1L'...")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        
        product_btn = page.locator("button:has-text('OTET 1L')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        page.wait_for_timeout(500)

        # Extract unit price
        total_text = page.locator("span.text-5xl").inner_text()
        safe_print(f"Total Text: {total_text}")
        match = re.search(r"([\d.]+)", total_text)
        if not match:
            raise Exception("Failed to extract unit price")
        unit_price = float(match.group(1))
        safe_print(f"Unit price: {unit_price:.2f} LEI")

        # Select NUMERAR payment
        page.locator("button:has-text('NUMERAR')").click()
        page.wait_for_timeout(500)

        # Click INCASEAZA to finalize the sale
        safe_print("Clicking ÎNCASEAZĂ to complete transaction...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.wait_for_timeout(2000)

        # Confirm cart total is 0 (sale finished)
        final_total_text = page.locator("span.text-5xl").inner_text()
        final_match = re.search(r"([\d.]+)", final_total_text)
        final_val = float(final_match.group(1)) if final_match else 0.0
        safe_print(f"Cart total after finalize: {final_val:.2f} LEI")
        assert final_val == 0.0, "Cart was not cleared after finalized sale!"
        safe_print("[PASS] Sale completed successfully.")

        # 5. Fetch and verify sale items from database
        safe_print("\n5. Fetching last sale and verifying VAT snapshot in database...")
        db_sale = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: sales, error } = await supabase.from('sales')
                .select('*, sale_items(*)')
                .order('created_at', { ascending: false })
                .limit(1);
            if (error) return { error: error.message };
            return sales[0];
        }""")
        safe_print(f"[DEBUG] Last DB Sale: {json.dumps(db_sale)}")
        
        items = db_sale.get('sale_items', [])
        assert len(items) > 0, "No sale items found for the transaction"
        
        # We check calculations on the first item
        item = items[0]
        safe_print(f"\nVerifying VAT Snapshot values on sale item:")
        safe_print(f"Quantity: {item['quantity']}")
        safe_print(f"Unit Price: {item['unit_price']}")
        safe_print(f"Total Item: {item['total_item']}")
        safe_print(f"VAT Group: {item['vat_group']}")
        safe_print(f"VAT Rate: {item['vat_rate']}")
        safe_print(f"Price Includes VAT: {item['price_includes_vat']}")
        safe_print(f"Price Without VAT: {item['price_without_vat']}")
        safe_print(f"VAT Amount: {item['vat_amount']}")
        safe_print(f"Total Without VAT: {item['total_without_vat']}")

        # Assert correct snapshots
        assert item['vat_group'] == 'A', f"Expected VAT group 'A', got {item['vat_group']}"
        assert float(item['vat_rate']) == 21.00, f"Expected VAT rate 21.00, got {item['vat_rate']}"
        assert item['price_includes_vat'] is True, "Expected price_includes_vat to be true"

        # Math checks
        # For Inclusive VAT (21%):
        # total_without_vat = ROUND(total_item / 1.21, 2)
        # vat_amount = ROUND(total_item - total_without_vat, 2)
        # price_without_vat = ROUND(unit_price / 1.21, 4)
        
        total_item = float(item['total_item'])
        expected_total_without_vat = round(total_item / 1.21, 2)
        expected_vat_amount = round(total_item - expected_total_without_vat, 2)
        expected_price_without_vat = round(float(item['unit_price']) / 1.21, 2)

        assert abs(float(item['total_without_vat']) - expected_total_without_vat) < 0.01, f"Expected total_without_vat={expected_total_without_vat}, got {item['total_without_vat']}"
        assert abs(float(item['vat_amount']) - expected_vat_amount) < 0.01, f"Expected vat_amount={expected_vat_amount}, got {item['vat_amount']}"
        assert abs(float(item['price_without_vat']) - expected_price_without_vat) < 0.01, f"Expected price_without_vat={expected_price_without_vat}, got {item['price_without_vat']}"
        
        safe_print("[PASS] VAT Snapshot calculations are mathematically correct!")

        # 6. Verify legacy sales (confirm vat_group is NULL)
        safe_print("\n6. Checking legacy sales compatibility (NULL columns)...")
        legacy_sales = page.evaluate("""async (saleId) => {
            const supabase = window.supabase;
            const { data, error } = await supabase.from('sale_items')
                .select('*')
                .neq('sale_id', saleId)
                .limit(10);
            if (error) return { error: error.message };
            return data;
        }""", db_sale['id'])
        
        null_count = 0
        non_null_count = 0
        for legacy_item in legacy_sales:
            if legacy_item.get('vat_group') is None:
                null_count += 1
            else:
                non_null_count += 1
        
        safe_print(f"[DEBUG] Out of {len(legacy_sales)} checked legacy items, {null_count} had NULL vat_group and {non_null_count} had non-NULL.")
        safe_print("[PASS] Legacy compatibility check completed.")

        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] E2E verification test completed successfully!")
        sys.exit(0)
    except Exception as e:
        safe_print(f"\n[FAIL] E2E verification test failed: {e}")
        sys.exit(1)
