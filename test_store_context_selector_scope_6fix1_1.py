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
        
        try:
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
                
            safe_print(f"All stores: {[s['name'] for s in setup_res.get('stores', [])]}")
            safe_print(f"Final memberships: {[{'store': m.get('store', {}).get('name') if m.get('store') else 'N/A', 'role': m.get('role')} for m in setup_res.get('finalMemberships', [])]}")
            safe_print("[PASS] Magazine configurate in DB.")
            context1.close()
            
            # ==========================================
            # 2. VERIFICARE SCOPE STORE SELECTOR (admin@admin.com)
            # ==========================================
            safe_print("\n--- 2. Verificare Selector Scope (admin@admin.com) ---")
            context2 = browser.new_context()
            page2 = context2.new_page()
            
            # Print console errors from the page
            page2.on("pageerror", lambda err: safe_print(f"PAGE ERROR (admin): {err}"))
            page2.on("console", lambda msg: safe_print(f"CONSOLE (admin): {msg.text}"))
            
            page2.goto("http://localhost:5174/#/login")
            page2.wait_for_load_state("networkidle")
            
            page2.locator("input[type='text']").fill("admin@admin.com")
            page2.locator("input[type='password']").fill("admin123")
            page2.locator("button[type='submit']").click()
            
            # Asteptam selectorul
            try:
                page2.locator("#store-context-switcher-btn").wait_for(state="visible", timeout=15000)
            except Exception as e:
                # Capture diagnostic screenshot
                page2.screenshot(path="failed_admin_login.png")
                safe_print(f"Login failed: current URL is {page2.url}")
                raise e
            
            # Deschidem dropdown switcher
            page2.locator("#store-context-switcher-btn").click()
            page2.locator("span:has-text('Magazine disponibile')").wait_for(state="visible", timeout=5000)
            
            # Verificam ca magazinul secret NU apare
            secret_opt_count = page2.locator("button", has_text="Magazin Secret Owner E2E").count()
            assert secret_opt_count == 0, "admin@admin.com nu ar trebui sa vada Magazin Secret Owner E2E!"
            safe_print("[PASS] Magazinul secret nu apare in dropdown pentru admin.")
            
            # Verificam ca magazinele active sunt listate si active
            opt_test = page2.locator("button", has_text="Magazin Test E2E")
            assert not opt_test.is_disabled(), "Magazin Test E2E ar trebui sa fie activ/enabled!"
            
            # Verificam ca sectiunea 'Magazine Inactive / Arhivate' exista si ca magazinele suspendate/arhivate sunt disabled
            inactive_header = page2.locator("div:has-text('Magazine Inactive / Arhivate')").last
            assert inactive_header.is_visible(), "Sectiunea 'Magazine Inactive / Arhivate' lipseste!"
            
            opt_suspended = page2.locator("button", has_text="Magazin Suspendat E2E")
            opt_archived = page2.locator("button", has_text="Magazin Arhivat E2E")
            assert opt_suspended.is_disabled(), "Magazinul suspendat ar trebui sa fie disabled!"
            assert opt_archived.is_disabled(), "Magazinul arhivat ar trebui sa fie disabled!"
            safe_print("[PASS] Magazinele inactive si arhivate apar ca disabled in sectiunea dedicata.")
            
            # Determine which store is NOT currently active, and switch to it
            current_store_text = page2.locator("#store-context-switcher-btn p").first.text_content()
            target_store_name = "Magazin Test E2E" if "Magazin Principal" in current_store_text else "Magazin Principal"
            safe_print(f"Current store is '{current_store_text}', switching to '{target_store_name}'...")
            
            # Click the target store option
            opt_target = page2.locator("button", has_text=target_store_name)
            
            # Setup dialog handler BEFORE clicking
            page2.on("dialog", lambda dialog: dialog.accept())
            opt_target.click()
            
            # Asteptam redirectul / actualizarea contextului
            page2.locator(f"#store-context-switcher-btn:has-text('{target_store_name}')").wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Schimbarea contextului de magazin functioneaza corect.")
            
            # Verificare transfer selectors
            page2.locator("a:has-text('Transfer Marfă')").click()
            page2.wait_for_load_state("networkidle")
            
            # Verificam ca Magazin Secret nu apare ca sursa sau destinatie
            source_select = page2.locator("[data-testid='transfer-source-select']")
            dest_select = page2.locator("[data-testid='transfer-destination-select']")
            
            # Sursa: daca e select, verificam ca Magazin Secret nu este printre optiuni
            if source_select.evaluate("el => el.tagName === 'SELECT'"):
                assert source_select.locator("option", has_text="Magazin Secret Owner E2E").count() == 0, "Magazin Secret nu ar trebui sa fie in sursa!"
            assert dest_select.locator("option", has_text="Magazin Secret Owner E2E").count() == 0, "Magazin Secret nu ar trebui sa fie in destinatie!"
            safe_print("[PASS] Transfer page respecta scope-ul store memberships.")
            context2.close()
            
            # ==========================================
            # 3. VERIFICARE SCOPE STORE SELECTOR (casier@casier.com)
            # ==========================================
            safe_print("\n--- 3. Verificare Selector Scope (casier@casier.com) ---")
            context3 = browser.new_context()
            page3 = context3.new_page()
            page3.goto("http://localhost:5174/#/login")
            page3.wait_for_load_state("networkidle")
            
            page3.locator("input[type='text']").fill("casier@casier.com")
            page3.locator("input[type='password']").fill("casier123")
            page3.locator("button[type='submit']").click()
            
            # După login, navigăm pe /vanzare pentru a încărca MainLayout (în loc de /pos care este fullscreen)
            page3.goto("http://localhost:5174/#/vanzare")
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
            page4.goto("http://localhost:5174/#/login")
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
            browser.close()

if __name__ == "__main__":
    run_test()
