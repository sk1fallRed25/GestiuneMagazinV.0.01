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
            page.screenshot(path="login_debug_shift.png", full_page=True)
            raise e
        
        # --- PRE-STEP: Reception 10 buc of OTET 1L to ensure stock ---
        safe_print("\n--- PRE-STEP: Reception 10 buc OTET 1L ---")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        
        page.locator("input[placeholder='Ex: 123456']").fill("REC-POS-6A3")
        page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Test E2E 6A.3 Pre-step")
        
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET 1L")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("input[placeholder='Cantitate']").fill("10")
        page.locator("input[placeholder='0.00']").fill("1.00")
        page.locator("input[placeholder='Lot']").fill("TEST-POS-6A3")
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
                        p_closing_notes: 'Cleanup automat inainte de test 6A.3'
                    });
                    return { success: true, action: 'closed', shiftId: shift.shift_id };
                } else {
                    await supabase.rpc('cancel_pos_shift', {
                        p_store_id: storeId,
                        p_profile_id: user.id,
                        p_shift_id: shift.shift_id,
                        p_notes: 'Cleanup automat inainte de test 6A.3'
                    });
                    return { success: true, action: 'cancelled', shiftId: shift.shift_id };
                }
            }
            return { success: true, action: 'none' };
        }""")
        safe_print(f"[PASS] Cleanup controlat finalizat cu starea: {cleanup_res}")
        page.wait_for_timeout(1000)

        # --- NAVIGATE TO POS ---
        safe_print("\nNavigating to /#/vanzare ...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        def extract_total():
            total_text = page.locator("span.text-5xl").inner_text()
            safe_print(f"[DEBUG] Extracted total text: {total_text}")
            match = re.search(r"([\d.]+)", total_text)
            if match:
                return float(match.group(1))
            return 0.0

        # --- SCENARIUL 1: POS blocat fara tura activa ---
        safe_print("\n--- SCENARIUL 1: POS blocat fara tura activa ---")
        lock_screen = page.locator("h3:has-text('POS Blocat')").first
        lock_screen.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] PosLockScreen apare corect cand nu exista tura activa.")
        
        assert page.locator("text=Nu ai nicio").is_visible(), "Mesajul 'Nu ai nicio tura deschisa' nu este vizibil in ShiftActiveBadge"
        safe_print("[PASS] Mesajul 'Nu ai nicio tura deschisa' confirmat.")
        
        assert page.locator("button.bg-gradient-to-r", has_text="NCASEAZ").is_disabled(), "Butonul INCASEAZA ar trebui sa fie disabled fara tura activa"
        safe_print("[PASS] Butonul INCASEAZA este disabled corect.")

        # --- SCENARIUL 2: Deschidere tura ---
        safe_print("\n--- SCENARIUL 2: Deschidere tura ---")
        page.locator("button:has-text('Deschide')").first.click()
        
        modal_open = page.locator("h3:has-text('Deschidere')").first
        modal_open.wait_for(state="visible", timeout=5000)
        
        page.locator("input[type='number']").fill("100")
        page.locator("textarea[placeholder*='Mentiuni']").fill("Test E2E 6A.3")
        page.locator("button[type='submit']").click()
        
        modal_open.wait_for(state="detached", timeout=5000)
        safe_print("[PASS] Modalul de deschidere s-a inchis cu succes.")
        
        badge = page.locator("div", has=page.locator("text=Activ")).first
        badge.wait_for(state="visible", timeout=5000)
        assert page.locator("text=Casa 1").is_visible(), "Casa 1 nu apare pe badge"
        assert page.locator("text=100.00 RON").is_visible(), "Sold initial 100 nu apare pe badge"
        safe_print("[PASS] ShiftActiveBadge afiseaza corect datele turei active.")
        
        db_shift_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                p_store_id: stores[0].id,
                p_profile_id: user.id
            });
            return shift;
        }""")
        assert db_shift_check is not None, "Tura nu exista in baza de date!"
        assert db_shift_check['status'] == 'open', "Statusul turei nu este open in DB"
        assert db_shift_check['opening_cash'] == 100, "opening_cash incorect in DB"
        safe_print("[PASS] Verificare Supabase read-only pentru deschidere tura confirmata.")

        # --- SCENARIUL 3: Vanzare cu shift_id ---
        safe_print("\n--- SCENARIUL 3: Vanzare cu shift_id ---")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        page.locator("button:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('OTET 1L')").click()
        page.wait_for_timeout(1000)
        
        page.locator("button:has-text('NUMERAR')").click()
        page.locator("button.bg-gradient-to-r", has_text="NCASEAZ").click(no_wait_after=True)
        
        try:
            page.locator("text=finalizat").wait_for(state="attached", timeout=5000)
            safe_print("[PASS] Vanzare realizata cu succes! (Toast detectat)")
        except Exception as e:
            safe_print("[DEBUG] Verificare daca s-a golit cosul...")
            if extract_total() == 0:
                safe_print("[PASS] Vanzare realizata cu succes (cos golit).")
            else:
                raise Exception("Vanzarea nu s-a finalizat!")
                
        page.wait_for_timeout(3000)
        
        db_sale_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const storeId = stores[0].id;
            const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                p_store_id: storeId,
                p_profile_id: user.id
            });
            const { data: sales } = await supabase.from('sales').select('*').eq('shift_id', shift.shift_id).order('created_at', { ascending: false }).limit(1);
            const { data: payments } = await supabase.from('payments').select('*').eq('sale_id', sales[0].id);
            return { shift, sale: sales[0], payments };
        }""")
        assert db_sale_check['sale'] is not None, "Vanzarea nu exista in baza de date!"
        assert db_sale_check['sale']['shift_id'] == db_sale_check['shift']['shift_id'], "shift_id incorect pe vanzare"
        assert len(db_sale_check['payments']) > 0, "Nu exista plati asociate vanzarii"
        assert db_sale_check['shift']['current_totals']['transactions_count'] >= 1, "transactions_count nu s-a incrementat"
        safe_print("[PASS] Verificare Supabase read-only pentru vanzare cu shift_id confirmata.")

        # --- SCENARIUL 4: Dubla deschidere tura blocata ---
        safe_print("\n--- SCENARIUL 4: Dubla deschidere tura blocata ---")
        assert not page.locator("button:has-text('Deschide Tură')").is_visible(), "Butonul Deschide Tura ar trebui sa fie ascuns cand tura este activa"
        safe_print("[PASS] Butonul Deschide Tura este ascuns corect in UI.")
        
        db_double_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const { data: registers } = await supabase.from('cash_registers').select('id').eq('store_id', stores[0].id).limit(1);
            try {
                const { error } = await supabase.rpc('open_pos_shift', {
                    p_store_id: stores[0].id,
                    p_profile_id: user.id,
                    p_cash_register_id: registers[0].id,
                    p_opening_cash: 100,
                    p_notes: 'Incercare dubla deschidere'
                });
                if (error) {
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }""")
        assert db_double_check['success'] == False, "Supabase a permis deschiderea a doua ture simultane!"
        assert "Ai deja o tur" in db_double_check['error'], f"Mesaj eroare neasteptat: {db_double_check['error']}"
        safe_print(f"[PASS] Dubla deschidere blocata corect de Supabase cu mesajul: {db_double_check['error']}")

        # --- SCENARIUL 5: Anulare tura cu vanzari blocata ---
        safe_print("\n--- SCENARIUL 5: Anulare tura cu vanzari blocata ---")
        page.locator("button:has-text('Anule')").first.click()
        
        try:
            page.locator("text=deoarece are deja").wait_for(state="attached", timeout=5000)
            safe_print("[PASS] Anularea turei cu vanzari a fost blocata corect cu mesaj in UI!")
        except Exception as e:
            db_cancel_check = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: { user } } = await supabase.auth.getUser();
                const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
                const { data: shift } = await supabase.rpc('get_active_pos_shift', {
                    p_store_id: stores[0].id,
                    p_profile_id: user.id
                });
                return shift;
            }""")
            assert db_cancel_check is not None and db_cancel_check['status'] == 'open', "Tura a fost anulata desi avea vanzari!"
            safe_print("[PASS] Tura a ramas deschisa in DB, anularea a esuat cum era de asteptat.")

        # --- SCENARIUL 6: Inchidere tura ---
        safe_print("\n--- SCENARIUL 6: Inchidere tura ---")
        page.locator("button:has-text('Tura')").first.click()
        
        modal_container = page.locator("div.bg-slate-900", has=page.locator("h3:has-text('Închidere Tură POS')"))
        modal_container.wait_for(state="visible", timeout=5000)
        
        expected_cash_text = modal_container.locator("span:has-text('Total')").locator("..").locator("span.text-xl").inner_text()
        safe_print(f"[DEBUG] Total asteptat in sertar (UI): {expected_cash_text}")
        match = re.search(r"([\d.]+)", expected_cash_text)
        exp_cash = match.group(1) if match else "100"
        
        modal_container.locator("input[type='number']").fill(exp_cash)
        modal_container.locator("textarea[placeholder*='Explica']").fill("Închidere normală E2E")
        modal_container.locator("button[type='submit']").click()
        
        success_msg = modal_container.locator("h4:has-text('Tura a fost')").first
        success_msg.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Mesajul de succes la inchidere a aparut in modal.")
        
        modal_container.locator("button:has-text('Fereastra')").click()
        modal_container.wait_for(state="detached", timeout=5000)
        
        lock_screen.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] UI a revenit corect la PosLockScreen dupa inchiderea turei.")
        
        db_final_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: stores } = await supabase.from('stores').select('id').eq('name', 'Magazin Principal').limit(1);
            const { data: shifts } = await supabase.from('pos_shifts').select('*').eq('store_id', stores[0].id).eq('opened_by', user.id).order('closed_at', { ascending: false }).limit(1);
            return shifts[0];
        }""")
        assert db_final_check['status'] == 'closed', "Statusul turei nu este closed in DB"
        assert db_final_check['closed_at'] is not None, "closed_at este null in DB"
        assert float(db_final_check['cash_difference']) == 0.0, "cash_difference nu este 0"
        safe_print("[PASS] Verificare Supabase read-only pentru inchidere tura confirmata.")
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] Shift Management E2E Test 6A.3 passed successfully!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e)
        safe_print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
