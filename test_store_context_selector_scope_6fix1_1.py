import sys
import time
from playwright.sync_api import sync_playwright

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def get_active_port():
    import socket
    for p in ["5173", "5174", "5175", "5176"]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.3)
            s.connect(("localhost", int(p)))
            s.close()
            return p
        except Exception:
            pass
    return "5173"  # default fallback

def run_teardown(browser, port="5173"):
    safe_print("\n--- 5. TEARDOWN DATE DB (via admin@owner.com) ---")
    try:
        context_td = browser.new_context()
        page_td = context_td.new_page()
        page_td.goto(f"http://localhost:{port}/#/login")
        page_td.wait_for_load_state("networkidle")
        page_td.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page_td.locator("input[type='text']").fill("admin@owner.com")
        page_td.locator("input[type='password']").fill("admin123")
        page_td.locator("button[type='submit']").click()
        page_td.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        
        teardown_res = page_td.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id, name');
            const e2eStores = stores.filter(s => s.name.includes('E2E'));
            const e2eStoreIds = e2eStores.map(s => s.id);
            
            if (e2eStoreIds.length > 0) {
                // 1. Stergem store_members pentru aceste magazine
                await supabase.from('store_members').delete().in('store_id', e2eStoreIds);
                // 2. Stergem audit_logs pentru aceste magazine
                try {
                    await supabase.from('audit_logs').delete().in('store_id', e2eStoreIds);
                } catch(e) {}
                // 3. Stergem magazinele
                const { error } = await supabase.from('stores').delete().in('id', e2eStoreIds);
                if (error) return { error: error.message };
            }
            return { success: true, deleted_count: e2eStoreIds.length };
        }""")
        safe_print(f"Teardown result: {teardown_res}")
        context_td.close()
    except Exception as td_err:
        safe_print(f"Teardown failed: {td_err}")

def run_test():
    port = get_active_port()
    safe_print(f"Using active port: {port}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        try:
            # ==========================================
            # 1. SETUP DB (via admin@owner.com)
            # ==========================================
            safe_print("--- 1. PREGATIRE DATE DB (via admin@owner.com) ---")
            context1 = browser.new_context()
            page1 = context1.new_page()
            
            page1.goto(f"http://localhost:{port}/#/login")
            page1.wait_for_load_state("networkidle")
            
            safe_print("Logging in as admin@owner.com to configure test stores...")
            page1.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page1.locator("input[type='text']").fill("admin@owner.com")
            page1.locator("input[type='password']").fill("admin123")
            page1.locator("button[type='submit']").click()
            
            page1.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            safe_print("[PASS] Logged in as platform_owner.")
            
            setup_res = page1.evaluate("""async () => {
                const supabase = window.supabase;
                
                // 1. Gasim profilul admin@admin.com si casier@casier.com
                const { data: adminProfiles } = await supabase.from('profiles').select('id, email').eq('email', 'admin@admin.com');
                const { data: casierProfiles } = await supabase.from('profiles').select('id, email').eq('email', 'casier@casier.com');
                
                if (!adminProfiles || adminProfiles.length === 0) return { error: 'Profile admin@admin.com not found' };
                const adminUser = adminProfiles[0];
                const casierUser = casierProfiles && casierProfiles.length > 0 ? casierProfiles[0] : null;
                
                // 2. Cream sau gasim magazine
                const { data: stores } = await supabase.from('stores').select('*');
                
                let magPrincipal = stores.find(s => s.name === 'Magazin Principal');
                if (!magPrincipal) {
                    const { data: ns, error: insErr } = await supabase.from('stores').insert({
                        name: 'Magazin Principal',
                        fiscal_code: '12345678',
                        address: 'Strada Principala 1',
                        settings: { workpointNumber: 1, displayCode: '12345678 / 1' },
                        active: true,
                        lifecycle_status: 'active'
                    }).select();
                    if (insErr) return { error: `Failed to insert Magazin Principal: ${insErr.message}` };
                    magPrincipal = ns[0];
                } else {
                    await supabase.from('stores').update({ active: true, lifecycle_status: 'active' }).eq('id', magPrincipal.id);
                }
                
                let magTest = stores.find(s => s.name === 'Magazin Test E2E');
                if (!magTest) {
                    const { data: ns } = await supabase.from('stores').insert({
                        name: 'Magazin Test E2E',
                        fiscal_code: '44445555',
                        address: 'Strada Test 3',
                        settings: { workpointNumber: 999, displayCode: '44445555 / 999' },
                        active: true,
                        lifecycle_status: 'active'
                    }).select();
                    magTest = ns[0];
                } else {
                    await supabase.from('stores').update({ active: true, lifecycle_status: 'active' }).eq('id', magTest.id);
                }
                
                let magSuspended = stores.find(s => s.name === 'Magazin Suspendat E2E');
                if (!magSuspended) {
                    const { data: ns } = await supabase.from('stores').insert({
                        name: 'Magazin Suspendat E2E',
                        fiscal_code: '87654321',
                        address: 'Strada Suspendata 12',
                        settings: { workpointNumber: 777, displayCode: '87654321 / 777' },
                        active: false,
                        lifecycle_status: 'suspended'
                    }).select();
                    magSuspended = ns[0];
                } else {
                    await supabase.from('stores').update({ active: false, lifecycle_status: 'suspended' }).eq('id', magSuspended.id);
                }
                
                let magArchived = stores.find(s => s.name === 'Magazin Arhivat E2E');
                if (!magArchived) {
                    const { data: ns } = await supabase.from('stores').insert({
                        name: 'Magazin Arhivat E2E',
                        fiscal_code: '99991111',
                        address: 'Strada Arhivelor 9',
                        settings: { workpointNumber: 888, displayCode: '99991111 / 888' },
                        active: false,
                        lifecycle_status: 'archived'
                    }).select();
                    magArchived = ns[0];
                } else {
                    await supabase.from('stores').update({ active: false, lifecycle_status: 'archived' }).eq('id', magArchived.id);
                }
                
                // Magazin secret pe care admin@admin.com NU trebuie sa-l vada
                let magSecret = stores.find(s => s.name === 'Magazin Secret Owner E2E');
                if (!magSecret) {
                    const { data: ns } = await supabase.from('stores').insert({
                        name: 'Magazin Secret Owner E2E',
                        fiscal_code: '77777777',
                        address: 'Strada Secreta 7',
                        settings: { workpointNumber: 77, displayCode: '77777777 / 77' },
                        active: true,
                        lifecycle_status: 'active'
                    }).select();
                    magSecret = ns[0];
                } else {
                    await supabase.from('stores').update({ active: true, lifecycle_status: 'active' }).eq('id', magSecret.id);
                }
                
                // 3. Asocieri store_members pentru admin@admin.com
                const { error: delErr } = await supabase.from('store_members').delete().eq('profile_id', adminUser.id);
                if (delErr) return { error: `Delete store_members failed: ${delErr.message}` };
                
                const { error: insErr } = await supabase.from('store_members').insert([
                    { profile_id: adminUser.id, store_id: magPrincipal.id, role: 'admin', active: true },
                    { profile_id: adminUser.id, store_id: magTest.id, role: 'admin', active: true },
                    { profile_id: adminUser.id, store_id: magSuspended.id, role: 'admin', active: true },
                    { profile_id: adminUser.id, store_id: magArchived.id, role: 'admin', active: true }
                ]);
                if (insErr) return { error: `Insert store_members failed: ${insErr.message}` };
                
                // 4. Asocieri store_members pentru casier@casier.com (doar magPrincipal)
                if (casierUser) {
                    const { error: delCasErr } = await supabase.from('store_members').delete().eq('profile_id', casierUser.id);
                    if (delCasErr) return { error: `Delete casier store_members failed: ${delCasErr.message}` };
                    
                    const { error: insCasErr } = await supabase.from('store_members').insert([
                        { profile_id: casierUser.id, store_id: magPrincipal.id, role: 'casier', active: true }
                    ]);
                    if (insCasErr) return { error: `Insert casier store_members failed: ${insCasErr.message}` };
                }
                
                const { data: finalMemberships } = await supabase.from('store_members').select('*, store:stores(name)').eq('profile_id', adminUser.id);
                return { success: true, magPrincipal, magTest, magSuspended, magArchived, magSecret, finalMemberships, stores };
            }""")
            
            if 'error' in setup_res:
                raise Exception(f"Setup failed: {setup_res['error']}")
                
            safe_print("[PASS] Date DB pregatite cu succes.")
            context1.close()
            
            # ==========================================
            # 2. VERIFICARE SWITCHER DROPDOWN (admin@admin.com)
            # ==========================================
            safe_print("\n--- 2. Verificare Switcher Dropdown (admin@admin.com) ---")
            context2 = browser.new_context()
            page2 = context2.new_page()
            page2.goto(f"http://localhost:{port}/#/login")
            page2.wait_for_load_state("networkidle")
            
            page2.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page2.locator("input[type='text']").fill("admin@admin.com")
            page2.locator("input[type='password']").fill("admin123")
            page2.locator("button[type='submit']").click()
            
            page2.locator("#store-context-switcher-btn").wait_for(state="visible", timeout=15000)
            
            # Click pentru a deschide dropdown-ul
            page2.locator("#store-context-switcher-btn").click()
            page2.locator("span:has-text('Magazine disponibile')").wait_for(state="visible", timeout=5000)
            
            # Switcher-ul are urmatoarele optiuni vizibile:
            # - Magazin Principal (activ)
            # - Magazin Test E2E (activ)
            # - Magazin Suspendat E2E (disabled)
            # - Magazin Arhivat E2E (disabled)
            # - Nu ar trebui sa vada "Magazin Secret Owner E2E"
            
            opt_principal = page2.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Principal")
            opt_test = page2.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Test E2E")
            opt_suspended = page2.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Suspendat E2E")
            opt_archived = page2.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Arhivat E2E")
            opt_secret = page2.locator("button:not(#store-context-switcher-btn)", has_text="Magazin Secret Owner E2E")
            
            assert opt_principal.is_visible(), "Magazin Principal lipseste!"
            assert opt_test.is_visible(), "Magazin Test E2E lipseste!"
            assert opt_suspended.is_visible(), "Magazin Suspendat E2E lipseste!"
            assert opt_archived.is_visible(), "Magazin Arhivat E2E lipseste!"
            assert opt_secret.count() == 0, "Admin-ul nu ar trebui sa aiba acces la Magazin Secret Owner!"
            
            assert not opt_principal.is_disabled(), "Magazin Principal ar trebui sa fie activ"
            assert not opt_test.is_disabled(), "Magazin Test E2E ar trebui sa fie activ"
            assert opt_suspended.is_disabled(), "Magazin Suspendat E2E ar trebui sa fie disabled"
            assert opt_archived.is_disabled(), "Magazin Arhivat E2E ar trebui sa fie disabled"
            
            safe_print("[PASS] Dropdown-ul afiseaza doar magazinele din store_members si respecta starea lor (active/inactive).")
            context2.close()
            
            # ==========================================
            # 3. VERIFICARE CASIER (casier@casier.com)
            # ==========================================
            safe_print("\n--- 3. Verificare Casier (casier@casier.com) ---")
            context3 = browser.new_context()
            page3 = context3.new_page()
            page3.goto(f"http://localhost:{port}/#/login")
            page3.wait_for_load_state("networkidle")
            
            page3.locator("input[type='text']").fill("casier@casier.com")
            page3.locator("input[type='password']").fill("casier123")
            page3.locator("button[type='submit']").click()
            
            # După login, navigăm pe /vanzare pentru a încărca MainLayout (în loc de /pos care este fullscreen)
            page3.goto(f"http://localhost:{port}/#/vanzare")
            page3.wait_for_load_state("networkidle")
            
            # Casier are doar 1 magazin (Magazin Principal).
            # Selectorul global ar trebui sa apara ca un badge static (nu e dropdown switcher).
            try:
                page3.locator("p:has-text('Magazin Principal')").wait_for(state="visible", timeout=15000)
            except Exception as e:
                page3.screenshot(path="failed_casier_login.png")
                safe_print(f"Casier login failed: current URL is {page3.url}")
                raise e
            
            # Incercam sa gasim butonul de switcher dropdown. Nu ar trebui sa existe ca buton interactiv.
            switcher_btn = page3.locator("#store-context-switcher-btn")
            assert switcher_btn.count() == 0, "Casierul cu un singur magazin nu ar trebui sa aiba dropdown interactiv!"
            safe_print("[PASS] Casierul cu un singur magazin vede doar un badge static, fara optiuni de comutare.")
            context3.close()
            
            # ==========================================
            # 4. VERIFICARE PLATFORM OWNER BADGE STATIC
            # ==========================================
            safe_print("\n--- 4. Verificare Platform Owner Static Badge ---")
            context4 = browser.new_context()
            page4 = context4.new_page()
            page4.goto(f"http://localhost:{port}/#/login")
            page4.wait_for_load_state("networkidle")
            
            page4.locator("input[type='text']").fill("admin@owner.com")
            page4.locator("input[type='password']").fill("admin123")
            page4.locator("button[type='submit']").click()
            
            page4.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
            
            # Platform owner ar trebui sa vada badge-ul static Platform Administration
            admin_badge = page4.locator("span:has-text('Platform Administration')").first
            assert admin_badge.is_visible(), "Platform Administration badge static lipseste!"
            
            # Nu ar trebui sa existe dropdown
            switcher_btn = page4.locator("#store-context-switcher-btn")
            assert switcher_btn.count() == 0, "Platform Owner nu ar trebui sa aiba dropdown interactiv in header!"
            safe_print("[PASS] Platform owner are badge static 'Platform Administration' fara dropdown global.")
            context4.close()
            
        except Exception as e:
            safe_print(f"Exception encountered: {e}")
            raise e
        finally:
            run_teardown(browser, port)
            browser.close()

if __name__ == "__main__":
    run_test()
