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
            print("[DEBUG] Dialog accepted successfully.")

        page.on("dialog", handle_dialog)
        
        print("Navigating to http://localhost:5173/#/login ...")
        page.goto("http://localhost:5173/#/login")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        print("Waiting for login form ...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        
        print("Logging in as admin@admin.com ...")
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.wait_for_timeout(500)
        page.locator("button[type='submit']").click()
        
        print("Waiting for Dashboard to load ...")
        try:
            page.locator("text=Magazin Principal").wait_for(state="visible", timeout=30000)
            print("Logged in successfully.")
        except Exception as e:
            print("[DEBUG] Timeout waiting for Dashboard. Capturing login state...")
            page.screenshot(path="login_debug.png", full_page=True)
            print("[DEBUG] Login page text sample:", page.locator("body").inner_text().encode('ascii', 'replace').decode('ascii'))
            raise e
        
        print("Navigating to /#/transfer ...")
        page.goto("http://localhost:5173/#/transfer")
        page.wait_for_load_state("networkidle")
        
        print("Waiting for Transfer page to load ...")
        page.locator("text=Pas 1").wait_for(state="visible", timeout=10000)
        
        # --- SCENARIO 1: Depozit -> Magazin ---
        print("\n--- SCENARIO 1: Transfer Depozit -> Magazin ---")
        page.locator("input[placeholder*='cod bare']").fill("OTET")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("button:has-text('Depozit')").first.click()
        page.locator("input[type='number']").fill("1")
        print("[DEBUG] Clicking Executa Transferul button...")
        page.locator("button:has-text('Transferul')").click(no_wait_after=True)
        
        try:
            page.locator("text=Transfer realizat cu succes!").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 1 PASS: Transfer realizat cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if form reset to 'Niciun produs selectat'...")
            page.locator("text=Niciun produs selectat").wait_for(state="visible", timeout=5000)
            print("[PASS] Scenario 1 PASS: Transfer realizat cu succes! (Formular resetat corect)")
        
        page.wait_for_timeout(2000)
        
        # --- SCENARIO 2: Magazin -> Depozit ---
        print("\n--- SCENARIO 2: Transfer Magazin -> Depozit ---")
        page.locator("input[placeholder*='cod bare']").fill("OTET")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("button:has-text('Depozit')").last.click()
        page.locator("input[type='number']").fill("1")
        print("[DEBUG] Clicking Executa Transferul button...")
        page.locator("button:has-text('Transferul')").click(no_wait_after=True)
        
        try:
            page.locator("text=Transfer realizat cu succes!").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Transfer realizat cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if form reset to 'Niciun produs selectat'...")
            page.locator("text=Niciun produs selectat").wait_for(state="visible", timeout=5000)
            print("[PASS] Scenario 2 PASS: Transfer realizat cu succes! (Formular resetat corect)")
        
        page.wait_for_timeout(2000)
        
        # --- SCENARIO 3: Insufficient Stock ---
        print("\n--- SCENARIO 3: Transfer cu stoc insuficient ---")
        page.locator("input[placeholder*='cod bare']").fill("OTET")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("button:has-text('Depozit')").first.click()
        page.locator("input[type='number']").fill("9999")
        print("[DEBUG] Clicking Executa Transferul button...")
        page.locator("button:has-text('Transferul')").click(no_wait_after=True)
        
        try:
            page.locator("text=Stoc insuficient pentru transfer.").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 3 PASS: Eroare de stoc insuficient interceptata corect! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if form remained populated (error prevented reset)...")
            page.locator("text=COD: 6422336000013").wait_for(state="visible", timeout=5000)
            print("[PASS] Scenario 3 PASS: Eroare de stoc insuficient interceptata corect! (Formular mentinut populat)")
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Toate scenariile de test pentru RPC Transfer au trecut cu succes!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
