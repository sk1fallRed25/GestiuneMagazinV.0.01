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
        
        # Get Magazin Principal ID and admin profile
        setup_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            const store = stores[0];
            
            // Clean up any existing override for ai_consultant first
            await supabase.from('store_module_access')
                .delete()
                .eq('store_id', store.id)
                .eq('module_key', 'ai_consultant');
                
            // Restore ai_consultant status to 'active' in platform_modules just in case it was modified
            await supabase.from('platform_modules')
                .update({ status: 'active' })
                .eq('module_key', 'ai_consultant');
                
            return { success: true, storeId: store.id };
        }""")
        
        if 'error' in setup_res:
            raise Exception(f"Setup failed: {setup_res['error']}")
            
        store_id = setup_res['storeId']
        print(f"[PASS] Cleaned up overrides for store_id: {store_id}")
        
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
        # 4. TEST PLANNED MODULE VIEW (ai_consultant marked as planned)
        # ==========================================
        print("\n--- 4. Testare ecran de Modul In Curs De Dezvoltare (planned) ---")
        # Change status of ai_consultant to 'planned' in platform_modules
        status_res = page1.evaluate("""async () => {
            const supabase = window.supabase;
            const { data, error } = await supabase.from('platform_modules')
                .update({ status: 'planned' })
                .eq('module_key', 'ai_consultant');
            if (error) return { error: error.message };
            return { success: true };
        }""")
        
        if 'error' in status_res:
            raise Exception(f"Status update failed: {status_res['error']}")
            
        print("[PASS] Modulul ai_consultant a fost setat temporar ca 'planned'.")
        
        # Reload user page and navigate to /ai-consultant
        page2.goto("http://localhost:5173/#/ai-consultant")
        page2.wait_for_load_state("networkidle")
        page2.reload()
        page2.wait_for_load_state("networkidle")
        
        disabled_title.wait_for(state="visible", timeout=5000)
        assert "Dezvoltare" in disabled_title.text_content() or "planificat" in page2.locator("#disabled-module-description").text_content(), \
            f"Descriere sau titlu incorect pentru planned: {disabled_title.text_content()}"
        print("[PASS] S-a afisat corect ecranul de modul planificat / in curs de dezvoltare.")
        
        # ==========================================
        # 5. CLEANUP / RESET
        # ==========================================
        print("\n--- 5. Curatare date test ---")
        cleanup_res = page1.evaluate("""async (storeId) => {
            const supabase = window.supabase;
            
            // Restore status to 'active'
            await supabase.from('platform_modules')
                .update({ status: 'active' })
                .eq('module_key', 'ai_consultant');
                
            // Delete override
            await supabase.from('store_module_access')
                .delete()
                .eq('store_id', storeId)
                .eq('module_key', 'ai_consultant');
                
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
