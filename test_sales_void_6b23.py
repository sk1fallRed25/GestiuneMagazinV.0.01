import sys
import time
import re
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()
            safe_print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
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
            page.screenshot(path="login_debug_void.png", full_page=True)
            raise e
        
        # --- PRE-STEP: Reception 10 buc of OTET 1L to ensure stock ---
        safe_print("\n--- PRE-STEP: Reception 10 buc OTET 1L ---")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        
        page.locator("input[placeholder='Ex: 123456']").fill("REC-VOID-6B23")
        page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Test E2E 6B.2.3 Pre-step")
        
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET 1L")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("input[placeholder='Cantitate']").fill("10")
        page.locator("input[placeholder='0.00']").fill("1.00")
        page.locator("input[placeholder='Lot']").fill("TEST-VOID-6B23")
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
                        p_closing_notes: 'Cleanup automat inainte de test 6B.2.3'
                    });
                    return { success: true, action: 'closed', shiftId: shift.shift_id };
                } else {
                    await supabase.rpc('cancel_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: user.id,
                        p_shift_id: shift.shift_id,
                        p_notes: 'Cleanup automat inainte de test 6B.2.3'
                    });
                    return { success: true, action: 'cancelled', shiftId: shift.shift_id };
                }
            }
            return { success: true, action: 'none' };
        }""")
        safe_print(f"[PASS] Cleanup controlat finalizat cu starea: {cleanup_res}")
        page.wait_for_timeout(1000)

        # --- SCENARIUL 1: Deschidere tura si realizare vanzare ---
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
        page.locator("textarea[placeholder*='Mentiuni']").fill("Sales Void E2E 6B.2.3")
        page.locator("button[type='submit']").click()
        page.locator("h3:has-text('Deschidere')").first.wait_for(state="detached", timeout=5000)
        safe_print("[PASS] Tura deschisa cu succes.")
        
        # Adaugare produs si realizare vanzare numerar
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        page.locator("button:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('OTET 1L')").click()
        page.wait_for_timeout(500)
        
        page.locator("button:has-text('NUMERAR')").click()
        page.locator("button.bg-gradient-to-r", has_text="NCASEAZ").click(no_wait_after=True)
        
        # Asteptam finalizare toast sau cos golit
        page.wait_for_timeout(3000)
        
        # Preluam detaliile vanzarii din baza de date direct din browser
        sale_data = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const storeId = stores[0].id;
            
            const { data: sales } = await supabase.from('sales')
                .select('id, status, shift_id, store_id, total')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })
                .limit(1);
            
            const sale = sales[0];
            const { data: saleItems } = await supabase.from('sale_items').select('batch_id, quantity').eq('sale_id', sale.id);
            const batchId = saleItems[0].batch_id;
            const { data: batch } = await supabase.from('stock_batches').select('quantity').eq('id', batchId).single();
            
            return {
                saleId: sale.id,
                status: sale.status,
                shiftId: sale.shift_id,
                storeId: sale.store_id,
                batchId: batchId,
                initialBatchQty: batch.quantity,
                saleTotal: sale.total
            };
        }""")
        
        safe_print(f"[PASS] Vanzare creata cu succes. ID: {sale_data['saleId']}, Status DB: {sale_data['status']}")
        assert sale_data['status'] == 'finalized', "Vanzarea ar trebui sa fie in starea 'finalized'"
        assert sale_data['shiftId'] is not None, "shift_id ar trebui sa fie completat"
        
        # --- SCENARIUL 2 & 3: Deschidere detalii, verificare buton Anuleaza, modal si validation error (motiv scurt) ---
        safe_print("\n--- SCENARIUL 2 & 3: Deschidere detalii si validari in modal ---")
        page.goto("http://localhost:5173/#/istoric-vanzari")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Gasire si deschidere detalii primul bon
        page.locator("button[title='Detalii Bon']").first.click()
        page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Modal detalii bon deschis.")
        
        # Verificare buton "ANULEAZĂ BON" este vizibil (asteptam sa se incarce datele)
        void_btn = page.locator("button:has-text('ANULEAZĂ BON')")
        void_btn.wait_for(state="visible", timeout=10000)
        assert void_btn.is_visible(), "Butonul ANULEAZA BON nu este vizibil pe un bon finalizat."
        safe_print("[PASS] Butonul ANULEAZĂ BON este vizibil corect.")
        
        # Click "ANULEAZĂ BON"
        void_btn.click()
        page.locator("h3:has-text('ANULARE BON (VOID)')").wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Modal de anulare (VoidSaleModal) s-a deschis.")
        
        # Verificare buton "CONFIRMĂ ANULAREA" este disabled initial
        confirm_btn = page.locator("button:has-text('CONFIRMĂ ANULAREA')")
        assert confirm_btn.is_disabled(), "Butonul de confirmare ar trebui sa fie disabled cand motivul este gol."
        safe_print("[PASS] Butonul CONFIRMĂ ANULAREA este disabled la camp gol.")
        
        # Completare motiv prea scurt
        textarea = page.locator("textarea[placeholder*='Introduceți motivul anulării']")
        textarea.fill("Ab")
        page.wait_for_timeout(500)
        assert confirm_btn.is_disabled(), "Butonul de confirmare ar trebui sa fie disabled cand motivul are mai putin de 3 caractere."
        safe_print("[PASS] Butonul CONFIRMĂ ANULAREA ramane disabled pentru motiv prea scurt (< 3 caractere).")
        
        # --- SCENARIUL 4: Anulare cu succes a bonului ---
        safe_print("\n--- SCENARIUL 4: Anulare cu succes a bonului ---")
        textarea.fill("Anulare E2E 6B.2.3")
        page.wait_for_timeout(500)
        assert not confirm_btn.is_disabled(), "Butonul ar trebui sa fie activat acum."
        
        confirm_btn.click()
        page.locator("h3:has-text('ANULARE BON (VOID)')").wait_for(state="detached", timeout=8000)
        safe_print("[PASS] Modalul de anulare s-a inchis.")
        
        # Verificare status badge in UI (trebuie sa fie "Anulat")
        page.locator("span", has_text=re.compile(r"^Anulat$")).first.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Statusul in UI al bonului a fost actualizat la 'Anulat'.")
        
        # --- SCENARIUL 4.1: Verificare read-only in baza de date ---
        safe_print("\n--- SCENARIUL 4.1: Verificare DB post-anulare ---")
        db_void_check = page.evaluate("""async (params) => {
            const supabase = window.supabase;
            const { data: sale } = await supabase.from('sales').select('status').eq('id', params.saleId).single();
            const { data: returns } = await supabase.from('sale_returns').select('*').eq('original_sale_id', params.saleId);
            const { data: returnItems } = await supabase.from('sale_return_items').select('*').eq('return_id', returns[0]?.id);
            const { data: movements } = await supabase.from('stock_movements').select('*').eq('reference_id', returns[0]?.id);
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('entity_id', returns[0]?.id);
            const { data: batch } = await supabase.from('stock_batches').select('quantity').eq('id', params.batchId).single();
            
            return {
                saleStatus: sale.status,
                returnsCount: returns.length,
                returnRow: returns[0],
                returnItemsCount: returnItems.length,
                movementsCount: movements.length,
                movementRow: movements[0],
                logsCount: logs.length,
                logRow: logs[0],
                finalBatchQty: batch.quantity
            };
        }""", sale_data)
        
        assert db_void_check['saleStatus'] == 'voided', f"Status sale incorect in DB: {db_void_check['saleStatus']}"
        assert db_void_check['returnsCount'] == 1, "Nu s-a creat randul in sale_returns"
        assert db_void_check['returnRow']['type'] == 'void', "Tip retur incorect"
        assert db_void_check['returnRow']['status'] == 'completed', "Status retur incorect"
        assert db_void_check['returnRow']['reason'] == 'Anulare E2E 6B.2.3', "Motiv retur incorect in DB"
        assert db_void_check['returnItemsCount'] == 1, "Nu s-a creat randul in sale_return_items"
        assert db_void_check['movementsCount'] == 1, "Nu s-a creat miscarea de stoc reversa"
        assert db_void_check['movementRow']['type'] == 'void', "Tip miscare stoc incorect"
        assert db_void_check['logsCount'] == 1, "Nu s-a inregistrat in audit_logs"
        assert db_void_check['logRow']['action'] == 'sale.void', "Actiune audit incorecta"
        
        # Verificare refacere stoc
        expected_qty = sale_data['initialBatchQty'] + 1.0 # fiindca am vandut 1 buc si a fost refacuta
        assert abs(float(db_void_check['finalBatchQty']) - expected_qty) < 0.001, f"Stocul nu a fost restaurat corect! Initial: {sale_data['initialBatchQty']}, Final: {db_void_check['finalBatchQty']}"
        safe_print(f"[PASS] Integritate DB validata complet (sales.status, sale_returns, sale_return_items, stock_movements, audit_logs si stoc refacut).")
        
        # --- SCENARIUL 5: Blocare dubla anulare ---
        safe_print("\n--- SCENARIUL 5: Blocare dubla anulare ---")
        
        # Verifica butonul ANULEAZA BON nu mai apare fiindca statusul este voided (modalul este deja deschis)
        assert not page.locator("button:has-text('ANULEAZĂ BON')").is_visible(), "Butonul ANULEAZA BON nu ar trebui sa apara pe un bon deja anulat."
        page.locator("button:has-text('ÎNCHIDE')").click()
        page.wait_for_timeout(1000)
        
        # Verificare RPC block
        rpc_double_void = page.evaluate("""async (params) => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            try {
                const { error } = await supabase.rpc('void_sale', {
                    p_store_id: params.storeId,
                    p_profile_id: user.id,
                    p_sale_id: params.saleId,
                    p_reason: 'Incercare dubla anulare'
                });
                if (error) return { success: false, error: error.message };
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }""", sale_data)
        assert rpc_double_void['success'] == False, "RPC dynamic checks ar fi trebuit sa blocheze dubla anulare"
        assert any(x in rpc_double_void['error'] for x in ["Exist\u0103 deja", "Doar v\u00e2nz\u0103rile", "status curent"]), f"Eroare neasteptata: {rpc_double_void['error']}"
        safe_print(f"[PASS] Dubla anulare blocata corect de RPC cu mesajul: {rpc_double_void['error']}")

        # --- SCENARIUL 6: Blocare anulare dupa inchidere tura ---
        safe_print("\n--- SCENARIUL 6: Blocare anulare dupa inchidere tura ---")
        
        # Realizam o noua vanzare
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        page.locator("button:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('OTET 1L')").click()
        page.wait_for_timeout(500)
        
        page.locator("button:has-text('NUMERAR')").click()
        page.locator("button.bg-gradient-to-r", has_text="NCASEAZ").click(no_wait_after=True)
        
        page.wait_for_timeout(3000)
        
        # Preluam datele noii vanzari si inchidem tura din RPC pentru rapiditate/siguranta
        new_sale_data = page.evaluate("""async (params) => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            
            const { data: sales } = await supabase.from('sales')
                .select('id, total, shift_id')
                .eq('store_id', params.storeId)
                .order('created_at', { ascending: false })
                .limit(1);
            
            const sale = sales[0];
            
            // Citim expected cash ca sa inchidem tura corect
            const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                p_store_id: params.storeId,
                p_profile_id: user.id
            });
            const exp = shift.current_totals?.expected_cash || shift.opening_cash;
            
            // Inchidem tura
            await supabase.rpc('close_pos_shift', {
                p_store_id: params.storeId,
                p_profile_id: user.id,
                p_shift_id: sale.shift_id,
                p_declared_cash: exp,
                p_closing_notes: 'Inchidere tura in test 6B.2.3'
            });
            
            return {
                saleId: sale.id,
                shiftId: sale.shift_id
            };
        }""", sale_data)
        
        safe_print(f"[DEBUG] Noua vanzare creata cu ID: {new_sale_data['saleId']}. Tura {new_sale_data['shiftId']} a fost inchisa.")
        
        # Navigam in Istoric Vanzari, deschidem detaliile noului bon
        page.goto("http://localhost:5173/#/istoric-vanzari")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        page.locator("button[title='Detalii Bon']").first.click()
        page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
        
        # Click "ANULEAZĂ BON"
        page.locator("button:has-text('ANULEAZĂ BON')").click()
        page.locator("h3:has-text('ANULARE BON (VOID)')").wait_for(state="visible", timeout=5000)
        
        # Verificam ca badge-ul de eligibilitate din modal arata "Ineligibil" si apare eroarea corespunzatoare
        page.locator("span:has-text('Ineligibil')").first.wait_for(state="visible", timeout=5000)
        page.locator("text=Tura în care s-a emis bonul este închisă").first.wait_for(state="visible", timeout=5000)
        
        # Butonul de confirmare ar trebui sa fie disabled din cauza ineligibilitatii
        assert page.locator("button:has-text('CONFIRMĂ ANULAREA')").is_disabled(), "Butonul CONFIRMĂ ANULAREA ar trebui sa fie disabled cand tura este inchisa."
        safe_print("[PASS] Anularea bonului din tura inchisa a fost blocata corect cu mesaj explicativ si dezactivarea butonului.")
        
        page.locator("button:has-text('RENUNȚĂ')").click()
        page.locator("h3:has-text('ANULARE BON (VOID)')").wait_for(state="detached", timeout=5000)
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] Sales Void MVP E2E Test 6B.2.3 passed successfully!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e)
        safe_print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
