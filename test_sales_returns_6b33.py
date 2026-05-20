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
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
        try:
            safe_print("1. Navigating to login...")
            page.goto("http://localhost:5173/#/login")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            
            safe_print("2. Logging in as admin@admin.com ...")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.wait_for_timeout(500)
            page.locator("button[type='submit']").click()
            
            safe_print("Waiting for Dashboard to load ...")
            try:
                page.locator("text=Magazin Principal").wait_for(state="visible", timeout=30000)
                safe_print("Logged in successfully.")
            except Exception as e:
                safe_print("[DEBUG] Timeout waiting for Dashboard. Capturing login state...")
                page.screenshot(path="login_debug_returns.png", full_page=True)
                raise e
            
            # --- PRE-STEP: Reception 10 buc of OTET 1L to ensure stock ---
            safe_print("\n--- PRE-STEP: Reception 10 buc OTET 1L ---")
            page.goto("http://localhost:5173/#/receptie")
            page.wait_for_load_state("networkidle")
            page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
            
            page.locator("input[placeholder='Ex: 123456']").fill("REC-RETURN-6B33")
            page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Test E2E 6B.3.3 Pre-step")
            
            page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET 1L")
            page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
            page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
            
            page.locator("input[placeholder='Cantitate']").fill("10")
            page.locator("input[placeholder='0.00']").fill("1.00")
            page.locator("input[placeholder='Lot']").fill("TEST-RETURN-6B33")
            page.wait_for_timeout(500)
            
            page.locator("button:has-text('Linie')").click()
            page.wait_for_timeout(1000)
            page.locator("button:has-text('FINALIZEAZ')").click(no_wait_after=True)
            
            try:
                page.locator("text=finalizat").wait_for(state="attached", timeout=5000)
                safe_print("[DEBUG] Pre-step reception confirmed.")
            except Exception as e:
                safe_print("[DEBUG] Timeout waiting for reception confirm.")
                
            page.wait_for_timeout(2000)

            # --- PRE-STEP PART 2: Transfer 10 buc of OTET 1L from Depozit to Magazin ---
            safe_print("\n--- PRE-STEP: Transfer 10 buc OTET 1L Depozit -> Magazin ---")
            page.goto("http://localhost:5173/#/transfer")
            page.wait_for_load_state("networkidle")
            page.locator("text=Pas 1").wait_for(state="visible", timeout=10000)
            
            page.locator("input[placeholder*='cod bare']").fill("OTET")
            page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
            page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
            
            page.locator("button:has-text('Depozit')").first.click()
            page.locator("input[type='number']").fill("10")
            page.locator("button:has-text('Transferul')").click(no_wait_after=True)
            
            try:
                page.locator("text=Transfer realizat cu succes!").wait_for(state="attached", timeout=5000)
                safe_print("[DEBUG] Pre-step transfer confirmed.")
            except Exception as e:
                safe_print("[DEBUG] Toast not detected directly. Checking if form reset to 'Niciun produs selectat'...")
                page.locator("text=Niciun produs selectat").wait_for(state="visible", timeout=5000)
                safe_print("[DEBUG] Pre-step transfer confirmed via reset.")
                
            page.wait_for_timeout(2000)
            
            # --- CLEANUP CONTROLAT INAINTE DE TEST ---
            safe_print("\n--- CLEANUP CONTROLAT INAINTE DE TEST ---")
            cleanup_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { success: false, reason: 'No user' };
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                if (!stores || stores.length === 0) return { success: false, reason: 'No store' };
                const storeId = stores[0].id;
                const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: storeId,
                    p_profile_id: user.id
                });
                if (shift && shift.shift_id) {
                    const count = shift.current_totals?.transactions_count || 0;
                    if (count > 0) {
                        const exp = shift.current_totals?.expected_cash || shift.opening_cash;
                        await supabase.rpc('close_pos_shift', {
                            p_store_id: storeId,
                            p_profile_id: user.id,
                            p_shift_id: shift.shift_id,
                            p_declared_cash: exp,
                            p_closing_notes: 'Cleanup automat inainte de test 6B.3.3'
                        });
                        return { success: true, action: 'closed', shiftId: shift.shift_id };
                    } else {
                        await supabase.rpc('cancel_pos_shift', {
                            p_store_id: storeId,
                            p_profile_id: user.id,
                            p_shift_id: shift.shift_id,
                            p_notes: 'Cleanup automat inainte de test 6B.3.3'
                        });
                        return { success: true, action: 'cancelled', shiftId: shift.shift_id };
                    }
                }
                return { success: true, action: 'none' };
            }""")
            safe_print(f"[PASS] Cleanup controlat finalizat cu starea: {cleanup_res}")
            page.wait_for_timeout(1000)

            # --- SCENARIUL 1: Deschidere tura si realizare vanzare de 2 buc ---
            safe_print("\n--- SCENARIUL 1: Deschidere tura si realizare vanzare ---")
            page.goto("http://localhost:5173/#/vanzare")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            
            lock_screen = page.locator("h3:has-text('POS Blocat')").first
            lock_screen.wait_for(state="visible", timeout=5000)
            safe_print("[PASS] POS Blocat detectat corect.")
            
            # Deschidere tura
            page.locator("button:has-text('Deschide')").first.click()
            page.locator("h3:has-text('Deschidere')").first.wait_for(state="visible", timeout=5000)
            page.locator("input[type='number']").fill("100")
            page.locator("textarea[placeholder*='Mentiuni']").fill("Sales Returns E2E 6B.3.3")
            page.locator("button[type='submit']").click()
            page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
            safe_print("[PASS] Tura deschisa cu succes.")
            
            # Adaugare produs si marire cantitate la 2 buc
            page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
            page.locator("button:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
            
            # Click 1 - add to cart
            page.locator("button:has-text('OTET 1L')").click()
            page.wait_for_timeout(1000)
            # Click Plus in cart (increases quantity to 2)
            page.locator("button:has(svg.lucide-plus), button:has-text('+')").first.click()
            page.wait_for_timeout(500)
            
            # Verificare cantitate in cart
            cart_qty = page.locator("span.w-8.text-center.font-bold.text-sm").first
            cart_qty.wait_for(state="visible", timeout=2000)
            qty_val = cart_qty.text_content()
            safe_print(f"[DEBUG] Cantitate in cos: {qty_val}")
            assert qty_val == "2", f"Cantitatea in cos trebuia sa fie 2, este: {qty_val}"
            
            # Incaseaza NUMERAR
            page.locator("button:has-text('NUMERAR')").click()
            page.locator("button.bg-gradient-to-r", has_text="NCASEAZ").click(no_wait_after=True)
            page.wait_for_timeout(3000)
            
            # Preluam detaliile vanzarii direct din DB in browser
            sale_data = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const storeId = stores[0].id;
                
                const { data: sales } = await supabase.from('sales')
                    .select('id, status, shift_id, store_id, total')
                    .eq('store_id', storeId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                const sale = sales[0];
                const { data: saleItems } = await supabase.from('sale_items').select('id, batch_id, quantity, unit_price').eq('sale_id', sale.id);
                const item = saleItems[0];
                
                return {
                    saleId: sale.id,
                    status: sale.status,
                    shiftId: sale.shift_id,
                    storeId: sale.store_id,
                    saleTotal: sale.total,
                    saleItemId: item.id,
                    batchId: item.batch_id,
                    unitPrice: item.unit_price
                };
            }""")
            
            safe_print(f"[PASS] Vanzare creata: ID: {sale_data['saleId']}, Total: {sale_data['saleTotal']}, Unit Price: {sale_data['unitPrice']}")
            assert sale_data['status'] == 'finalized', "Vanzarea ar trebui sa fie in starea 'finalized'"
            
            # --- SCENARIUL 2 & 3: Deschidere detalii, verificare buton Retur si modal cu validari/capping ---
            safe_print("\n--- SCENARIUL 2 & 3: Deschidere detalii si validari in modal ---")
            page.goto("http://localhost:5173/#/istoric-vanzari")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            
            # Gasire si deschidere detalii bon
            page.locator("button[title='Detalii Bon']").first.click()
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Modal detalii bon deschis.")
            
            # Click pe butonul RETUR PRODUSE
            ret_btn = page.locator("button:has-text('RETUR PRODUSE')")
            ret_btn.wait_for(state="visible", timeout=5000)
            ret_btn.click()
            
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] ReturnSaleModal s-a deschis.")
            
            # 1. Verificare: CONFIRMĂ RETURUL este disabled initial (cantitate = 0, motiv gol)
            confirm_btn = page.locator("button:has-text('CONFIRMĂ RETURUL')")
            assert confirm_btn.is_disabled(), "Butonul de confirmare ar trebui sa fie disabled cand totul e gol."
            
            # 2. Verificare: Capping la cantitate mai mare decat cea vanduta
            # Introducem 3 buc in input. Ar trebui sa se reseteze/limiteze automat la 2.
            qty_input = page.locator("input[placeholder='0']").first
            qty_input.fill("3")
            page.wait_for_timeout(500)
            input_val = qty_input.input_value()
            safe_print(f"[DEBUG] Valoare input dupa incercare fill 3: {input_val}")
            assert input_val == "2", f"Capping esuat! Valoarea trebuia sa fie 2, este: {input_val}"
            safe_print("[PASS] Capping-ul cantitatii la valoarea maxima disponibila functioneaza corect.")
            
            # 3. Verificare motiv prea scurt
            # Daca setam motiv sub 3 caractere, butonul ramane disabled.
            textarea = page.locator("textarea[placeholder*='motivul returului']")
            textarea.fill("Ab")
            page.wait_for_timeout(500)
            assert confirm_btn.is_disabled(), "Butonul confirmare ar trebui sa ramana disabled la motiv scurt."
            safe_print("[PASS] Butonul CONFIRMĂ RETURUL ramane disabled pentru motiv prea scurt (< 3 caractere).")
            
            # --- SCENARIUL 4: Retur parțial 1 unitate ---
            safe_print("\n--- SCENARIUL 4: Retur parțial de 1 bucată ---")
            # Modificam cantitatea la 1 buc
            qty_input.fill("1")
            # Completam motiv valid
            textarea.fill("Retur Partial E2E")
            page.wait_for_timeout(500)
            assert not confirm_btn.is_disabled(), "Butonul ar trebui sa fie activat acum."
            
            # Confirmare retur
            confirm_btn.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="detached", timeout=8000)
            safe_print("[PASS] Primul retur partial s-a procesat cu succes si modalul s-a inchis.")
            
            # Asteptam ca textul spinner-ului sa se ascunda (daca a aparut)
            page.locator("text=Se încarcă detaliile tranzacției...").wait_for(state="detached", timeout=8000)
            
            # Verificare status bon actualizat in detalii modal
            badge_locator = page.locator("h3:has-text('DETALII BON') + span")
            badge_locator.wait_for(state="visible", timeout=5000)
            
            for _ in range(20):
                txt = badge_locator.text_content().strip()
                if "Returnat Par" in txt or "RETURNAT PAR" in txt:
                    break
                page.wait_for_timeout(250)
            else:
                txt = badge_locator.text_content().strip()
                raise AssertionError(f"Expected status to be 'Returnat Parțial', but got '{txt}'")
            
            safe_print("[PASS] Statusul bonului a fost actualizat la 'Returnat Parțial'.")
            
            # --- SCENARIUL 5: Verificare Istoric Retururi Anterioare ---
            safe_print("\n--- SCENARIUL 5: Verificare Istoric Retururi Anterioare ---")
            # Re-deschidem modalul de retur din detaliile bonului (care sunt inca deschise)
            page.locator("button:has-text('RETUR PRODUSE')").click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="visible", timeout=5000)
            
            # Verificam ca tabelul de istoric retururi anterioare contine returul nostru
            history_header = page.locator("text=Istoric Retururi Anterioare pe acest Bon")
            history_header.wait_for(state="visible", timeout=5000)
            
            # Cautam randul in tabel: motivul "Retur Partial E2E", metoda "CASH" (sau "cash"), suma stornata
            expected_refund = float(sale_data['unitPrice'])
            refund_text = f"-{expected_refund:.2f} LEI"
            
            page.locator(f"td:has-text('{refund_text}')").wait_for(state="visible", timeout=5000)
            page.locator("td:has-text('cash')").first.wait_for(state="visible", timeout=5000)
            page.locator("td:has-text('Retur Partial E2E')").wait_for(state="visible", timeout=5000)
            
            safe_print("[PASS] Istoricul retururilor anterioare este listat corect in modal (Suma, Metoda, Motiv).")
            
            # --- SCENARIUL 6: Retur final restul de 1 unitate ---
            safe_print("\n--- SCENARIUL 6: Retur final restul de 1 unitate ---")
            # Verificam ca la disponibil a ramas 1 bucata si selectam 1
            qty_input2 = page.locator("input[placeholder='0']").first
            qty_input2.fill("1")
            
            textarea2 = page.locator("textarea[placeholder*='motivul returului']")
            textarea2.fill("Retur Final E2E")
            page.wait_for_timeout(500)
            
            confirm_btn2 = page.locator("button:has-text('CONFIRMĂ RETURUL')")
            confirm_btn2.click()
            page.locator("h3:has-text('RETUR PRODUSE')").wait_for(state="detached", timeout=8000)
            safe_print("[PASS] Al doilea retur (final) s-a realizat cu succes.")
            
            # Asteptam ca textul spinner-ului sa se ascunda (daca a aparut)
            page.locator("text=Se încarcă detaliile tranzacției...").wait_for(state="detached", timeout=8000)
            
            # Verificare status bon actualizat in detalii modal
            badge_locator2 = page.locator("h3:has-text('DETALII BON') + span")
            badge_locator2.wait_for(state="visible", timeout=5000)
            
            for _ in range(20):
                txt = badge_locator2.text_content().strip().upper()
                if txt == "RETURNAT":
                    break
                page.wait_for_timeout(250)
            else:
                txt = badge_locator2.text_content().strip()
                raise AssertionError(f"Expected status to be 'Returnat', but got '{txt}'")
            
            safe_print("[PASS] Statusul bonului a fost actualizat la 'Returnat' (complet).")
            
            # --- SCENARIUL 7: Verificare ascundere butoane ANULEAZA si RETUR ---
            safe_print("\n--- SCENARIUL 7: Verificare ascundere butoane de actiune ---")
            # Butoanele ANULEAZA BON si RETUR PRODUSE nu ar trebui sa apara
            assert not page.locator("button:has-text('ANULEAZĂ BON')").is_visible(), "Butonul ANULEAZĂ BON nu trebuie sa fie vizibil pe un bon returnat complet."
            assert not page.locator("button:has-text('RETUR PRODUSE')").is_visible(), "Butonul RETUR PRODUSE nu trebuie sa fie vizibil pe un bon returnat complet."
            safe_print("[PASS] Butoanele de actiune au fost ascunse cu succes pe bonul returnat complet.")
            
            # Inchidem modalul detalii bon
            page.locator("button:has-text('ÎNCHIDE')").click()
            page.wait_for_timeout(1000)
            
            # --- SCENARIUL 8: Reconciliere Sold Tura POS ---
            safe_print("\n--- SCENARIUL 8: Reconciliere Sold Tura POS ---")
            page.goto("http://localhost:5173/#/vanzare")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            
            # Deschidem modalul de inchidere tura
            page.locator("button:has-text('Închide Tura')").click()
            page.locator("h3:has-text('Închidere Tură POS')").wait_for(state="visible", timeout=5000)
            
            # Verificam ca expected cash (Total Așteptat în Sertar) s-a intors la 100.00 RON (deoarece vanzarea de 2 bucati a fost integral stornata)
            expected_text_locator = page.locator("text=Total Așteptat în Sertar").locator("..").locator("span").last
            expected_text_locator.wait_for(state="visible", timeout=5000)
            expected_val = expected_text_locator.text_content()
            safe_print(f"[DEBUG] Total Asteptat in Sertar in UI: {expected_val}")
            
            assert "100.00" in expected_val, f"Eroare reconciliere! Soldul asteptat trebuia sa fie 100.00 RON, este: {expected_val}"
            safe_print("[PASS] Reconcilierea soldului turei POS functioneaza corect. Numerarul asteptat s-a intors la 100.00 RON dupa returul complet.")
            
            page.locator("button:has-text('Renunță')").click()
            page.wait_for_timeout(1000)
            
            browser.close()
        except Exception as e:
            safe_print("[ERROR] Exception encountered inside E2E test steps!")
            page.screenshot(path="screenshot_error.png", full_page=True)
            safe_print("[DEBUG] Screenshot saved to screenshot_error.png")
            raise e

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] Sales Advanced Returns E2E Test 6B.3.3 passed successfully!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e)
        safe_print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
