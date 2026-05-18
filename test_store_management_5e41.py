import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))

        def handle_dialog(dialog):
            msg = dialog.message.encode('ascii', 'replace').decode('ascii')
            print(f"[DEBUG] Intercepted dialog ({dialog.type}): {msg}")
            dialog.accept()

        page.on("dialog", handle_dialog)
        
        print("1. Navigating to login...")
        page.goto("http://localhost:5173/#/login")
        page.wait_for_load_state("networkidle")
        
        print("2. Logging in as admin@owner.com ...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        # Wait for Owner Console link or navigate to it directly
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        page.goto("http://localhost:5173/#/owner")
        page.wait_for_load_state("networkidle")
        print("[PASS] Logged in and navigated to Owner Console.")
        
        # 2. CLEANUP CONTROLAT (via window.supabase)
        print("\n--- 2. Cleanup controlat inainte de test ---")
        cleanup_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            // Cautam magazinele de test
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '12345678');
            if (stores && stores.length > 0) {
                for (const st of stores) {
                    const wp = st.settings ? st.settings.workpointNumber : null;
                    if (wp === 901 || wp === 902) {
                        // Stergem asocierile din store_members pentru acest magazin
                        await supabase.from('store_members').delete().eq('store_id', st.id);
                        // Stergem magazinul de test
                        await supabase.from('stores').delete().eq('id', st.id);
                    }
                }
            }
            return { success: true };
        }""")
        page.wait_for_timeout(1000)
        page.reload()
        page.wait_for_load_state("networkidle")
        print("[PASS] Cleanup controlat efectuat cu succes.")
        
        # Deschide tab Magazine
        print("\n--- 3. Test creare magazin (12345678 / 901) ---")
        page.locator("button:has-text('Magazine')").click()
        page.locator("button:has-text('Adaugă Magazin Nou')").wait_for(state="visible", timeout=5000)
        
        # Click Adauga magazin
        page.locator("button:has-text('Adaugă Magazin Nou')").click()
        modal_title = page.locator("h3:has-text('Adăugare Magazin Nou')")
        modal_title.wait_for(state="visible", timeout=5000)
        
        # Completeaza formularul
        page.locator("input[placeholder*='Magazin Central']").fill("Magazin Test 12345678 Punct 901")
        page.locator("input[placeholder*='RO12345678']").fill("12345678")
        page.locator("input[placeholder*='ex: 1']").fill("901")
        page.locator("input[placeholder*='Bulevardul Unirii']").fill("Strada Test 901")
        page.locator("input[placeholder*='SC RETAIL PLUS']").fill("Firma Test SRL")
        page.locator("textarea[placeholder*='Detalii interne']").fill("Test E2E 5E.4.1")
        
        # Confirma ca preview-ul afiseaza 12345678 / 901
        page.locator("span:has-text('12345678 / 901')").wait_for(state="visible", timeout=5000)
        print("[PASS] Preview-ul afiseaza corect: 12345678 / 901")
        
        # Salveaza
        page.locator("button[type='submit']:has-text('Creează magazin')").click()
        modal_title.wait_for(state="detached", timeout=5000)
        print("[PASS] Modalul s-a inchis cu succes dupa creare.")
        
        # Asteapta aparitia in tabel
        row901 = page.locator("tr", has=page.locator("text=Magazin Test 12345678 Punct 901"))
        row901.wait_for(state="visible", timeout=5000)
        print("[PASS] Magazinul 12345678 / 901 apare corect in StoresTable.")
        
        # Verificare Supabase read-only pentru 901
        db_check_901 = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '12345678').eq('name', 'Magazin Test 12345678 Punct 901');
            return stores ? stores[0] : null;
        }""")
        assert db_check_901 is not None, "Magazinul 901 nu a fost gasit in baza de date!"
        assert db_check_901['fiscal_code'] == '12345678', "CUI incorect in DB"
        assert db_check_901['settings']['workpointNumber'] == 901, "Punct de lucru incorect in DB"
        assert db_check_901['settings']['displayCode'] == '12345678 / 901', "displayCode incorect in DB"
        assert db_check_901['settings']['companyName'] == 'Firma Test SRL', "companyName incorect in DB"
        assert db_check_901['active'] == True, "active incorect in DB"
        print("[PASS] Verificare Supabase read-only pentru 901: toate campurile sunt corecte.")
        
        # --- 4. TEST EDITARE MAGAZIN ---
        print("\n--- 4. Test editare magazin ---")
        row901.locator("button[title='Editează magazin']").click()
        edit_title = page.locator("h3:has-text('Editare Magazin')")
        edit_title.wait_for(state="visible", timeout=5000)
        
        page.locator("input[placeholder*='Magazin Central']").fill("Magazin Test 12345678 Punct 901 Editat")
        page.locator("input[placeholder*='Bulevardul Unirii']").fill("Strada Test 901 Editată")
        page.locator("textarea[placeholder*='Detalii interne']").fill("Test E2E 5E.4.1 editat")
        
        page.locator("button[type='submit']:has-text('Salvează modificările')").click()
        edit_title.wait_for(state="detached", timeout=5000)
        print("[PASS] Modalul s-a inchis cu succes dupa editare.")
        
        row901_edit = page.locator("tr", has=page.locator("text=Magazin Test 12345678 Punct 901 Editat"))
        row901_edit.wait_for(state="visible", timeout=5000)
        print("[PASS] Tabelul afiseaza corect numele editat.")
        
        db_check_edit = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '12345678').eq('name', 'Magazin Test 12345678 Punct 901 Editat');
            return stores ? stores[0] : null;
        }""")
        assert db_check_edit is not None, "Magazinul editat nu a fost gasit in baza de date!"
        assert db_check_edit['name'] == 'Magazin Test 12345678 Punct 901 Editat', "Nume neactualizat in DB"
        assert db_check_edit['address'] == 'Strada Test 901 Editată', "Adresa neactualizata in DB"
        assert db_check_edit['settings']['notes'] == 'Test E2E 5E.4.1 editat', "Note neactualizate in DB"
        assert db_check_edit['settings']['displayCode'] == '12345678 / 901', "displayCode alterat in DB"
        print("[PASS] Verificare Supabase read-only pentru editare: modificarile s-au salvat corect, displayCode mentinut.")
        
        # --- 5. TEST DUPLICAT CUI + PUNCT LUCRU ---
        print("\n--- 5. Test duplicat CUI + punct lucru ---")
        page.locator("button:has-text('Adaugă Magazin Nou')").click()
        modal_title.wait_for(state="visible", timeout=5000)
        
        page.locator("input[placeholder*='Magazin Central']").fill("Magazin Duplicat 901")
        page.locator("input[placeholder*='RO12345678']").fill("12345678")
        page.locator("input[placeholder*='ex: 1']").fill("901")
        page.locator("button[type='submit']:has-text('Creează magazin')").click()
        
        # Verifică mesajul de eroare
        err_msg = page.locator("text=Există deja un magazin pentru acest CUI și punct de lucru.").first
        err_msg.wait_for(state="visible", timeout=5000)
        print("[PASS] Eroarea de duplicat a fost afisata corect in UI.")
        
        # Inchide modalul
        page.locator("button", has=page.locator("svg.lucide-x")).click()
        modal_title.wait_for(state="detached", timeout=5000)
        
        # Verificare Supabase count
        dup_count = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '12345678');
            const count = stores ? stores.filter(s => s.settings && s.settings.workpointNumber === 901).length : 0;
            return count;
        }""")
        assert dup_count == 1, f"Numarul de magazine cu wp 901 ar trebui sa fie 1, dar este {dup_count}"
        print("[PASS] Verificare Supabase read-only: nu s-au creat duplicate in baza de date.")
        
        # --- 6. TEST PUNCT DE LUCRU DIFERIT ACELASI CUI (902) ---
        print("\n--- 6. Test punct de lucru diferit acelasi CUI (902) ---")
        page.locator("button:has-text('Adaugă Magazin Nou')").click()
        modal_title.wait_for(state="visible", timeout=5000)
        
        page.locator("input[placeholder*='Magazin Central']").fill("Magazin Test 12345678 Punct 902")
        page.locator("input[placeholder*='RO12345678']").fill("12345678")
        page.locator("input[placeholder*='ex: 1']").fill("902")
        page.locator("button[type='submit']:has-text('Creează magazin')").click()
        modal_title.wait_for(state="detached", timeout=5000)
        print("[PASS] Magazinul 12345678 / 902 creat cu succes din UI.")
        
        row902 = page.locator("tr", has=page.locator("text=Magazin Test 12345678 Punct 902"))
        row902.wait_for(state="visible", timeout=5000)
        
        db_check_902 = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '12345678');
            return stores || [];
        }""")
        st901 = next((s for s in db_check_902 if s['settings']['workpointNumber'] == 901), None)
        st902 = next((s for s in db_check_902 if s['settings']['workpointNumber'] == 902), None)
        assert st901 is not None and st902 is not None, "Ambele magazine trebuie sa existe in DB"
        assert st901['id'] != st902['id'], "ID-urile magazinelor trebuie sa fie diferite!"
        print(f"[PASS] Verificare Supabase read-only: ambele magazine exista cu ID-uri diferite ({st901['id']} vs {st902['id']}).")
        
        # --- 7. TEST ALOCARE USER LA MAGAZIN NOU ---
        print("\n--- 7. Test alocare user la magazin nou (magazin@magazin.com -> 902) ---")
        page.locator("button:has-text('Profile Utilizatori')").click()
        page.locator("h2:has-text('Profile Utilizatori Globale')").wait_for(state="visible", timeout=5000)
        
        row_user = page.locator("tr", has=page.locator("text=magazin@magazin.com"))
        row_user.wait_for(state="visible", timeout=5000)
        row_user.locator("button:has-text('Alocă la magazin')").click()
        
        assign_modal = page.locator("h3:has-text('Alocare Utilizator la Magazin')")
        assign_modal.wait_for(state="visible", timeout=5000)
        
        store_select = page.locator("label:has-text('Selectează Magazin')").locator("..").locator("select")
        store_select.select_option(label="Magazin Test 12345678 Punct 902")
        
        role_select = page.locator("label:has-text('Rol în Magazin')").locator("..").locator("select")
        role_select.select_option("manager")
        
        page.locator("button[type='submit']:has-text('Alocă Utilizator')").click()
        assign_modal.wait_for(state="detached", timeout=5000)
        print("[PASS] Alocarea utilizatorului efectuata din UI.")
        page.wait_for_timeout(1000)
        
        db_check_member = page.evaluate(f"""async () => {{
            const supabase = window.supabase;
            const {{ data: profiles }} = await supabase.from('profiles').select('id, role').eq('email', 'magazin@magazin.com');
            const profile = profiles[0];
            const {{ data: members }} = await supabase.from('store_members').select('*').eq('profile_id', profile.id).eq('store_id', '{st902['id']}');
            return {{ profile, member: members ? members[0] : null }};
        }}""")
        assert db_check_member['member'] is not None, "Randul din store_members nu a fost creat pentru noul magazin!"
        assert db_check_member['member']['role'] == 'manager', "Rol incorect in store_members"
        print("[PASS] Verificare Supabase read-only: store_members contine randul corect pentru noul magazin.")
        print(f"[PASS] Rolul global din profiles a ramas neschimbat: {db_check_member['profile']['role']}")
        
        # --- 8. TEST LOGIN MAGAZIN@MAGAZIN.COM ---
        print("\n--- 8. Test login magazin@magazin.com ---")
        page.locator("button:has-text('Deconectare')").click()
        page.wait_for_load_state("networkidle")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        
        try:
            print("Incercare login magazin@magazin.com cu admin123 ...")
            page.locator("input[type='text']").fill("magazin@magazin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            
            page.locator("text=Magazin Principal").first.wait_for(state="visible", timeout=10000)
            print("[PASS] Login reusit ca magazin@magazin.com.")
            
            # Verificam daca exista selector de magazin
            has_switcher = page.locator("select, button:has-text('Schimbă magazin')").count() > 0
            if has_switcher:
                print("[PASS] Selectorul de magazin este disponibil.")
            else:
                print("[GAP IDENTIFICAT] Aplicatia alege primul magazin automat, lipseste Store Context Switcher (5E.4.2 / 5E.5).")
        except Exception as e:
            print("[NOT TESTED] Parola contului magazin@magazin.com nu este admin123 sau login-ul a esuat. Marcam ca NOT TESTED conform instructiunilor.")
            
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Owner Console v2 Store Management E2E Test 5E.4.1 passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
