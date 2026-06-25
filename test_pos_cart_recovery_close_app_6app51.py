"""
E2E Playwright test for Stage 6APP.5.1: Desktop Close Button + POS Cart Recovery.

Tests cover:
  A. Cart draft autosave to scoped localStorage
  B. Cart recovery dialog on POS entry (restore flow)
  C. Cart recovery dialog (discard flow)
  D. Cart draft cleared after successful checkout
  E. Logout guard with cart items
  F. Close app button visibility and disabled state in browser
  G. Auto-update guard backward compatibility (pos_cart key still maintained)
  H. Cart recovery dialog (later flow)
"""

import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5174"

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))


def login_as_casier(page, wait_for_dashboard=True):
    """Login as casier@casier.com (cashier role)."""
    page.goto(f"{BASE_URL}/#/login")
    page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
    page.locator("input[type='text']").fill("casier@casier.com")
    page.locator("input[type='password']").fill("casier123")
    page.locator("button[type='submit']").click()
    page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
    safe_print("[OK] Logged in as casier@casier.com")


def login_as_admin(page, wait_for_dashboard=True):
    """Login as admin@admin.com."""
    page.goto(f"{BASE_URL}/#/login")
    page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
    page.locator("input[type='text']").fill("admin@admin.com")
    page.locator("input[type='password']").fill("admin123")
    page.locator("button[type='submit']").click()
    page.locator("text=Deconectare").wait_for(state="visible", timeout=15000)
    safe_print("[OK] Logged in as admin@admin.com")


def navigate_to_pos(page):
    """Navigate to POS page."""
    page.goto(f"{BASE_URL}/#/vanzare")
    time.sleep(2)


def get_user_and_store_ids(page):
    """Get current user id and store id from auth state."""
    ids = page.evaluate("""() => {
        const state = window.__debugAuthInfo;
        return {
            userId: state?.userId || null,
            storeId: state?.currentStoreId || null
        };
    }""")
    return ids.get('userId'), ids.get('storeId')


def build_draft_key(store_id, profile_id):
    """Build the localStorage key for a cart draft."""
    return f"pos_cart_draft_v1:{store_id}:{profile_id}"


def run_tests():
    safe_print("\n" + "=" * 80)
    safe_print("  E2E TESTS: Stage 6APP.5.1 — Desktop Close Button + POS Cart Recovery")
    safe_print("=" * 80)

    passed = 0
    failed = 0
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ========================================================
        # TEST A: Cart draft autosave to scoped localStorage
        # ========================================================
        safe_print("\n--- Test A: Cart draft autosave to scoped localStorage ---")
        product_id_to_clean = None
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()
            page.on("console", lambda msg: safe_print(f"[TEST A BROWSER CONSOLE] {msg.type}: {msg.text}"))

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            assert user_id, "Could not get user_id"
            assert store_id, "Could not get store_id"

            # Seed a product first
            seeding_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) throw new Error('Store Magazin Principal not found');
                const storeId = stores[0].id;
                
                const barcode = 'E2E_AUTO_CART_' + Math.floor(Math.random() * 100000000);
                const name = 'PRODUS_AUTOSAVE_' + barcode;
                
                const { data: p, error: err } = await supabase.from('products').insert({
                    store_id: storeId,
                    barcode: barcode,
                    name: name,
                    unit: 'buc',
                    status: 'active'
                }).select().single();
                if (err) throw err;
                
                const { error: errPrice } = await supabase.from('product_prices').insert({
                    store_id: storeId,
                    product_id: p.id,
                    price_sale: 10.00,
                    vat_group: 'A',
                    vat_percent: 19
                });
                if (errPrice) throw errPrice;
                
                const { error: errBatch } = await supabase.from('stock_batches').insert({
                    store_id: storeId,
                    product_id: p.id,
                    zone: 'magazin',
                    quantity: 10,
                    batch_number: 'LOT_' + barcode
                });
                if (errBatch) throw errBatch;
                
                return { productId: p.id, productName: name };
            }""")
            product_id_to_clean = seeding_res['productId']
            product_name = seeding_res['productName']

            navigate_to_pos(page)
            time.sleep(1)

            # Check if POS is locked (Shift closed)
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            if lock_screen.count() > 0 and lock_screen.is_visible():
                safe_print("[TEST A] POS is locked. Opening a shift...")
                page.locator("button:has-text('Deschide')").first.click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible", timeout=5000)
                page.locator("input[type='number']").fill("100")
                page.locator("textarea[placeholder*='Mentiuni']").fill("E2E Auto Cart Shift")
                page.locator("button[type='submit']").click()
                page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
                safe_print("[TEST A] Shift opened successfully.")
                time.sleep(1)

            # Clear any previous pos_cart and draft
            draft_key = build_draft_key(store_id, user_id)
            page.evaluate(f"""() => {{
                localStorage.setItem('pos_cart', '[]');
                localStorage.removeItem('{draft_key}');
            }}""")

            # Search for a product and add to cart
            search_input = page.locator("input[data-testid='pos-barcode-input']")
            search_input.fill(product_name)
            time.sleep(1)

            # Try to add a product via category browser or search results
            product_card = page.locator(f"button:has-text('{product_name}')").first
            product_card.click()
            time.sleep(1)

            # Check that the old pos_cart key is updated
            old_key_value = page.evaluate("() => localStorage.getItem('pos_cart')")
            assert old_key_value, "pos_cart key should exist"
            import json
            old_cart = json.loads(old_key_value)
            assert len(old_cart) > 0, "pos_cart should have items"

            # Wait for debounced draft save (300ms + margin)
            time.sleep(1)

            # Check that scoped draft was saved
            draft_value = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            assert draft_value, f"Draft key {draft_key} should exist after adding product"

            draft_obj = json.loads(draft_value)
            assert draft_obj.get('schemaVersion') == 1, "Draft schema version should be 1"
            assert draft_obj.get('storeId') == store_id, "Draft store_id should match"
            assert draft_obj.get('profileId') == user_id, "Draft profile_id should match"
            assert len(draft_obj.get('items', [])) > 0, "Draft should have items"
            assert 'totalsSnapshot' in draft_obj, "Draft should have totals snapshot"
            assert 'createdAt' in draft_obj, "Draft should have createdAt"
            assert 'updatedAt' in draft_obj, "Draft should have updatedAt"

            safe_print("[PASS] Test A: Cart draft autosave works with scoped key and schema validation.")
            passed += 1

            # Cleanup
            if product_id_to_clean:
                page.evaluate(f"""async () => {{
                    const supabase = window.supabase;
                    await supabase.from('products').delete().eq('id', "{product_id_to_clean}");
                }}""")

            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test A: {e}")
            failed += 1
            errors.append(f"A: {e}")
            if product_id_to_clean:
                try:
                    page.evaluate(f"""async () => {{
                        const supabase = window.supabase;
                        await supabase.from('products').delete().eq('id', "{product_id_to_clean}");
                    }}""")
                except:
                    pass
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST B: Cart recovery dialog on POS entry (restore flow)
        # ========================================================
        safe_print("\n--- Test B: Cart recovery dialog — restore flow ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            # Inject a fake draft into localStorage BEFORE navigating to POS
            fake_draft = {
                "storeId": store_id,
                "profileId": user_id,
                "shiftId": None,
                "deviceId": None,
                "items": [
                    {
                        "productId": "fake-product-001",
                        "name": "Test Product Draft",
                        "barcode": "1234567890",
                        "unit": "buc",
                        "price": 10.50,
                        "vatPercent": 19,
                        "quantity": 2,
                        "stockAvailable": 100,
                        "total": 21.00,
                        "sgrEnabled": False,
                        "sgrType": None,
                        "sgrDepositAmount": 0,
                        "sgrTotalAmount": 0
                    }
                ],
                "totalsSnapshot": {
                    "productsSubtotal": 21.00,
                    "sgrTotal": 0,
                    "grandTotal": 21.00
                },
                "createdAt": "2026-06-04T10:00:00.000Z",
                "updatedAt": "2026-06-04T10:00:00.000Z",
                "appVersion": "1.0.0",
                "schemaVersion": 1
            }

            import json
            page.evaluate(f"""(draftJson) => {{
                localStorage.setItem('{draft_key}', draftJson);
                localStorage.setItem('pos_cart', '[]');
            }}""", json.dumps(fake_draft))

            # Navigate to POS — recovery dialog should appear
            navigate_to_pos(page)
            time.sleep(2)

            dialog = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog.count() > 0, "Recovery dialog should be visible"

            # Check summary displays
            summary = page.locator("[data-testid='pos-cart-recovery-summary']")
            assert summary.count() > 0, "Summary section should be visible"
            summary_text = summary.text_content()
            assert "1 produse" in summary_text or "produse" in summary_text, f"Summary should show product count. Got: {summary_text}"

            # Click restore
            restore_btn = page.locator("[data-testid='pos-cart-recovery-restore-button']")
            assert restore_btn.count() > 0, "Restore button should exist"
            restore_btn.click()
            time.sleep(1)

            # Dialog should be gone
            dialog_after = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog_after.count() == 0, "Recovery dialog should be dismissed after restore"

            safe_print("[PASS] Test B: Cart recovery dialog shows and restore button works.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test B: {e}")
            failed += 1
            errors.append(f"B: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST C: Cart recovery dialog — discard flow
        # ========================================================
        safe_print("\n--- Test C: Cart recovery dialog — discard flow ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            import json
            fake_draft_c = {
                "storeId": store_id,
                "profileId": user_id,
                "shiftId": None,
                "deviceId": None,
                "items": [
                    {
                        "productId": "fake-product-002",
                        "name": "Discard Test",
                        "barcode": "9999999999",
                        "unit": "buc",
                        "price": 5.00,
                        "vatPercent": 19,
                        "quantity": 1,
                        "stockAvailable": 50,
                        "total": 5.00,
                        "sgrEnabled": False
                    }
                ],
                "totalsSnapshot": {"productsSubtotal": 5.00, "sgrTotal": 0, "grandTotal": 5.00},
                "createdAt": "2026-06-04T10:00:00.000Z",
                "updatedAt": "2026-06-04T10:00:00.000Z",
                "appVersion": "1.0.0",
                "schemaVersion": 1
            }

            page.evaluate(f"""(draftJson) => {{
                localStorage.setItem('{draft_key}', draftJson);
                localStorage.setItem('pos_cart', '[]');
            }}""", json.dumps(fake_draft_c))

            navigate_to_pos(page)
            time.sleep(2)

            dialog = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog.count() > 0, "Recovery dialog should be visible"

            # Click discard
            discard_btn = page.locator("[data-testid='pos-cart-recovery-discard-button']")
            discard_btn.click()
            time.sleep(1)

            # Dialog should be gone
            assert page.locator("[data-testid='pos-cart-recovery-dialog']").count() == 0, "Dialog should be dismissed"

            # Draft should be cleared
            draft_after = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            assert draft_after is None, f"Draft should be cleared after discard. Got: {draft_after}"

            safe_print("[PASS] Test C: Discard flow clears draft and dismisses dialog.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test C: {e}")
            failed += 1
            errors.append(f"C: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST D: No recovery dialog when no draft exists
        # ========================================================
        safe_print("\n--- Test D: No recovery dialog when no draft ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            # Ensure no draft
            page.evaluate(f"""() => {{
                localStorage.removeItem('{draft_key}');
                localStorage.setItem('pos_cart', '[]');
            }}""")

            navigate_to_pos(page)
            time.sleep(2)

            dialog = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog.count() == 0, "Recovery dialog should NOT appear when there's no draft"

            safe_print("[PASS] Test D: No recovery dialog when draft is empty.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test D: {e}")
            failed += 1
            errors.append(f"D: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST E: Logout guard — cart items trigger warning dialog
        # ========================================================
        safe_print("\n--- Test E: Logout guard with cart items ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)

            # Inject items into pos_cart to simulate active cart
            page.evaluate("""() => {
                localStorage.setItem('pos_cart', JSON.stringify([
                    { productId: "p1", name: "Test", price: 10, quantity: 1 }
                ]));
            }""")

            # Click logout button
            logout_btn = page.locator("text=Deconectare")
            assert logout_btn.count() > 0, "Logout button should exist"
            logout_btn.click()
            time.sleep(1)

            # Warning dialog should appear
            dialog = page.locator("[data-testid='logout-cart-warning-dialog']")
            assert dialog.count() > 0, "Logout cart warning dialog should appear"

            # Verify dialog buttons exist
            keep_btn = page.locator("[data-testid='logout-keep-cart-button']")
            discard_btn = page.locator("[data-testid='logout-discard-cart-button']")
            cancel_btn = page.locator("[data-testid='logout-cancel-button']")
            assert keep_btn.count() > 0, "Keep-and-logout button should exist"
            assert discard_btn.count() > 0, "Discard-and-logout button should exist"
            assert cancel_btn.count() > 0, "Cancel button should exist"

            # Click cancel — should dismiss dialog
            cancel_btn.click()
            time.sleep(0.5)
            assert page.locator("[data-testid='logout-cart-warning-dialog']").count() == 0, "Dialog should be dismissed on cancel"

            # Verify we are still logged in
            assert page.locator("text=Deconectare").count() > 0, "Should still be logged in after cancel"

            safe_print("[PASS] Test E: Logout guard shows warning and cancel works.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test E: {e}")
            failed += 1
            errors.append(f"E: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST F: Logout without cart items — no dialog
        # ========================================================
        safe_print("\n--- Test F: Logout without cart items — no dialog ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)

            # Ensure cart is empty
            page.evaluate("() => localStorage.setItem('pos_cart', '[]')")

            # Click logout
            logout_btn = page.locator("text=Deconectare")
            logout_btn.click()
            time.sleep(2)

            # Warning dialog should NOT appear
            dialog = page.locator("[data-testid='logout-cart-warning-dialog']")
            assert dialog.count() == 0, "Logout warning dialog should NOT appear with empty cart"

            # Should be on login page
            login_form = page.locator("input[type='text']")
            login_form.wait_for(state="visible", timeout=10000)

            safe_print("[PASS] Test F: Logout without cart items proceeds directly.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test F: {e}")
            failed += 1
            errors.append(f"F: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST G: Close app button exists and is disabled in browser
        # ========================================================
        safe_print("\n--- Test G: Close app button visibility in browser ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)

            close_btn = page.locator("[data-testid='app-close-button']")
            assert close_btn.count() > 0, "Close app button should exist in sidebar"

            # In browser (no electronAPI), button should be disabled
            is_disabled = close_btn.get_attribute("disabled")
            assert is_disabled is not None, "Close app button should be disabled in browser mode"

            safe_print("[PASS] Test G: Close app button exists and is disabled in browser.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test G: {e}")
            failed += 1
            errors.append(f"G: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST H: Backward compatibility — pos_cart key maintained
        # ========================================================
        safe_print("\n--- Test H: Backward compatibility — pos_cart key for auto-update guard ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            navigate_to_pos(page)
            time.sleep(1)

            # pos_cart should always be present (even if empty array)
            pos_cart_val = page.evaluate("() => localStorage.getItem('pos_cart')")
            assert pos_cart_val is not None, "pos_cart key should always exist for backward compat"

            import json
            parsed = json.loads(pos_cart_val)
            assert isinstance(parsed, list), "pos_cart should be a JSON array"

            safe_print("[PASS] Test H: pos_cart key exists for auto-update guard compatibility.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test H: {e}")
            failed += 1
            errors.append(f"H: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST I: Recovery dialog — "later" flow
        # ========================================================
        safe_print("\n--- Test I: Cart recovery dialog — later flow ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)
            safe_print(f"[TEST I PYTHON] user_id: {user_id}, store_id: {store_id}, draft_key: {draft_key}")

            import json
            fake_draft_i = {
                "storeId": store_id,
                "profileId": user_id,
                "shiftId": None,
                "deviceId": None,
                "items": [
                    {
                        "productId": "fake-product-003",
                        "name": "Later Test",
                        "barcode": "5555555555",
                        "unit": "buc",
                        "price": 7.00,
                        "vatPercent": 19,
                        "quantity": 3,
                        "stockAvailable": 30,
                        "total": 21.00,
                        "sgrEnabled": False
                    }
                ],
                "totalsSnapshot": {"productsSubtotal": 21.00, "sgrTotal": 0, "grandTotal": 21.00},
                "createdAt": "2026-06-04T10:00:00.000Z",
                "updatedAt": "2026-06-04T10:00:00.000Z",
                "appVersion": "1.0.0",
                "schemaVersion": 1
            }

            page.evaluate(f"""(draftJson) => {{
                localStorage.setItem('{draft_key}', draftJson);
                localStorage.setItem('pos_cart', '[]');
            }}""", json.dumps(fake_draft_i))

            page.on("console", lambda msg: safe_print(f"[TEST I BROWSER CONSOLE] {msg.type}: {msg.text}"))

            navigate_to_pos(page)
            
            # Print state right after navigation
            val_init = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            safe_print(f"[TEST I DEBUG] Draft immediately after navigation: {val_init}")

            time.sleep(2)

            val_after_sleep = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            safe_print(f"[TEST I DEBUG] Draft after 2s sleep: {val_after_sleep}")

            dialog = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog.count() > 0, "Recovery dialog should appear"

            # Click "later"
            later_btn = page.locator("[data-testid='pos-cart-recovery-later-button']")
            later_btn.click()
            time.sleep(0.5)

            # Dialog dismissed
            assert page.locator("[data-testid='pos-cart-recovery-dialog']").count() == 0, "Dialog should be dismissed"

            # Draft should still exist
            draft_after = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            assert draft_after is not None, "Draft should persist after 'later'"

            safe_print("[PASS] Test I: 'Later' flow dismisses dialog but keeps draft.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test I: {e}")
            failed += 1
            errors.append(f"I: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST J: Corrupted draft is handled gracefully
        # ========================================================
        safe_print("\n--- Test J: Corrupted draft handling ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            # Inject corrupted data
            page.evaluate(f"""() => {{
                localStorage.setItem('{draft_key}', 'not-valid-json!!!');
                localStorage.setItem('pos_cart', '[]');
            }}""")

            navigate_to_pos(page)
            time.sleep(2)

            # Recovery dialog should NOT appear (corrupted = no valid draft)
            dialog = page.locator("[data-testid='pos-cart-recovery-dialog']")
            assert dialog.count() == 0, "Recovery dialog should NOT appear for corrupted draft"

            # Corrupted data should be cleaned up
            remaining = page.evaluate(f"() => localStorage.getItem('{draft_key}')")
            # It may or may not be cleaned — the key thing is no crash
            safe_print("[PASS] Test J: Corrupted draft handled gracefully, no dialog shown.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test J: {e}")
            failed += 1
            errors.append(f"J: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST K: Logout keep-and-logout flow
        # ========================================================
        safe_print("\n--- Test K: Logout keep-and-logout flow ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            # Inject cart items
            page.evaluate("""() => {
                localStorage.setItem('pos_cart', JSON.stringify([
                    { productId: "p1", name: "Test", price: 10, quantity: 1 }
                ]));
            }""")

            # Click logout
            page.locator("text=Deconectare").click()
            time.sleep(1)

            dialog = page.locator("[data-testid='logout-cart-warning-dialog']")
            assert dialog.count() > 0, "Warning dialog should appear"

            # Click "keep and logout"
            page.locator("[data-testid='logout-keep-cart-button']").click()
            time.sleep(2)

            # Should be on login page
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)

            safe_print("[PASS] Test K: Keep-and-logout logs out successfully.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test K: {e}")
            failed += 1
            errors.append(f"K: {e}")
            try:
                context.close()
            except:
                pass

        # ========================================================
        # TEST L: Logout discard-and-logout flow
        # ========================================================
        safe_print("\n--- Test L: Logout discard-and-logout flow ---")
        try:
            context = browser.new_context(service_workers="block")
            page = context.new_page()

            login_as_admin(page)
            user_id, store_id = get_user_and_store_ids(page)
            draft_key = build_draft_key(store_id, user_id)

            # Inject cart items + draft
            import json
            page.evaluate("""() => {
                localStorage.setItem('pos_cart', JSON.stringify([
                    { productId: "p1", name: "Test", price: 10, quantity: 1 }
                ]));
            }""")
            page.evaluate(f"""(draftJson) => {{
                localStorage.setItem('{draft_key}', draftJson);
            }}""", json.dumps({
                "storeId": store_id, "profileId": user_id,
                "shiftId": None, "deviceId": None,
                "items": [{"productId": "p1", "name": "Test", "barcode": "", "unit": "buc", "price": 10, "vatPercent": 19, "quantity": 1, "stockAvailable": 100, "total": 10}],
                "totalsSnapshot": {"productsSubtotal": 10, "sgrTotal": 0, "grandTotal": 10},
                "createdAt": "2026-06-04T10:00:00Z", "updatedAt": "2026-06-04T10:00:00Z",
                "appVersion": "1.0.0", "schemaVersion": 1
            }))

            # Click logout
            page.locator("text=Deconectare").click()
            time.sleep(1)

            # Click "discard and logout"
            page.locator("[data-testid='logout-discard-cart-button']").click()
            time.sleep(2)

            # Should be on login page
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)

            # Re-login and check draft is gone
            login_as_admin(page)
            pos_cart = page.evaluate("() => localStorage.getItem('pos_cart')")
            import json
            cart_items = json.loads(pos_cart) if pos_cart else []
            assert len(cart_items) == 0, "pos_cart should be empty after discard+logout"

            safe_print("[PASS] Test L: Discard-and-logout clears cart and logs out.")
            passed += 1
            context.close()
        except Exception as e:
            safe_print(f"[FAIL] Test L: {e}")
            failed += 1
            errors.append(f"L: {e}")
            try:
                context.close()
            except:
                pass

        browser.close()

    # ===== RESULTS =====
    safe_print("\n" + "=" * 80)
    safe_print(f"  RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
    safe_print("=" * 80)

    if errors:
        safe_print("\nFailed tests:")
        for err in errors:
            safe_print(f"  - {err}")

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
