import sys
import time
import re
import os
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

# Anti-DML check: self-guard
def verify_anti_dml_guard():
    with open(__file__, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We check if there are any delete operations on audited tables.
    forbidden_tables = ['sales', 'sale_items', 'payments', 'sale_returns', 'sale_return_items', 'stock_movements', 'audit_logs']
    for table in forbidden_tables:
        pattern = rf"\.from\(['\"]{table}['\"]\)\.delete"
        if re.search(pattern, content):
            raise Exception(f"CRITICAL SECURITY VIOLATION: Delete operation found on audited table '{table}' in test script!")
    
    safe_print("[PASS] Anti-DML check completed. No forbidden delete statements found.")

def run_test():
    verify_anti_dml_guard()
    
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

            # 2. Seeding SGR Product and stock batch
            safe_print("\n2. Seeding test SGR product with SGR enabled...")
            seeding_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                
                // Get active store_id
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                // Get current profile
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user logged in');
                
                const barcode = 'E2E_SGR_RET_' + Math.floor(Math.random() * 100000000);
                
                // Insert SGR Product (sgr_enabled=true, type=plastic)
                const { data: product, error: errProd } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: 'PRODUS_SGR_RET_' + barcode,
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
                    batch_number: 'LOT_SGR_RET_E2E'
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
                        p_notes: 'SGR Returns Shift'
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

            # 3. Create SGR Sale (finalize_sale) - qty 2, price 10.00 each -> total 21.00 (with 2 x 0.50 SGR)
            safe_print("\n3. Creating sale with 2 SGR items...")
            sale_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                const items = [{{
                    product_id: "{product_id}",
                    quantity: 2
                }}];
                
                // total sale = 20.00 + 1.00 SGR = 21.00
                const payments = [{{
                    method: "cash",
                    amount: 21.00
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
            
            assert sale_res['success'], f"Sale finalization failed: {sale_res.get('error')}"
            sale_id = sale_res['sale_id']
            safe_print(f"[PASS] Sale created: {sale_id}, total: {sale_res['total']}")

            # Get sale_item_id
            sale_item_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.from('sale_items')
                    .select('id')
                    .eq('sale_id', "{sale_id}")
                    .eq('product_id', "{product_id}")
                    .single();
                if (error) return {{ error: error.message }};
                return {{ id: data.id }};
            }}""")
            sale_item_id = sale_item_res['id']
            safe_print(f"Retrieved sale_item_id: {sale_item_id}")

            # Scenario A: Eligibility for SGR Sale
            safe_print("\nScenario A: Calling get_sale_return_eligibility for SGR Sale...")
            elig_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_sale_return_eligibility', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}"
                }});
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, data }};
            }}""")
            
            assert elig_res['success'], f"Eligibility RPC failed: {elig_res.get('error')}"
            elig_data = elig_res['data']
            safe_print(f"Eligibility output: {elig_data}")
            
            # Find item
            item_elig = next(it for it in elig_data['items'] if it['sale_item_id'] == sale_item_id)
            assert item_elig['sgr_enabled'] == True, "Expected sgr_enabled to be True"
            assert item_elig['sgr_type'] == 'plastic', "Expected sgr_type to be 'plastic'"
            assert float(item_elig['sgr_deposit_amount']) == 0.50, "Expected sgr_deposit_amount to be 0.50"
            assert float(item_elig['sgr_total_amount']) == 1.00, "Expected sgr_total_amount to be 1.00"
            assert float(item_elig['sgr_returned_amount']) == 0.00, "Expected sgr_returned_amount to be 0.00"
            assert float(item_elig['sgr_available_amount']) == 1.00, "Expected sgr_available_amount to be 1.00"
            safe_print("[PASS] Scenario A passed: SGR eligibility properties verified.")

            # Scenario B: Partial Return 1 unit
            safe_print("\nScenario B: Performing partial return of 1 unit...")
            ret_partial_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                const items = [{{
                    sale_item_id: "{sale_item_id}",
                    quantity: 1
                }}];
                
                const {{ data: return_id, error }} = await supabase.rpc('return_sale_items', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}",
                    p_items: items,
                    p_reason: "Retur partial test SGR",
                    p_refund_method: "cash"
                }});
                
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, return_id }};
            }}""")
            
            assert ret_partial_res['success'], f"Partial return RPC failed: {ret_partial_res.get('error')}"
            return_id = ret_partial_res['return_id']
            safe_print(f"Partial return created: {return_id}")

            # Verify return details in DB
            db_verify_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                // Get sale_returns
                const {{ data: sr, error: errSr }} = await supabase.from('sale_returns')
                    .select('*')
                    .eq('id', "{return_id}")
                    .single();
                if (errSr) return {{ error: errSr.message }};
                
                // Get sale_return_items
                const {{ data: sri, error: errSri }} = await supabase.from('sale_return_items')
                    .select('*')
                    .eq('return_id', "{return_id}")
                    .single();
                if (errSri) return {{ error: errSri.message }};
                
                // Get sales
                const {{ data: sale, error: errS }} = await supabase.from('sales')
                    .select('status')
                    .eq('id', "{sale_id}")
                    .single();
                if (errS) return {{ error: errS.message }};
                
                // Get stock batch
                const {{ data: batches }} = await supabase.from('stock_batches')
                    .select('quantity')
                    .eq('product_id', "{product_id}")
                    .eq('zone', 'magazin');
                    
                // Get audit logs
                const {{ data: logs }} = await supabase.from('audit_logs')
                    .select('new_data')
                    .eq('entity_id', "{return_id}")
                    .eq('action', 'sale.return')
                    .single();
                
                return {{ sr, sri, saleStatus: sale.status, stockQty: batches[0].quantity, logData: logs ? logs.new_data : null }};
            }}""")
            
            assert 'error' not in db_verify_res, f"Database check failed: {db_verify_res.get('error')}"
            sr = db_verify_res['sr']
            sri = db_verify_res['sri']
            
            # Check total refund is product (10.00) + SGR (0.50) = 10.50
            assert float(sr['total_refund']) == 10.50, f"Expected total refund to be 10.50, got {sr['total_refund']}"
            
            # Check sale_return_items columns
            assert sri['sgr_enabled'] == True, "Expected return item sgr_enabled to be True"
            assert sri['sgr_type'] == 'plastic', "Expected return item sgr_type to be 'plastic'"
            assert float(sri['sgr_deposit_amount']) == 0.50, "Expected return item sgr_deposit_amount to be 0.50"
            assert float(sri['sgr_refund_amount']) == 0.50, "Expected return item sgr_refund_amount to be 0.50"
            assert sri['sgr_vat_group'] == 'D', "Expected return item sgr_vat_group to be 'D'"
            assert float(sri['sgr_vat_rate']) == 0.00, "Expected return item sgr_vat_rate to be 0.00"
            
            # Check sale status is partially_returned
            assert db_verify_res['saleStatus'] == 'partially_returned', f"Expected sale status 'partially_returned', got '{db_verify_res['saleStatus']}'"
            
            # Check stock quantity increased by 1 (was 8, now 9)
            assert float(db_verify_res['stockQty']) == 9.0, f"Expected stock batch quantity to be 9.0, got {db_verify_res['stockQty']}"
            
            # Check audit log contains sgr_refund_total
            log_data = db_verify_res['logData']
            assert log_data is not None, "Expected audit log record"
            assert float(log_data['sgr_refund_total']) == 0.50, f"Expected sgr_refund_total in audit log to be 0.50, got {log_data.get('sgr_refund_total')}"
            
            safe_print("[PASS] Scenario B passed: Partial return verified in DB (Total refund, SGR refund, stock, audit logs, and status).")

            # Scenario C: Eligibility after partial return
            safe_print("\nScenario C: Verifying eligibility after partial return...")
            elig_res2 = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data, error }} = await supabase.rpc('get_sale_return_eligibility', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}"
                }});
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, data }};
            }}""")
            
            assert elig_res2['success'], f"Eligibility RPC failed: {elig_res2.get('error')}"
            elig_data2 = elig_res2['data']
            item_elig2 = next(it for it in elig_data2['items'] if it['sale_item_id'] == sale_item_id)
            
            assert float(item_elig2['quantity_returned']) == 1.0, f"Expected quantity_returned to be 1.0, got {item_elig2['quantity_returned']}"
            assert float(item_elig2['quantity_available_to_return']) == 1.0, f"Expected quantity_available_to_return to be 1.0, got {item_elig2['quantity_available_to_return']}"
            assert float(item_elig2['sgr_returned_amount']) == 0.50, f"Expected sgr_returned_amount to be 0.50, got {item_elig2['sgr_returned_amount']}"
            assert float(item_elig2['sgr_available_amount']) == 0.50, f"Expected sgr_available_amount to be 0.50, got {item_elig2['sgr_available_amount']}"
            safe_print("[PASS] Scenario C passed: Eligibility updated correctly after partial return.")

            # Scenario E: Capping / Block excess return (Run now while status is partially_returned and 1 unit is available)
            safe_print("\nScenario E: Testing return capping limit (attempting to return 2 units when only 1 is available)...")
            excess_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const items = [{{
                    sale_item_id: "{sale_item_id}",
                    quantity: 2
                }}];
                const {{ data, error }} = await supabase.rpc('return_sale_items', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}",
                    p_items: items,
                    p_reason: "Retur depasit test SGR",
                    p_refund_method: "cash"
                }});
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, data }};
            }}""")
            
            assert not excess_res['success'], "Expected return to be rejected due to capping constraint!"
            # We do a case and diacritic-independent check
            err_msg = excess_res.get('error', '').lower()
            assert "dep" in err_msg and "disponibil" in err_msg, f"Unexpected error message: {excess_res.get('error')}"
            safe_print("[PASS] Scenario E passed: Excess return rejected by RPC as expected.")

            # Scenario D: Final return of remaining 1 unit
            safe_print("\nScenario D: Performing final return of the remaining unit...")
            ret_final_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                const items = [{{
                    sale_item_id: "{sale_item_id}",
                    quantity: 1
                }}];
                
                const {{ data: return_id, error }} = await supabase.rpc('return_sale_items', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}",
                    p_items: items,
                    p_reason: "Retur final test SGR",
                    p_refund_method: "cash"
                }});
                
                if (error) return {{ success: false, error: error.message }};
                return {{ success: true, return_id }};
            }}""")
            
            assert ret_final_res['success'], f"Final return RPC failed: {ret_final_res.get('error')}"
            return_id_final = ret_final_res['return_id']
            safe_print(f"Final return created: {return_id_final}")

            # Verify sale is returned and stock batch is 10.0
            final_verify = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                const {{ data: sale }} = await supabase.from('sales').select('status').eq('id', "{sale_id}").single();
                const {{ data: batches }} = await supabase.from('stock_batches').select('quantity').eq('product_id', "{product_id}").eq('zone', 'magazin');
                const {{ data: eligibility }} = await supabase.rpc('get_sale_return_eligibility', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: "{sale_id}"
                }});
                return {{ status: sale.status, stockQty: batches[0].quantity, eligibility }};
            }}""")
            
            assert final_verify['status'] == 'returned', f"Expected status 'returned', got '{final_verify['status']}'"
            assert float(final_verify['stockQty']) == 10.0, f"Expected stock batch quantity to be 10.0, got {final_verify['stockQty']}"
            assert final_verify['eligibility']['can_return'] == False, "Expected can_return to be False after full return"
            safe_print("[PASS] Scenario D passed: Final return successfully processed, sale status updated to 'returned', stock restored to 10.0.")

            # Scenario F: Regression checking for non-SGR product return
            safe_print("\nScenario F: Seeding non-SGR product and running checkout & return...")
            regression_res = page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                
                // Seed non-SGR product
                const barcode = 'E2E_NOSGR_' + Math.floor(Math.random() * 100000000);
                const {{ data: product, error: errProd }} = await supabase.from('products').insert({{
                    store_id: "{store_id}",
                    barcode: barcode,
                    name: 'PRODUS_NORMAL_' + barcode,
                    unit: 'buc',
                    status: 'active',
                    sgr_enabled: false
                }}).select().single();
                if (errProd) return {{ error: errProd.message }};
                
                // Add price
                const {{ error: errPrice }} = await supabase.from('product_prices').insert({{
                    store_id: "{store_id}",
                    product_id: product.id,
                    price_sale: 12.00,
                    vat_group: 'A',
                    vat_percent: 19
                }});
                if (errPrice) return {{ error: errPrice.message }};
                
                // Add stock
                const {{ data: batch, error: errBatch }} = await supabase.from('stock_batches').insert({{
                    store_id: "{store_id}",
                    product_id: product.id,
                    zone: 'magazin',
                    quantity: 5,
                    batch_number: 'LOT_NORMAL_E2E'
                }}).select().single();
                if (errBatch) return {{ error: errBatch.message }};
                
                // Finalize Sale
                const items = [{{
                    product_id: product.id,
                    quantity: 1
                }}];
                const payments = [{{
                    method: "cash",
                    amount: 12.00
                }}];
                const {{ data: saleData, error: errFinal }} = await supabase.rpc('finalize_sale', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_items: items,
                    p_payments: payments,
                    p_shift_id: "{shift_id}"
                }});
                if (errFinal) return {{ error: errFinal.message }};
                
                // Get sale item ID
                const {{ data: saleItem }} = await supabase.from('sale_items')
                    .select('id')
                    .eq('sale_id', saleData.sale_id)
                    .single();
                
                // Return Item
                const retItems = [{{
                    sale_item_id: saleItem.id,
                    quantity: 1
                }}];
                const {{ data: return_id, error: errReturn }} = await supabase.rpc('return_sale_items', {{
                    p_store_id: "{store_id}",
                    p_profile_id: "{profile_id}",
                    p_sale_id: saleData.sale_id,
                    p_items: retItems,
                    p_reason: "Retur normal regresie",
                    p_refund_method: "cash"
                }});
                if (errReturn) return {{ error: errReturn.message }};
                
                // Retrieve return details
                const {{ data: sri }} = await supabase.from('sale_return_items')
                    .select('*')
                    .eq('return_id', return_id)
                    .single();
                const {{ data: sr }} = await supabase.from('sale_returns')
                    .select('*')
                    .eq('id', return_id)
                    .single();
                
                // Clean up non-SGR product metadata (financial/audit rows remain intact)
                await supabase.from('products').delete().eq('id', product.id);
                
                return {{ success: true, total_refund: sr.total_refund, sri }};
            }}""")
            
            assert 'error' not in regression_res, f"Regression test failed: {regression_res.get('error')}"
            assert regression_res['success'] == True
            assert float(regression_res['total_refund']) == 12.00, f"Expected normal refund of 12.00, got {regression_res['total_refund']}"
            sri_nosgr = regression_res['sri']
            assert sri_nosgr['sgr_enabled'] == False
            assert sri_nosgr['sgr_type'] is None
            assert float(sri_nosgr['sgr_deposit_amount']) == 0.00
            assert float(sri_nosgr['sgr_refund_amount']) == 0.00
            assert sri_nosgr['sgr_vat_group'] is None
            assert float(sri_nosgr['sgr_vat_rate']) == 0.00
            safe_print("[PASS] Scenario F passed: Non-SGR product return behaves correctly (no SGR additions, correct total).")

            # 7. Cleanup metadata product SGR
            safe_print("\n7. Cleaning up test SGR product...")
            page.evaluate(f"""async () => {{
                const supabase = window.supabase;
                await supabase.from('products').delete().eq('id', "{product_id}");
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
        print("\n[SUCCESS] SGR returns backend tests passed successfully!")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
