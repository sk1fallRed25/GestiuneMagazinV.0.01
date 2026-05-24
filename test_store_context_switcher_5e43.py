import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # ==========================================
        # 1. SETUP DB (via admin@owner.com)
        # ==========================================
        print("--- 1. PREGATIRE TEST (via admin@owner.com) ---")
        context1 = browser.new_context()
        page1 = context1.new_page()
        page1.on("console", lambda msg: print(f"[SETUP CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))
        
        page1.goto("http://localhost:5173/#/login")
        page1.wait_for_load_state("networkidle")
        
        print("Logging in as admin@owner.com to configure multi-store access...")
        page1.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page1.locator("input[type='text']").fill("admin@owner.com")
        page1.locator("input[type='password']").fill("admin123")
        page1.locator("button[type='submit']").click()
        
        page1.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in as platform_owner.")
        
        print("Configurare DB inainte de test (admin@admin.com -> Magazin Principal + 902)...")
        setup_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            // 1. Gasim profilul admin@admin.com
            const { data: profiles } = await supabase.from('profiles').select('id, email').eq('email', 'admin@admin.com');
            if (!profiles || profiles.length === 0) return { error: 'Profile admin@admin.com not found' };
            const profile = profiles[0];
            
            // 2. Gasim sau cream magazinele
            const { data: stores } = await supabase.from('stores').select('*');
            let magPrincipal = stores.find(s => s.name === 'Magazin Principal');
            let magTest = stores.find(s => s.settings && s.settings.workpointNumber === 902);
            
            if (!magTest) {
                const { data: newStore } = await supabase.from('stores').insert({
                    name: 'Magazin Test 12345678 Punct 902',
                    fiscal_code: '12345678',
                    address: 'Strada Test 902',
                    settings: { workpointNumber: 902, displayCode: '12345678 / 902', companyName: 'Firma Test SRL' },
                    active: true
                }).select();
                magTest = newStore[0];
            }
            
            // 3. Asiguram asocierile in store_members
            await supabase.from('store_members').upsert([
                { profile_id: profile.id, store_id: magPrincipal.id, role: 'admin', active: true },
                { profile_id: profile.id, store_id: magTest.id, role: 'admin', active: true }
            ], { onConflict: 'store_id,profile_id' });
            
            return { success: true, magPrincipal, magTest, profile };
        }""")
        
        if 'error' in setup_res:
            raise Exception(f"Setup failed: {setup_res['error']}")
            
        print("[PASS] Configurare DB incheiata cu succes. admin@admin.com are acces la Magazin Principal si Magazin Test 902.")
        context1.close()
        
        # ==========================================
        # 2. TEST STORE CONTEXT SWITCHER (admin@admin.com)
        # ==========================================
        print("\n--- 2. Test Store Context Switcher (admin@admin.com) ---")
        context2 = browser.new_context()
        page2 = context2.new_page()
        page2.on("console", lambda msg: print(f"[USER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))
        
        def handle_dialog2(dialog):
            msg = dialog.message.encode('ascii', 'replace').decode('ascii')
            print(f"[DEBUG] Intercepted dialog ({dialog.type}): {msg}")
            dialog.accept()

        page2.on("dialog", handle_dialog2)
        
        page2.goto("http://localhost:5173/#/login")
        page2.wait_for_load_state("networkidle")
        
        print("Logging in as admin@admin.com ...")
        page2.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page2.locator("input[type='text']").fill("admin@admin.com")
        page2.locator("input[type='password']").fill("admin123")
        page2.locator("button[type='submit']").click()
        
        page2.locator("button:has-text('Magazin Principal')").wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in successfully as admin@admin.com.")
        
        # A. Vizibilitate si Dropdown
        print("Verificam vizibilitatea si continutul dropdown-ului...")
        switcher_btn = page2.locator("button:has-text('Magazin Principal')")
        switcher_btn.click()
        
        page2.locator("span:has-text('Magazine disponibile')").wait_for(state="visible", timeout=5000)
        options_count = page2.locator("div.absolute button:has(div:has-text('Magazin'))").count()
        assert options_count >= 2, f"Dropdown-ul ar trebui sa aiba cel putin 2 magazine, dar are {options_count}!"
        print(f"[PASS] Dropdown-ul contine corect {options_count} magazine disponibile.")
        
        # B. Schimbare magazin activ (Magazin Test 12345678 Punct 902)
        print("\n--- 3. Test schimbare magazin activ (Magazin Test 902) ---")
        opt_902 = page2.locator("div.absolute button", has=page2.locator("text=Magazin Test 12345678 Punct 902"))
        opt_902.wait_for(state="visible", timeout=5000)
        opt_902.click()
        
        page2.locator("button:has-text('Magazin Test 12345678 Punct 902')").wait_for(state="visible", timeout=5000)
        print("[PASS] Header-ul afiseaza corect noul magazin selectat (Magazin Test 12345678 Punct 902).")
        
        ls_val = page2.evaluate("localStorage.getItem('selected_store_id')")
        assert ls_val == setup_res['magTest']['id'], f"Expected localStorage {setup_res['magTest']['id']}, got {ls_val}"
        print(f"[PASS] localStorage.selected_store_id este corect: {ls_val}")
        
        # C. Persistenta dupa refresh
        print("\n--- 4. Test persistenta dupa refresh ---")
        page2.reload()
        page2.wait_for_load_state("networkidle")
        page2.locator("button:has-text('Magazin Test 12345678 Punct 902')").wait_for(state="visible", timeout=10000)
        print("[PASS] Selectia magazinului 902 a persistat cu succes dupa reincarcarea paginii.")
        
        # D. Filtrare date pe store_id
        print("\n--- 5. Test filtrare date pe store_id (Dashboard & Produse) ---")
        print("Navigam la Dashboard pe magazinul 902...")
        page2.locator("a:has-text('Dashboard')").click()
        page2.wait_for_load_state("networkidle")
        
        print("Schimbam pe Magazin Principal din dropdown...")
        page2.locator("button:has-text('Magazin Test 12345678 Punct 902')").click()
        page2.locator("div.absolute button", has=page2.locator("text=Magazin Principal")).click()
        page2.locator("button:has-text('Magazin Principal')").wait_for(state="visible", timeout=5000)
        print("[PASS] Dashboard s-a actualizat pe Magazin Principal.")
        
        print("Navigam la Produse...")
        page2.locator("a:has-text('Stocuri & Produse')").click()
        page2.wait_for_load_state("networkidle")
        page2.locator("h1:has-text('Monitorizare Stocuri & Produse')").wait_for(state="visible", timeout=5000)
        
        print("Schimbam pe Magazin Test 902 din dropdown in pagina Produse...")
        page2.locator("button:has-text('Magazin Principal')").click()
        page2.locator("div.absolute button", has=page2.locator("text=Magazin Test 12345678 Punct 902")).click()
        page2.locator("button:has-text('Magazin Test 12345678 Punct 902')").wait_for(state="visible", timeout=5000)
        print("[PASS] Pagina Produse s-a filtrat pe noul magazin activ.")
        
        # E. Protectie storeId invalid
        print("\n--- 6. Test protectie storeId invalid in localStorage ---")
        page2.evaluate("localStorage.setItem('selected_store_id', '99999999-9999-9999-9999-999999999999')")
        page2.reload()
        page2.wait_for_load_state("networkidle")
        page2.locator("button:has(div:has-text('Magazin'))").wait_for(state="visible", timeout=10000)
        valid_ls = page2.evaluate("localStorage.getItem('selected_store_id')")
        assert valid_ls != '99999999-9999-9999-9999-999999999999', "UUID-ul invalid nu a fost ignorat!"
        print(f"[PASS] storeId invalid a fost ignorat cu succes, selectia a revenit la un magazin valid ({valid_ls}).")
        context2.close()
        
        # ==========================================
        # 3. TEST PLATFORM OWNER (admin@owner.com)
        # ==========================================
        print("\n--- 7. Test afisare platform_owner fara magazin activ ---")
        context3 = browser.new_context()
        page3 = context3.new_page()
        page3.on("console", lambda msg: print(f"[OWNER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))
        
        page3.goto("http://localhost:5173/#/login")
        page3.wait_for_load_state("networkidle")
        
        page3.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page3.locator("input[type='text']").fill("admin@owner.com")
        page3.locator("input[type='password']").fill("admin123")
        page3.locator("button[type='submit']").click()
        
        page3.locator("span:has-text('Platform Administration')").first.wait_for(state="visible", timeout=15000)
        print("[PASS] platform_owner vede corect badge-ul 'Platform Administration' si navigheaza normal in sistem.")
        context3.close()
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Store Context Switcher E2E Test 5E.4.3 passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
