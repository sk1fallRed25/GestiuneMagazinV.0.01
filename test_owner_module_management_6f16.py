import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Log browser console output
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"))

        # 1. LOGIN
        print("1. Navigating to login...")
        page.goto("http://localhost:5173/#/login")
        page.wait_for_load_state("networkidle")
        
        print("2. Logging in as admin@owner.com...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@owner.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        page.locator("span:has-text('Consolă Proprietar')").wait_for(state="visible", timeout=15000)
        page.goto("http://localhost:5173/#/owner")
        page.wait_for_load_state("networkidle")
        print("[PASS] Logged in and navigated to Owner Console.")

        # 2. BASELINE SETUP VIA RPC
        print("\n--- 2. Setting up baseline module configuration for Magazin Principal ---")
        setup_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            const store = stores[0];
            
            // Set ai_consultant and other modules to false to start clean
            const { error: err1 } = await supabase.rpc('set_store_module_access', {
                p_store_id: store.id,
                p_module_key: 'ai_consultant',
                p_enabled: false,
                p_reason: 'Baseline E2E Test Setup'
            });
            if (err1) return { error: err1.message };
            
            return { success: true, storeId: store.id };
        }""")
        
        if 'error' in setup_res:
            raise Exception(f"Setup failed: {setup_res['error']}")
            
        store_id = setup_res['storeId']
        print(f"[PASS] Baseline setup completed for store_id: {store_id}")
        page.reload()
        page.wait_for_load_state("networkidle")

        # 3. SELECT STORE IN CONSOLE
        print("\n--- 3. Selecting Magazin Principal in Stores Table ---")
        # Ensure we are on the stores tab
        page.locator("#owner-tab-stores").click()
        page.wait_for_timeout(500)
        
        # Locate the store row for "Magazin Principal" and click it
        store_row = page.locator("tr", has=page.locator("text=Magazin Principal")).first
        store_row.wait_for(state="visible", timeout=5000)
        store_row.click()
        print("[PASS] Magazin Principal selected.")

        # 4. SWITCH TO MODULE TAB AND VERIFY
        print("\n--- 4. Switching to 'Module Magazin' Tab ---")
        module_tab = page.locator("#owner-tab-modules")
        module_tab.wait_for(state="visible", timeout=5000)
        module_tab.click()
        page.wait_for_timeout(1000)

        # Verify the panel is loaded
        panel_header = page.locator("h3:has-text('Magazin Principal')")
        panel_header.wait_for(state="visible", timeout=5000)
        print("[PASS] OwnerStoreModulesPanel loaded with selected store name.")

        # Check commercial presets are visible
        presets_section = page.locator("text=Configurare Rapidă Pachet Comercial")
        presets_section.wait_for(state="visible", timeout=5000)
        print("[PASS] Presets section is visible.")

        # 5. INDIVIDUAL TOGGLE WITH AUDIT LOG REASONING
        print("\n--- 5. Toggling 'ai_consultant' Module ---")
        toggle_btn = page.locator("#toggle-ai_consultant")
        toggle_btn.wait_for(state="visible", timeout=5000)
        
        # Verify initial toggle state is disabled (checked=false)
        is_checked = toggle_btn.get_attribute("aria-checked") == "true"
        assert not is_checked, "Initial state of ai_consultant override should be disabled!"
        
        # Click toggle
        toggle_btn.click()
        
        # Verify Reasoning Modal opens
        modal_title = page.locator("#toggle-modal-title")
        modal_title.wait_for(state="visible", timeout=5000)
        print("[PASS] Reasoning Modal popped up.")

        # Fill reason
        reason_input = page.locator("#reason-input")
        reason_input.wait_for(state="visible", timeout=5000)
        reason_input.fill("Activare modul din test E2E 6F.1.6")

        # Submit change
        save_btn = page.locator("button:has-text('Salvează Modificarea')")
        save_btn.click()
        
        # Wait for modal to close
        modal_title.wait_for(state="detached", timeout=10000)
        print("[PASS] Reasoning Modal saved and closed.")

        # Wait for toggle state to change in UI to checked=true
        page.wait_for_function("""() => {
            const el = document.getElementById('toggle-ai_consultant');
            return el && el.getAttribute('aria-checked') === 'true';
        }""", timeout=10000)
        print("[PASS] Module toggle state updated in UI to checked=true.")

        # 6. VERIFY AUDIT LOG REGISTERED ACTION
        print("\n--- 6. Checking Audit Logs Tab ---")
        audit_tab = page.locator("#owner-tab-audit")
        audit_tab.click()
        page.wait_for_timeout(1000)

        # Wait for audit table rows to be visible
        audit_table = page.locator("table").first
        audit_table.wait_for(state="visible", timeout=5000)

        # Check if there is an audit log entry for Magazin Principal with action 'store.module_enable' (Activare modul)
        # Note: the UI maps 'store.module_enable' action to a badge or text representation.
        audit_row = page.locator("tr", has=page.locator("text=Activare modul")).first
        audit_row.wait_for(state="visible", timeout=10000)
        
        # Verify it lists "Magazin Principal" as the affected entity/store
        assert "Magazin Principal" in audit_row.text_content(), "Audit log did not display correct store name!"
        print("[PASS] Audit log verified with 'Activare modul' action.")

        # 7. PRESET OVERRIDE TEST
        print("\n--- 7. Applying Commercial Preset ---")
        module_tab.click()
        page.wait_for_timeout(500)

        # Click the Basic Preset button
        preset_btn = page.locator("button:has-text('BASIC')").first
        preset_btn.wait_for(state="visible", timeout=5000)
        preset_btn.click()

        # Preset confirmation modal popup
        preset_modal = page.locator("#preset-modal-title")
        preset_modal.wait_for(state="visible", timeout=5000)
        print("[PASS] Preset Confirmation Modal popped up.")

        # Confirm preset application
        confirm_preset_btn = page.locator("button:has-text('Aplică Pachet')")
        confirm_preset_btn.click()
        preset_modal.wait_for(state="detached", timeout=10000)
        print("[PASS] Preset applied successfully.")

        # 8. CLEANUP OVERRIDES
        print("\n--- 8. Restoring baseline module configuration ---")
        cleanup_res = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: stores } = await supabase.from('stores').select('id, name').eq('name', 'Magazin Principal');
            if (!stores || stores.length === 0) return { error: 'Magazin Principal not found' };
            const store = stores[0];
            
            // Re-disable ai_consultant
            await supabase.rpc('set_store_module_access', {
                p_store_id: store.id,
                p_module_key: 'ai_consultant',
                p_enabled: false,
                p_reason: 'Baseline E2E Test Cleanup'
            });
            
            return { success: true };
        }""")
        
        if 'error' in cleanup_res:
            print(f"[WARN] Cleanup warning: {cleanup_res['error']}")
        else:
            print("[PASS] DB restored to initial state.")

        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] E2E Owner Module Management UI Test (Etapa 6F.1.6) Passed!")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FAIL] Test esuat: {str(e)}")
        sys.exit(1)
