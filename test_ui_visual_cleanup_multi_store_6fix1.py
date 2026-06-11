import sys
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # ==========================================
        # 1. SETUP DB (via admin@owner.com)
        # ==========================================
        safe_print("--- 1. PREGATIRE DATE DB (via admin@owner.com) ---")
        context1 = browser.new_context()
        page1 = context1.new_page()
        
        page1.goto("http://localhost:5174/#/login")
        page1.wait_for_load_state("networkidle")
        
        safe_print("Logging in as admin@owner.com to configure test stores...")
        page1.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page1.locator("input[type='text']").fill("admin@owner.com")
        page1.locator("input[type='password']").fill("admin123")
        page1.locator("button[type='submit']").click()
        
        page1.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        safe_print("[PASS] Logged in as platform_owner.")
        
        safe_print("Configurare DB inainte de test (magazine active, suspendate si arhivate)...")
        setup_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            // 1. Gasim profilul admin@admin.com
            const { data: profiles } = await supabase.from('profiles').select('id, email').eq('email', 'admin@admin.com');
            if (!profiles || profiles.length === 0) return { error: 'Profile admin@admin.com not found' };
            const profile = profiles[0];
            
            // 2. Gasim sau cream magazinele
            const { data: stores } = await supabase.from('stores').select('*');
            let magPrincipal = stores.find(s => s.name === 'Magazin Principal');
            if (!magPrincipal) {
                if (stores.length > 0) {
                    magPrincipal = stores[0];
                } else {
                    const { data: newStore } = await supabase.from('stores').insert({
                        name: 'Magazin Principal',
                        fiscal_code: '12345678',
                        address: 'Strada Principala 1',
                        settings: { workpointNumber: 1, displayCode: '12345678 / 1' },
                        active: true,
                        lifecycle_status: 'active'
                    }).select();
                    magPrincipal = newStore[0];
                }
            }
            
            let magSuspended = stores.find(s => s.name === 'Magazin Suspendat E2E');
            if (!magSuspended) {
                const { data: newStore } = await supabase.from('stores').insert({
                    name: 'Magazin Suspendat E2E',
                    fiscal_code: '87654321',
                    address: 'Strada Suspendata 12',
                    settings: { workpointNumber: 777, displayCode: '87654321 / 777' },
                    active: false,
                    lifecycle_status: 'suspended'
                }).select();
                magSuspended = newStore[0];
            } else {
                await supabase.from('stores').update({ active: false, lifecycle_status: 'suspended' }).eq('id', magSuspended.id);
            }
            
            let magArchived = stores.find(s => s.name === 'Magazin Arhivat E2E');
            if (!magArchived) {
                const { data: newStore2 } = await supabase.from('stores').insert({
                    name: 'Magazin Arhivat E2E',
                    fiscal_code: '99991111',
                    address: 'Strada Arhivelor 9',
                    settings: { workpointNumber: 888, displayCode: '99991111 / 888' },
                    active: false,
                    lifecycle_status: 'archived'
                }).select();
                magArchived = newStore2[0];
            } else {
                await supabase.from('stores').update({ active: false, lifecycle_status: 'archived' }).eq('id', magArchived.id);
            }

            let magTest = stores.find(s => s.name === 'Magazin Test E2E');
            if (!magTest) {
                const { data: newStore3 } = await supabase.from('stores').insert({
                    name: 'Magazin Test E2E',
                    fiscal_code: '44445555',
                    address: 'Strada Test E2E 3',
                    settings: { workpointNumber: 999, displayCode: '44445555 / 999' },
                    active: true,
                    lifecycle_status: 'active'
                }).select();
                magTest = newStore3[0];
            } else {
                await supabase.from('stores').update({ active: true, lifecycle_status: 'active' }).eq('id', magTest.id);
            }
            
            // Ensure AI Consultant and store settings modules are enabled for principal store
            try {
                await supabase.rpc('set_store_module_access', {
                    p_store_id: magPrincipal.id,
                    p_module_key: 'ai_consultant',
                    p_enabled: true,
                    p_reason: 'Setup E2E Test'
                });
                await supabase.rpc('set_store_module_access', {
                    p_store_id: magPrincipal.id,
                    p_module_key: 'store_settings',
                    p_enabled: true,
                    p_reason: 'Setup E2E Test'
                });
            } catch (err) {
                console.error("Module RPC error:", err);
            }

            // 3. Asiguram asocierile in store_members
            await supabase.from('store_members').upsert([
                { profile_id: profile.id, store_id: magPrincipal.id, role: 'admin', active: true },
                { profile_id: profile.id, store_id: magTest.id, role: 'admin', active: true },
                { profile_id: profile.id, store_id: magSuspended.id, role: 'admin', active: true },
                { profile_id: profile.id, store_id: magArchived.id, role: 'admin', active: true }
            ], { onConflict: 'store_id,profile_id' });
            
            return { success: true, magPrincipal, magTest, magSuspended, magArchived, profile };
        }""")
        
        if 'error' in setup_res:
            raise Exception(f"Setup failed: {setup_res['error']}")
            
        active_store_name = setup_res['magPrincipal']['name']
        safe_print(f"[PASS] Date DB pregatite cu succes. Nume magazin principal: {active_store_name}")
        context1.close()
        
        # ==========================================
        # 2. TEST TOGGLES VISUAL ATTRIBUTES
        # ==========================================
        safe_print("\n--- 2. Testare Atribute Vizuale AI Consent Toggles ---")
        context2 = browser.new_context()
        page2 = context2.new_page()
        
        # Monitor console logs
        page2.on("console", lambda msg: safe_print(f"CONSOLE (settings): {msg.text}"))
        
        page2.goto("http://localhost:5174/#/login")
        page2.wait_for_load_state("networkidle")
        
        safe_print("Logging in as admin@admin.com ...")
        page2.locator("input[type='text']").fill("admin@admin.com")
        page2.locator("input[type='password']").fill("admin123")
        page2.locator("button[type='submit']").click()
        
        page2.locator("#store-context-switcher-btn").wait_for(state="visible", timeout=15000)
        
        # Navigare la Setari Magazin
        page2.goto("http://localhost:5174/#/setari-magazin")
        page2.wait_for_load_state("networkidle")
        
        try:
            # Gasire toggles in DOM
            toggle_helper = page2.locator("[data-testid='ai-consent-toggle']").first
            toggle_helper.wait_for(state="attached", timeout=15000)
            
            # Gasire buttonul aferent
            switch_button = page2.locator("button[role='switch']").first
            switch_button.wait_for(state="visible", timeout=5000)
            
            # Verificare clase styling contrast (border-slate-400 sau border-slate-550)
            class_attr = switch_button.evaluate("el => el.className")
            safe_print(f"Clasele switch-ului: {class_attr}")
            assert "border-slate-400" in class_attr or "border-slate-550" in class_attr or "border-indigo" in class_attr, "Toggle should have high contrast borders!"
            safe_print("[PASS] Toggles au clasa de contrast ceruta pentru border.")
        except Exception as e:
            page2.screenshot(path="failed_ai_consent.png")
            safe_print(f"Failed setting toggles check. URL: {page2.url}")
            raise e
        finally:
            context2.close()
        
        # ==========================================
        # 3. TEST STORE CONTEXT SWITCHER INTERACTIVE
        # ==========================================
        safe_print("\n--- 3. Testare Store Switcher interactive dropdown (CUI, Rol, statusuri) ---")
        context3 = browser.new_context()
        page3 = context3.new_page()
        page3.goto("http://localhost:5174/#/login")
        page3.wait_for_load_state("networkidle")
        
        page3.locator("input[type='text']").fill("admin@admin.com")
        page3.locator("input[type='password']").fill("admin123")
        page3.locator("button[type='submit']").click()
        
        page3.locator("#store-context-switcher-btn").wait_for(state="visible", timeout=15000)
        dynamic_active_store = page3.locator("#store-context-switcher-btn p").first.text_content().strip()
        
        # Click pe switcher
        page3.locator("#store-context-switcher-btn").click()
        page3.locator("span:has-text('Magazine disponibile')").wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Dropdown-ul a fost deschis.")
        
        # Verificam ca CUI si Rol sunt afisate pentru un magazin
        principal_option = page3.locator("button:not(#store-context-switcher-btn)", has=page3.locator(f"text='{dynamic_active_store}'"))
        # Rolul este listat
        assert principal_option.locator("text=admin").first.is_visible(), "Rolul nu este vizibil!"
        safe_print("[PASS] Rolul este vizibil in optiunea dropdown.")
        
        # Verificam ca optiunile Suspendat si Arhivat sunt disabled
        opt_suspended = page3.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Suspendat E2E")
        opt_archived = page3.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Arhivat E2E")
        
        assert opt_suspended.is_disabled(), "Magazinul suspendat ar trebui sa fie disabled!"
        assert opt_archived.is_disabled(), "Magazinul arhivat ar trebui sa fie disabled!"
        safe_print("[PASS] Optiunile suspendate si arhivele sunt corect disabled in dropdown.")
        context3.close()
        
        # ==========================================
        # 4. TEST TRANSFER MARFA VALIDATIONS & UX
        # ==========================================
        safe_print("\n--- 4. Testare Transfer Marfa (validari, identice, suspendate, Summary Preview) ---")
        context4 = browser.new_context()
        page4 = context4.new_page()
        
        page4.goto("http://localhost:5174/#/login")
        page4.wait_for_load_state("networkidle")
        page4.locator("input[type='text']").fill("admin@admin.com")
        page4.locator("input[type='password']").fill("admin123")
        page4.locator("button[type='submit']").click()
        
        page4.locator("#store-context-switcher-btn").wait_for(state="visible", timeout=15000)
        dynamic_active_store = page4.locator("#store-context-switcher-btn p").first.text_content().strip()
        
        # Navigare la Transfer Marfă
        page4.locator("a:has-text('Transfer Marfă')").click()
        page4.wait_for_load_state("networkidle")
        
        # Verificam existenta selectors
        source_select = page4.locator("[data-testid='transfer-source-select']")
        dest_select = page4.locator("[data-testid='transfer-destination-select']")
        
        # Daca are o singura optiune activa (locked in a div), textul contine numele magazinului.
        # Daca e select element, selectam optiunea
        is_select = source_select.evaluate("el => el.tagName === 'SELECT'")
        if is_select:
            source_select.select_option(label=dynamic_active_store)
            
        dest_select.select_option(label=dynamic_active_store)
        
        err_block = page4.locator("[data-testid='transfer-validation-error']")
        err_block.wait_for(state="visible", timeout=5000)
        err_text = err_block.text_content()
        safe_print(f"Eroare identitate: {err_text}")
        assert "identice" in err_text or "identică" in err_text or "aceleași" in err_text, "Should show validation error for identical stores"
        
        # Test validator: magazin suspendat/arhivat selectat
        suspended_opt = dest_select.locator("option", has_text="Magazin Suspendat E2E")
        assert suspended_opt.is_disabled(), "Option for suspended store should be disabled!"
        safe_print("[PASS] Option for suspended store is disabled in select element.")
        
        # Test Summary Preview
        dest_select.select_option(label="Magazin Test E2E")
        # Summary Preview should list the selected stores
        summary = page4.locator("[data-testid='transfer-summary-preview']")
        summary.wait_for(state="visible", timeout=5000)
        summary_text = summary.text_content()
        safe_print(f"Sumar transfer: {summary_text}")
        assert active_store_name in summary_text and "Magazin Test E2E" in summary_text, "Summary preview does not show source/dest stores"
        safe_print("[PASS] Summary preview contine datele corecte de directie.")
        context4.close()
        
        # ==========================================
        # 5. TEST OWNER CONSOLE & TABS VISUAL CLEANUP
        # ==========================================
        safe_print("\n--- 5. Testare Owner Console (alerta dismissibila, Tab Arhivate, Pachete grid) ---")
        context5 = browser.new_context()
        page5 = context5.new_page()
        
        page5.goto("http://localhost:5174/#/login")
        page5.wait_for_load_state("networkidle")
        page5.locator("input[type='text']").fill("admin@owner.com")
        page5.locator("input[type='password']").fill("admin123")
        page5.locator("button[type='submit']").click()
        
        # Asteptam incarcarea Owner Console
        page5.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        
        # Verificam alerta si dismiss-ul ei
        alert_danger = page5.locator("[data-testid='owner-alert-danger']")
        if alert_danger.is_visible():
            safe_print("Alerta detectata. Inchidem alerta...")
            close_btn = page5.locator("[data-testid='owner-alert-close']")
            close_btn.click()
            page5.wait_for_timeout(500)
            assert not alert_danger.is_visible(), "Alerta ar trebui sa dispara dupa dismiss!"
            safe_print("[PASS] Alerta a fost inchisa.")
        
        # Click pe tab-ul Magazine Arhivate
        tab_arhivate = page5.locator("[data-testid='owner-console-tab-archived-stores']")
        tab_arhivate.click()
        
        # Verificam ca exista un tabel cu magazinul arhivat selectat
        mag_archived_row = page5.locator("td:has-text('Magazin Arhivat E2E')")
        mag_archived_row.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Magazinele arhivate sunt afisate corect in tab-ul dedicat.")
        
        # Click pe Pachete Comerciale
        tab_pachete = page5.locator("[data-testid='owner-console-tab-commercial-packages']")
        tab_pachete.click()
        
        # Verificam existenta tabelului/gridului de pachete comerciale
        page5.locator("text=Bronze").first.wait_for(state="visible", timeout=5000)
        safe_print("[PASS] Pachetele comerciale si grila de preturi sunt vizibile.")
        
        context5.close()
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] E2E Visual UX Cleanup & Multi-Store E2E Test Suite Passed!")
        sys.exit(0)
    except Exception as e:
        safe_print(f"\n[FAIL] Test esuat: {e}")
        sys.exit(1)
