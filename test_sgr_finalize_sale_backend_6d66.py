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
            page.locator("h1:has-text('Dashboard')").wait_for(state="visible", timeout=30000)
            safe_print("[PASS] Logged in successfully.")

            # 2. Seeding Test Data (Product and Stock Batch)
            safe_print("\n2. Seeding test product with SGR enabled...")
            seeding_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                // Get active store_id
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                // Get current profile
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user logged in');
                
                // Generate a unique barcode to prevent conflicts
                const barcode = 'E2E_SGR_B_' + Math.floor(Math.random() * 100000000);
                
                // Insert SGR Product (sgr_enabled=true, type=plastic)
                const { data: product, error: errProd } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PRODUS_SGR_BACKEND_' + barcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: true,
                    sgr_type: 'plastic'
                }).select().single();
                if (errProd) throw errProd;
                
                // Add price (10.00 RON)
                const { error: errPrice } = await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: product.id,
                    price_sale: 10.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                if (errPrice) throw errPrice;
                
                // Add stock (10 units)
                const { data: batch, error: errBatch } = await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: product.id,
                    zone: 'magazin',
                    quantity: 10,
                    batch_number: 'LOT_SGR_BACKEND_E2E'
                }).select().single();
                if (errBatch) throw errBatch;
                
                // Retrieve or open active shift
                let shiftId = null;
                const { data: activeShift } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: user.id
                });
                
                if (activeShift && activeShift.shift_id) {
                    shiftId = activeShift.shift_id;
                } else {
                    const { data: registers } = await supabase.from('cash_registers').select('id').eq('store_id', storeId).limit(1);
                    if (!registers || registers.length === 0) throw new Error('No cash register found');
                    
                    const { data: newShift, error: errOpen } = await supabase.rpc('open_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: user.id,
                        p_cash_register_id: registers[0].id,
                        p_opening_cash: 100.00,
                        p_notes: 'SGR Backend Test Shift'
                    });
                    if (errOpen) throw errOpen;
                    shiftId = newShift.shift_id;
                }
                
                return { success: true, storeId, profileId: user.id, productId: product.id, shiftId };
            }""")
            safe_print(f"[PASS] Seeding completed: {seeding_res}")
            
            store_id = seeding_res['storeId']
            profile_id = seeding_res['profileId']
            product_id = seeding_res['productId']
            shift_id = seeding_res['shiftId']

            # 3. Test Positive Checkout RPC (finalize_sale)
            safe_print("\n3. Testing positive finalize_sale RPC call...")
            test_pos_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                const items = [{{
                    product_id: "{product_id}",
                    quantity: 1
                }}];
                
                // Payments total must equal 10.50 (10.00 product + 0.50 SGR)
                const payments = [{{
                    method: "cash",
                    amount: 10.50
                }}];
                
                const {{ data, error }} = await supabase.rpc('finalize_sale', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_items: items,
                    p_payments: payments,
                    p_shift_id: "{shift_id}"
                }});
                
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, sale_id: data.sale_id, total: data.total }};
            }}""")
            
            safe_print(f"Positive RPC Response: {test_pos_res}")
            assert test_pos_res['success'], f"Positive RPC failed: {test_pos_res.get('error')}"
            sale_id = test_pos_res['sale_id']
            assert abs(float(test_pos_res['total']) - 10.50) < 0.01, f"Expected total 10.50, got {test_pos_res['total']}"
            safe_print("[PASS] finalize_sale RPC completed successfully for SGR product.")

            # 4. Verify Database Records
            safe_print("\n4. Verifying database records...")
            db_records = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data: sales, error }} = await supabase.from('sales')
                    .select('*, payments(*), sale_items(*)')
                    .eq('id', "{sale_id}")
                    .single();
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, sale: sales }};
            }}""")
            
            assert db_records['success'], f"Failed to fetch sale from DB: {db_records.get('error')}"
            sale = db_records['sale']
            
            # Check sales total
            assert abs(float(sale['total']) - 10.50) < 0.01, f"Expected sales.total to be 10.50, got {sale['total']}"
            
            # Check payments
            assert len(sale['payments']) == 1, "Expected 1 payment record"
            pay_rec = sale['payments'][0]
            assert abs(float(pay_rec['amount']) - 10.50) < 0.01, f"Expected payment amount 10.50, got {pay_rec['amount']}"
            
            # Check sale_items SGR snapshot fields
            assert len(sale['sale_items']) == 1, "Expected 1 sale_item record"
            item_rec = sale['sale_items'][0]
            assert item_rec['sgr_enabled'] == True, f"Expected sgr_enabled to be true, got {item_rec['sgr_enabled']}"
            assert item_rec['sgr_type'] == 'plastic', f"Expected sgr_type to be 'plastic', got {item_rec['sgr_type']}"
            assert abs(float(item_rec['sgr_deposit_amount']) - 0.50) < 0.01, f"Expected deposit 0.50, got {item_rec['sgr_deposit_amount']}"
            assert abs(float(item_rec['sgr_total_amount']) - 0.50) < 0.01, f"Expected total deposit 0.50, got {item_rec['sgr_total_amount']}"
            assert item_rec['sgr_vat_group'] == 'D', f"Expected sgr_vat_group to be 'D', got {item_rec['sgr_vat_group']}"
            assert abs(float(item_rec['sgr_vat_rate']) - 0.00) < 0.01, f"Expected sgr_vat_rate to be 0, got {item_rec['sgr_vat_rate']}"
            
            # Check product VAT remains correct (A/21%)
            assert item_rec['vat_group'] == 'A', f"Expected product vat_group to be 'A', got {item_rec['vat_group']}"
            assert abs(float(item_rec['vat_rate']) - 21.00) < 0.01, f"Expected product vat_rate to be 21, got {item_rec['vat_rate']}"
            
            safe_print("[PASS] SGR and VAT snapshots verified successfully in database.")

            # 5. Check Stock Batch Decremented
            safe_print("\n5. Checking stock batch quantity...")
            stock_check = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data: batches, error }} = await supabase.from('stock_batches')
                    .select('quantity')
                    .eq('product_id', "{product_id}")
                    .eq('zone', 'magazin');
                if (error) return {{ error: error.message }};
                return {{ quantity: batches[0].quantity }};
            }}""")
            
            assert float(stock_check['quantity']) == 9.0, f"Expected remaining stock batch quantity to be 9, got {stock_check.get('quantity')}"
            safe_print("[PASS] Stock batch successfully decremented by 1.")

            # 6. Test Negative Checkout (Payment Mismatch)
            safe_print("\n6. Testing negative finalize_sale RPC call (missing SGR amount)...")
            test_neg_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                const items = [{{
                    product_id: "{product_id}",
                    quantity: 1
                }}];
                
                // Payment is 10.00, but total calculated is 10.50 (with SGR)
                const payments = [{{
                    method: "cash",
                    amount: 10.00
                }}];
                
                const {{ data, error }} = await supabase.rpc('finalize_sale', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_items: items,
                    p_payments: payments,
                    p_shift_id: "{shift_id}"
                }});
                
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, sale_id: data.sale_id }};
            }}""")
            
            safe_print(f"Negative RPC Response: {test_neg_res}")
            assert not test_neg_res['success'], "Negative RPC test failed! The RPC should have rejected the sale."
            assert "Totalul platilor" in test_neg_res['error'] and "nu corespunde" in test_neg_res['error'], f"Unexpected error message: {test_neg_res.get('error')}"
            safe_print("[PASS] finalize_sale correctly rejected payment mismatch.")

            # 7. Cleanup test product (Financial tables are NOT modified by delete DML, satisfying safety guard)
            safe_print("\n7. Cleaning up test products...")
            cleanup_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ error }} = await supabase.from('products').delete().eq('id', "{product_id}");
                if (error) {{
                    console.log('Test product kept in database due to references (standard audit behavior):', error.message);
                }}
            }}""")
            safe_print("[PASS] Cleanup completed.")

        except Exception as e:
            safe_print("[FAIL] Test failed!")
            raise e
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] SGR finalize_sale backend test passed!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
