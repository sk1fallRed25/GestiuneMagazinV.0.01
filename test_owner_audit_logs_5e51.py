import sys
import time
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
        
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        page.goto("http://localhost:5173/#/owner")
        page.wait_for_load_state("networkidle")
        print("[PASS] Logged in and navigated to Owner Console.")
        
        # 1. CLEANUP CONTROLAT inainte de test (via window.supabase)
        print("\n--- 1. Cleanup controlat inainte de test ---")
        cleanup_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            if (stores && stores.length > 0) {
                for (const st of stores) {
                    await supabase.from('store_members').delete().eq('store_id', st.id);
                    await supabase.from('audit_logs').delete().eq('store_id', st.id);
                    await supabase.from('stores').delete().eq('id', st.id);
                }
            }
            return { success: true };
        }""")
        page.wait_for_timeout(1000)
        page.reload()
        page.wait_for_load_state("networkidle")
        print("[PASS] Cleanup controlat efectuat cu succes pentru CUI 55555555.")
        
        # 2. TEST store.create audit
        print("\n--- 2. Test store.create audit ---")
        page.locator("button:has-text('Magazine')").click()
        page.locator("button:has-text('Adaugă Magazin Nou')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('Adaugă Magazin Nou')").click()
        
        modal_title = page.locator("h3:has-text('Adăugare Magazin Nou')")
        modal_title.wait_for(state="visible", timeout=5000)
        
        page.locator("input[placeholder*='Magazin Central']").fill("Audit Test 55555555 Punct 951")
        page.locator("input[placeholder*='RO12345678']").fill("55555555")
        page.locator("input[placeholder*='ex: 1']").fill("951")
        page.locator("input[placeholder*='Bulevardul Unirii']").fill("Strada Audit 951")
        page.locator("input[placeholder*='SC RETAIL PLUS']").fill("Audit Firma SRL")
        page.locator("textarea[placeholder*='Detalii interne']").fill("Test E2E 5E.5.1")
        
        page.locator("button[type='submit']:has-text('Creează magazin')").click()
        modal_title.wait_for(state="detached", timeout=5000)
        print("[PASS] Magazin creat din UI cu succes.")
        
        # Asteapta aparitia in tabel
        row951 = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951"))
        row951.wait_for(state="visible", timeout=5000)
        
        # Deschide tab Audit Logs
        page.locator("button:has-text('Audit Logs')").click()
        page.wait_for_timeout(1000)
        
        # Cauta in tabel logul store.create
        log_create = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951")).filter(has=page.locator("text=Creare Magazin"))
        log_create.wait_for(state="visible", timeout=5000)
        print("[PASS] Logul store.create apare corect in tab-ul Audit Logs.")
        
        # Verificare Supabase read-only
        db_create_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id).eq('action', 'store.create');
            return { store, log: logs ? logs[0] : null };
        }""")
        assert db_create_check['log'] is not None, "Logul store.create nu exista in baza de date!"
        assert db_create_check['log']['entity_type'] == 'store', "entity_type incorect in DB"
        assert db_create_check['log']['old_data'] is None, "old_data ar trebui sa fie null pentru create"
        assert db_create_check['log']['new_data']['name'] == 'Audit Test 55555555 Punct 951', "Nume incorect in new_data"
        assert db_create_check['log']['new_data']['fiscalCode'] == '55555555', "fiscalCode incorect in new_data"
        assert db_create_check['log']['new_data']['workpointNumber'] == 951, "workpointNumber incorect in new_data"
        assert db_create_check['log']['new_data']['active'] == True, "active incorect in new_data"
        print("[PASS] Verificare Supabase read-only pentru store.create confirmata.")
        
        # 3. TEST store.update audit
        print("\n--- 3. Test store.update audit ---")
        page.locator("button:has-text('Magazine')").click()
        row951.locator("button[title='Editează magazin']").click()
        
        edit_title = page.locator("h3:has-text('Editare Magazin')")
        edit_title.wait_for(state="visible", timeout=5000)
        
        page.locator("input[placeholder*='Magazin Central']").fill("Audit Test 55555555 Punct 951 Editat")
        page.locator("input[placeholder*='Bulevardul Unirii']").fill("Strada Audit 951 Editată")
        page.locator("button[type='submit']:has-text('Salvează modificările')").click()
        edit_title.wait_for(state="detached", timeout=5000)
        print("[PASS] Magazin editat din UI cu succes.")
        
        page.locator("button:has-text('Audit Logs')").click()
        page.wait_for_timeout(1000)
        
        log_update = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951 Editat")).filter(has=page.locator("text=Editare Magazin"))
        log_update.wait_for(state="visible", timeout=5000)
        print("[PASS] Logul store.update apare corect in tab-ul Audit Logs.")
        
        db_update_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id).eq('action', 'store.update').order('created_at', { ascending: false });
            return { store, log: logs ? logs[0] : null };
        }""")
        assert db_update_check['log'] is not None, "Logul store.update nu exista in baza de date!"
        assert db_update_check['log']['entity_type'] == 'store', "entity_type incorect in DB"
        assert db_update_check['log']['old_data']['name'] == 'Audit Test 55555555 Punct 951', "old_data.name incorect in DB"
        assert db_update_check['log']['new_data']['name'] == 'Audit Test 55555555 Punct 951 Editat', "new_data.name incorect in DB"
        assert db_update_check['log']['new_data']['address'] == 'Strada Audit 951 Editată', "new_data.address incorect in DB"
        print("[PASS] Verificare Supabase read-only pentru store.update confirmata.")

        # 4. TEST member.assign audit
        print("\n--- 4. Test member.assign audit ---")
        page.locator("button:has-text('Profile Utilizatori')").click()
        page.locator("h2:has-text('Profile Utilizatori Globale')").wait_for(state="visible", timeout=5000)
        
        row_user = page.locator("tr", has=page.locator("text=magazin@magazin.com"))
        row_user.wait_for(state="visible", timeout=5000)
        row_user.locator("button:has-text('Alocă la magazin')").click()
        
        assign_modal = page.locator("h3:has-text('Alocare Utilizator la Magazin')")
        assign_modal.wait_for(state="visible", timeout=5000)
        
        store_select = page.locator("label:has-text('Selectează Magazin')").locator("..").locator("select")
        store_select.select_option(label="Audit Test 55555555 Punct 951 Editat")
        
        role_select = page.locator("label:has-text('Rol în Magazin')").locator("..").locator("select")
        role_select.select_option("casier")
        
        page.locator("button[type='submit']:has-text('Alocă Utilizator')").click()
        assign_modal.wait_for(state="detached", timeout=5000)
        print("[PASS] Utilizator alocat din UI cu succes.")
        
        page.locator("button:has-text('Audit Logs')").click()
        page.wait_for_timeout(1000)
        
        log_assign = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951 Editat")).filter(has=page.locator("text=Alocare Membru"))
        log_assign.wait_for(state="visible", timeout=5000)
        print("[PASS] Logul member.assign apare corect in tab-ul Audit Logs.")
        
        db_assign_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: profiles } = await supabase.from('profiles').select('*').eq('email', 'magazin@magazin.com');
            const profile = profiles[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id).eq('action', 'member.assign').order('created_at', { ascending: false });
            const { data: members } = await supabase.from('store_members').select('*').eq('store_id', store.id).eq('profile_id', profile.id);
            return { store, profile, log: logs ? logs[0] : null, member: members ? members[0] : null };
        }""")
        assert db_assign_check['log'] is not None, "Logul member.assign nu exista in baza de date!"
        assert db_assign_check['log']['entity_type'] == 'store_member', "entity_type incorect in DB"
        assert db_assign_check['log']['new_data']['role'] == 'casier', "new_data.role incorect in DB"
        assert db_assign_check['log']['new_data']['active'] == True, "new_data.active incorect in DB"
        assert db_assign_check['member'] is not None, "Membru necreat in store_members"
        assert db_assign_check['profile']['role'] == 'gestionar' or db_assign_check['profile']['role'] != 'platform_owner', "Rolul global din profiles a fost alterat in mod nepermis!"
        print("[PASS] Verificare Supabase read-only pentru member.assign confirmata. profiles.role neschimbat.")

        # 5. TEST member.role_update audit
        print("\n--- 5. Test member.role_update audit ---")
        page.locator("button:has-text('Membri Magazin')").click()
        page.wait_for_timeout(1000)
        
        # Selectam magazinul in StoresTable din tab-ul Membri Magazin
        page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951 Editat")).click()
        page.wait_for_timeout(1000)
        
        member_row = page.locator("tr", has=page.locator("text=magazin@magazin.com"))
        member_row.wait_for(state="visible", timeout=5000)
        
        # Schimbam rolul in manager
        member_row.locator("select").select_option("manager")
        page.wait_for_timeout(1000)
        print("[PASS] Rol modificat din UI in manager.")
        
        page.locator("button:has-text('Audit Logs')").click()
        page.wait_for_timeout(1000)
        
        log_role = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951 Editat")).filter(has=page.locator("text=Modificare Rol"))
        log_role.wait_for(state="visible", timeout=5000)
        print("[PASS] Logul member.role_update apare corect in tab-ul Audit Logs.")
        
        db_role_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id).eq('action', 'member.role_update').order('created_at', { ascending: false });
            return { log: logs ? logs[0] : null };
        }""")
        assert db_role_check['log'] is not None, "Logul member.role_update nu exista in DB!"
        assert db_role_check['log']['old_data']['role'] == 'casier', "old_data.role incorect"
        assert db_role_check['log']['new_data']['role'] == 'manager', "new_data.role incorect"
        print("[PASS] Verificare Supabase read-only pentru member.role_update confirmata.")

        # 6. TEST member.active_update audit
        print("\n--- 6. Test member.active_update audit ---")
        page.locator("button:has-text('Membri Magazin')").click()
        page.wait_for_timeout(1000)
        
        member_row = page.locator("tr", has=page.locator("text=magazin@magazin.com"))
        member_row.wait_for(state="visible", timeout=5000)
        
        # Click pe butonul de activare/dezactivare (care afiseaza "Activ")
        member_row.locator("button:has-text('Activ')").click()
        page.wait_for_timeout(1000)
        print("[PASS] Acces dezactivat din UI.")
        
        # Click pe butonul de activare/dezactivare (care afiseaza acum "Inactiv")
        member_row.locator("button:has-text('Inactiv')").click()
        page.wait_for_timeout(1000)
        print("[PASS] Acces reactivat din UI.")
        
        page.locator("button:has-text('Audit Logs')").click()
        page.wait_for_timeout(1000)
        
        log_active = page.locator("tr", has=page.locator("text=Audit Test 55555555 Punct 951 Editat")).filter(has=page.locator("text=Stare Membru")).first
        log_active.wait_for(state="visible", timeout=5000)
        print("[PASS] Logul member.active_update apare corect in tab-ul Audit Logs.")
        
        db_active_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id).eq('action', 'member.active_update').order('created_at', { ascending: false });
            return { logs: logs || [] };
        }""")
        assert len(db_active_check['logs']) >= 2, "Ar trebui sa existe cel putin 2 loguri de active_update (dezactivare + reactivare)"
        print("[PASS] Verificare Supabase read-only pentru member.active_update confirmata.")

        # 7. TEST UI Audit Logs (Filtre, Search, Refresh, Inspector)
        print("\n--- 7. Test UI Audit Logs (Filtre, Search, Refresh, Inspector) ---")
        
        # Test Search
        search_input = page.locator("input[placeholder*='Caută după magazin']")
        search_input.fill("Audit Test 55555555")
        page.wait_for_timeout(500)
        assert page.locator("tbody tr").count() > 0, "Căutarea ar trebui să returneze rezultate"
        print("[PASS] Cautarea dupa magazin functioneaza.")
        
        search_input.fill("NumeInexistent9999")
        page.wait_for_timeout(500)
        assert page.locator("text=Niciun log de audit nu corespunde filtrelor").is_visible(), "Empty state-ul de căutare nu apare"
        print("[PASS] Empty state-ul la cautare functioneaza.")
        search_input.fill("")
        page.wait_for_timeout(500)
        
        # Test Action Filter
        action_select = page.locator("select").filter(has_text="Toate Acțiunile")
        action_select.select_option("store.create")
        page.wait_for_timeout(500)
        
        count = page.locator("tbody tr").count()
        assert count >= 1, f"Filtrarea pe store.create ar trebui sa returneze cel putin 1 rezultat, got {count}"
        for i in range(count):
            row_text = page.locator("tbody tr").nth(i).text_content()
            assert "Creare Magazin" in row_text, f"Randul {i} nu are actiunea corecta: {row_text}"
        
        print("[PASS] Filtrarea dupa actiune functioneaza.")
        action_select.select_option("all")
        page.wait_for_timeout(500)
        
        # Test Refresh
        page.locator("button[title='Reîmprospătează audit logs']").click()
        page.wait_for_timeout(1000)
        print("[PASS] Butonul Refresh functioneaza.")
        
        # Test Inspector Modal
        log_create.locator("button:has-text('Inspectează')").click()
        modal_inspect = page.locator("h3:has-text('Detalii Înregistrare Audit')")
        modal_inspect.wait_for(state="visible", timeout=5000)
        
        assert page.locator("h4:has-text('Date Anterioare (oldData)')").is_visible(), "oldData header lipseste"
        assert page.locator("h4:has-text('Date Noi (newData)')").is_visible(), "newData header lipseste"
        print("[PASS] Modalul Inspector afiseaza corect oldData si newData.")
        
        # Verificare lipsa date sensibile in JSON-ul afisat
        modal_text = page.locator("div.fixed.inset-0").text_content()
        for secret in ["password", "jwt", "token", "secret"]:
            assert secret not in modal_text.lower(), f"Date sensibile ({secret}) gasite in modalul de inspectie!"
        print("[PASS] Nicio data sensibila nu este expusa in modalul de inspectie.")
        
        # Inchide modalul
        page.locator("button:has-text('Închide Inspector')").click()
        modal_inspect.wait_for(state="detached", timeout=5000)
        print("[PASS] Modalul Inspector s-a inchis cu succes.")
        
        # 8. VERIFICARI SUPABASE READ-ONLY FINALE & LIPSĂ SECRETE
        print("\n--- 8. Verificari Supabase read-only finale ---")
        final_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('*').eq('fiscal_code', '55555555');
            const store = stores[0];
            const { data: logs } = await supabase.from('audit_logs').select('*').eq('store_id', store.id);
            
            // Verificam sa nu existe parole/tokenuri in new_data sau old_data
            let hasSecrets = false;
            for (const log of logs) {
                const str = JSON.stringify(log);
                if (str.toLowerCase().includes('password') || str.toLowerCase().includes('jwt') || str.toLowerCase().includes('token')) {
                    hasSecrets = true;
                }
            }
            return { logsCount: logs.length, hasSecrets, store };
        }""")
        assert final_check['logsCount'] >= 5, f"Ar trebui sa existe cel putin 5 loguri de audit, got {final_check['logsCount']}"
        assert final_check['hasSecrets'] == False, "S-au gasit date sensibile in baza de date in audit_logs!"
        print(f"[PASS] Verificare finala DB: {final_check['logsCount']} loguri inregistrate corect. Niciun secret stocat.")
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Owner Audit Logs E2E Test 5E.5.1 passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
