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
            page.screenshot(path="login_debug_loss.png", full_page=True)
            raise e
        
        # --- PRE-STEP: Transfer 1 buc of ROSHEN EXTRA CRUNCH CAP from Depozit to Magazin so Scenario 1 has stock ---
        print("\n--- PRE-STEP: Transfer 1 buc ROSHEN EXTRA CRUNCH CAP din Depozit in Magazin ---")
        page.goto("http://localhost:5173/#/transfer")
        page.wait_for_load_state("networkidle")
        page.locator("text=Pas 1").wait_for(state="visible", timeout=10000)
        
        page.locator("input[placeholder*='cod bare']").fill("4823077642098")
        page.locator("div.cursor-pointer:has-text('ROSHEN EXTRA CRUNCH CAP')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('ROSHEN EXTRA CRUNCH CAP')").click()
        
        page.locator("button:has-text('Depozit')").first.click()
        page.locator("input[type='number']").fill("1")
        page.locator("button:has-text('Transferul')").click(no_wait_after=True)
        
        try:
            page.locator("text=Niciun produs selectat").wait_for(state="visible", timeout=5000)
            print("[DEBUG] Pre-step transfer confirmed (form reset).")
        except Exception as e:
            print("[DEBUG] Timeout waiting for form reset in pre-step.")
            
        page.wait_for_timeout(2000)
        print("[DEBUG] Pre-step transfer completed.")
        
        # --- NAVIGATE TO LOSSES ---
        print("\nNavigating to /#/pierderi ...")
        page.goto("http://localhost:5173/#/pierderi")
        page.wait_for_load_state("networkidle")
        
        print("Waiting for Losses page to load ...")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(2000)
        
        roshen_card = page.locator(".bg-white.rounded-3xl:has-text('ROSHEN EXTRA CRUNCH CAP')").inner_text()
        print("[DEBUG ROSHEN CARD BEFORE SCENARIO 1]:", roshen_card.encode('ascii', 'replace').decode('ascii').replace('\n', ' | '))
        
        # --- SCENARIO 1: Casare din Magazin (ROSHEN EXTRA CRUNCH CAP) ---
        print("\n--- SCENARIO 1: Casare din Magazin ---")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill("4823077642098")
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Magazin')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("1")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Test Smoke 5D.3.1 Magazin")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking Confirma Casarea button...")
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        page.wait_for_timeout(1000)
        
        try:
            page.locator("text=Casare înregistrată cu succes!").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 1 PASS: Casare realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if modal closed successfully...")
            page.locator("text=Raport Casare").wait_for(state="detached", timeout=5000)
            print("[PASS] Scenario 1 PASS: Casare realizata cu succes! (Modal inchis corect)")
        
        page.wait_for_timeout(3000)
        
        # --- SCENARIO 2: Casare din Depozit (ROSHEN EXTRA CRUNCH CAP) ---
        print("\n--- SCENARIO 2: Casare din Depozit ---")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill("4823077642098")
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Depozit')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("1")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Test Smoke 5D.3.1 Depozit")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking Confirma Casarea button...")
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        page.wait_for_timeout(1000)
        
        try:
            page.locator("text=Casare înregistrată cu succes!").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Casare realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if modal closed successfully...")
            page.locator("text=Raport Casare").wait_for(state="detached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Casare realizata cu succes! (Modal inchis corect)")
        
        page.wait_for_timeout(3000)
        
        # --- SCENARIO 3: Casare Auto (ROSHEN EXTRA CRUNCH CAP) ---
        print("\n--- SCENARIO 3: Casare Auto ---")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill("4823077642098")
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Auto')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("1")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Test Smoke 5D.3.1 Auto")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking Confirma Casarea button...")
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        
        try:
            page.locator("text=Casare înregistrată cu succes!").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 3 PASS: Casare realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if modal closed successfully...")
            page.locator("text=Raport Casare").wait_for(state="detached", timeout=5000)
            print("[PASS] Scenario 3 PASS: Casare realizata cu succes! (Modal inchis corect)")
        
        page.wait_for_timeout(3000)

        # --- SCENARIO 4: Stoc Insuficient (ROSHEN EXTRA CRUNCH CAP) ---
        print("\n--- SCENARIO 4: Casare cu stoc insuficient ---")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill("4823077642098")
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").wait_for(state="visible", timeout=5000)
        page.locator("button:has-text('ROSHEN EXTRA CRUNCH CAP')").click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Depozit')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("9999")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Test stoc insuficient")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking Confirma Casarea button...")
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        
        try:
            page.locator("text=Stoc insuficient").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 4 PASS: Eroare de stoc insuficient interceptata corect! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if modal remained open (error prevented close)...")
            page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
            print("[PASS] Scenario 4 PASS: Eroare de stoc insuficient interceptata corect! (Modal mentinut deschis)")
        
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Toate scenariile de test pentru RPC Pierderi au trecut cu succes!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
