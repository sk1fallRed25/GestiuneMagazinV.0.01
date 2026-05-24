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
        
        # CLEANUP PREVIOUS TEST RUN: ensure magazin@magazin.com is unassigned
        print("[CLEANUP] Ensuring magazin@magazin.com is unassigned before starting UI test...")
        initial_role = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: profiles } = await supabase.from('profiles').select('id, role').eq('email', 'magazin@magazin.com');
            if (profiles && profiles.length > 0) {
                await supabase.from('store_members').delete().eq('profile_id', profiles[0].id);
                return profiles[0].role;
            }
            return 'user';
        }""")
        page.wait_for_timeout(1000)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        print(f"[PASS] Cleanup complete. Initial profiles.role for magazin@magazin.com is: {initial_role}")
        
        # Verify unassigned profiles panel is loaded in Overview tab
        page.locator("h3:has-text('Nealocați')").wait_for(state="visible", timeout=10000)
        print("[PASS] Unassigned profiles panel is visible.")
        
        # Switch to "Profile Utilizatori" tab
        print("3. Switching to Profile Utilizatori tab...")
        page.locator("#owner-tab-profiles").click()
        page.locator("h2:has-text('Profile Utilizatori')").wait_for(state="visible", timeout=5000)
        
        # Find magazin@magazin.com
        print("4. Locating magazin@magazin.com in table...")
        row = page.locator("tr", has=page.locator("text=magazin@magazin.com"))
        row.wait_for(state="visible", timeout=5000)
        
        print("5. Clicking Aloca la magazin button...")
        row.locator("button:has-text('Aloc')").click()
        
        # Wait for modal
        modal_header = page.locator("h3:has-text('Alocare Utilizator la Magazin')")
        modal_header.wait_for(state="visible", timeout=5000)
        print("[PASS] AssignMemberModal opened successfully.")
        
        print("6. Selecting store and role in modal...")
        # Select magazin
        store_select = page.locator("#assign-store-select")
        store_select.select_option(label="Magazin Principal")
        
        # Select rol
        role_select = page.locator("#assign-role-select")
        role_select.select_option("manager")
        
        # Click Alocă Utilizator (submit button in modal)
        print("7. Submitting assignment...")
        page.locator("div[role='dialog'] button:has-text('Utilizator')").click()
        
        # Wait for modal to close
        modal_header.wait_for(state="detached", timeout=5000)
        print("[PASS] Modal closed successfully upon assignment.")
        page.wait_for_timeout(1000)
        
        # Switch to "Membri Magazin" tab to verify
        print("8. Verifying assigned user in Membri Magazin tab...")
        page.locator("#owner-tab-members").click()
        page.locator("h2:has-text('Membri Magazin')").wait_for(state="visible", timeout=5000)
        
        # Selectam magazinul in StoresTable din stanga pentru a-i afisa membrii
        page.locator("tr", has=page.locator("text=Magazin Principal")).first.click()
        page.wait_for_timeout(1000)
        
        page.locator("tr", has=page.locator("text=magazin@magazin.com")).wait_for(state="visible", timeout=5000)
        print("[PASS] magazin@magazin.com is correctly displayed in StoreMembersTable.")
        
        # Verify in Overview tab that user is no longer unassigned
        print("9. Verifying user is removed from unassigned list...")
        page.locator("#owner-tab-overview").click()
        page.locator("text=magazin@magazin.com").wait_for(state="detached", timeout=5000)
        print("[PASS] magazin@magazin.com is no longer in unassigned list.")
        page.wait_for_timeout(1000)
        
        # Supabase read-only check via page.evaluate
        print("\n--- 3. Verificare Supabase read-only ---")
        db_check = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data: profiles } = await supabase.from('profiles').select('*').eq('email', 'magazin@magazin.com');
            if (!profiles || profiles.length === 0) return { error: 'Profile not found' };
            const profile = profiles[0];
            
            const { data: members } = await supabase.from('store_members').select('*').eq('profile_id', profile.id);
            const { data: stores } = await supabase.from('stores').select('*').eq('name', 'Magazin Principal');
            
            return {
                profile: profile,
                members: members,
                store: stores ? stores[0] : null
            };
        }""")
        
        if 'error' in db_check:
            raise Exception(f"Database check failed: {db_check['error']}")
            
        profile_data = db_check['profile']
        members_data = db_check['members']
        store_data = db_check['store']
        
        print(f"[DB CHECK] Profile: {profile_data['email']} | Role: {profile_data['role']} | Active: {profile_data['active']}")
        print(f"[DB CHECK] Store Members: {members_data}")
        print(f"[DB CHECK] Store: {store_data['name']} (ID: {store_data['id']})")
        
        assert len(members_data) > 0, "No store_members row found!"
        member_row = members_data[0]
        assert member_row['store_id'] == store_data['id'], f"Expected store_id {store_data['id']}, got {member_row['store_id']}"
        assert member_row['role'] == 'manager', f"Expected role 'manager', got {member_row['role']}"
        assert member_row['active'] == True, f"Expected active True, got {member_row['active']}"
        
        # Verify profiles table was NOT modified
        assert profile_data['role'] == initial_role, f"Expected profiles.role '{initial_role}', got {profile_data['role']}"
        assert profile_data['active'] == True, f"Expected profiles.active True, got {profile_data['active']}"
        print("[PASS] Supabase read-only verification successful. Data integrity confirmed.")
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Owner Assignment E2E Test 5E.3.1 passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
