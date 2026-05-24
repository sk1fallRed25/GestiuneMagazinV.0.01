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
        
        def handle_console_setup(msg):
            try:
                text = msg.text.encode('ascii', 'replace').decode('ascii')
                print(f"[SETUP CONSOLE] {msg.type}: {text}")
            except Exception:
                pass
                
        page1.on("console", handle_console_setup)
        
        page1.goto("http://localhost:5173/#/login")
        page1.wait_for_load_state("networkidle")
        
        print("Logging in as admin@owner.com...")
        page1.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page1.locator("input[type='text']").fill("admin@owner.com")
        page1.locator("input[type='password']").fill("admin123")
        page1.locator("button[type='submit']").click()
        
        page1.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in as platform_owner.")
        
        # Get Magazin Principal ID and set ai_consultant override to false initially via RPC
        setup_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            const store = stores[0];
            
            // Set override for ai_consultant to false using RPC (enforcing RPC-only writes)
            const { error } = await supabase.rpc('set_store_module_access', {
                p_store_id: store.id,
                p_module_key: 'ai_consultant',
                p_enabled: false,
                p_reason: 'Setup E2E Test'
            });
            
            if (error) return { error: error.message };
            return { success: true, storeId: store.id };
        }""")
        
        if 'error' in setup_res:
            raise Exception(f"Setup failed: {setup_res['error']}")
            
        store_id = setup_res['storeId']
        print(f"[PASS] Cleaned up overrides and set default false for store_id: {store_id}")
        
        # ==========================================
        # 2. VERIFY INITIAL STATE (admin@admin.com) - ai_consultant is disabled by default
        # ==========================================
        print("\n--- 2. Verificare stare initiala (ai_consultant este dezactivat implicit) ---")
        context2 = browser.new_context()
        page2 = context2.new_page()
        
        def handle_console_user(msg):
            try:
                text = msg.text.encode('ascii', 'replace').decode('ascii')
                print(f"[USER CONSOLE] {msg.type}: {text}")
            except Exception:
                pass
                
        page2.on("console", handle_console_user)
        
        page2.goto("http://localhost:5173/#/login")
        page2.wait_for_load_state("networkidle")
        
        print("Logging in as admin@admin.com...")
        page2.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page2.locator("input[type='text']").fill("admin@admin.com")
        page2.locator("input[type='password']").fill("admin123")
        page2.locator("button[type='submit']").click()
        
        page2.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in as store administrator.")
        
        # Check if AI Consultant link is NOT in the sidebar
        ai_link = page2.locator("a:has-text('AI Consultant')")
        assert not ai_link.is_visible(), "Link-ul 'AI Consultant' ar trebui sa fie ascuns din sidebar implicit!"
        print("[PASS] Link-ul 'AI Consultant' este ascuns din sidebar.")
        
        # Try to access it directly via URL and verify DisabledModulePage loads
        print("Incercam accesarea directa a /ai-consultant...")
        page2.goto("http://localhost:5173/#/ai-consultant")
        page2.wait_for_load_state("networkidle")
        
        disabled_title = page2.locator("#disabled-module-title")
        disabled_title.wait_for(state="visible", timeout=5000)
        assert "Dezactivat" in disabled_title.text_content() or "Restric" in disabled_title.text_content(), \
            f"Titlul gresit: {disabled_title.text_content()}"
        print("[PASS] S-a afisat corect ecranul de modul restrictionat.")
        
        # ==========================================
        # 3. ENABLE AI_CONSULTANT (via admin@owner.com)
        # ==========================================
        print("\n--- 3. Activare modul (ai_consultant) via set_store_module_access ---")
        enable_res = page1.evaluate("""async (storeId) => {
            const supabase = window.supabase;
            const { data, error } = await supabase.rpc('set_store_module_access', {
                p_store_id: storeId,
                p_module_key: 'ai_consultant',
                p_enabled: true,
                p_reason: 'Activare E2E Test'
            });
            if (error) return { error: error.message };
            return { success: true, data };
        }""", store_id)
        
        if 'error' in enable_res:
            raise Exception(f"Activation failed: {enable_res['error']}")
            
        print("[PASS] RPC set_store_module_access (true) a rulat cu succes.")
        
        # Reload user page and check if link is visible and page loads
        print("Reincarcare pagina utilizator si verificare...")
        page2.goto("http://localhost:5173/#/produse") # Go to products first to let layouts re-mount
        page2.wait_for_load_state("networkidle")
        page2.reload()
        page2.wait_for_load_state("networkidle")
        
        # Check sidebar link
        ai_link.wait_for(state="visible", timeout=10000)
        print("[PASS] Link-ul 'AI Consultant' este acum vizibil in sidebar.")
        
        # Click sidebar link and assert page loaded
        ai_link.click()
        page2.wait_for_load_state("networkidle")
        
        page2.locator("h1:has-text('AI Consultant')").wait_for(state="visible", timeout=5000)
        print("[PASS] Pagina AI Consultant s-a incarcat cu succes dupa activare.")
        
        # ==========================================
        # 4. TEST PLANNED MODULE VIEW (using offline_sync which is already planned)
        # ==========================================
        print("\n--- 4. Testare ecran de Modul In Curs De Dezvoltare (planned) ---")
        print("Checking that offline_sync is registered as 'planned' in database...")
        planned_check_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            const { data, error } = await supabase.rpc('get_store_module_access', {
                p_store_id: null
            });
            if (error) return { error: error.message };
            const offlineSync = data.find(m => m.module_key === 'offline_sync');
            return { 
                success: true, 
                found: !!offlineSync,
                status: offlineSync ? offlineSync.status : null,
                effective_enabled: offlineSync ? offlineSync.effective_enabled : null
            };
        }""")
        
        if 'error' in planned_check_res:
            raise Exception(f"Failed to fetch offline_sync module: {planned_check_res['error']}")
            
        assert planned_check_res['found'], "Modulul 'offline_sync' nu a fost gasit in platform registry!"
        assert planned_check_res['status'] == 'planned', f"Statusul offline_sync ar trebui sa fie 'planned', dar este {planned_check_res['status']}"
        assert planned_check_res['effective_enabled'] is False, "Modulul offline_sync nu ar trebui sa fie activ"
        print("[PASS] Modulul offline_sync este corect inregistrat ca 'planned' si dezactivat.")
        print("[INFO] Scenariul planned in router: NOT TESTED IN ROUTER (modulul offline_sync nu are ruta asociata in UI).")
        
        # ==========================================
        # 5. CLEANUP / RESET
        # ==========================================
        print("\n--- 5. Curatare date test ---")
        cleanup_res = page1.evaluate("""async (storeId) => {
            const supabase = window.supabase;
            
            // Set override for ai_consultant to false via RPC (restoring clean state)
            const { error } = await supabase.rpc('set_store_module_access', {
                p_store_id: storeId,
                p_module_key: 'ai_consultant',
                p_enabled: false,
                p_reason: 'Restaurare E2E Test'
            });
            
            if (error) return { error: error.message };
            return { success: true };
        }""", store_id)
        
        if 'error' in cleanup_res:
            print(f"[WARN] Cleanup warning: {cleanup_res['error']}")
        else:
            print("[PASS] DB restored to initial state.")
            
        context1.close()
        context2.close()
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] E2E Module Entitlements Frontend Integration Test Passed!")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FAIL] Test esuat: {str(e)}")
        sys.exit(1)
