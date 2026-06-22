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
            page.screenshot(path="login_debug_reception.png", full_page=True)
            raise e
        
        # --- NAVIGATE TO RECEPTION ---
        print("\nNavigating to /#/receptie ...")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        
        print("Waiting for Reception page to load ...")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(2000)
        
        # --- SCENARIO 1: Receptie manuala simpla (OTET 1L) ---
        print("\n--- SCENARIO 1: Receptie manuala simpla ---")
        print("[DEBUG] Completing Document Info...")
        page.locator("input[placeholder='Ex: 123456']").fill("REC-5D41-001")
        page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Test E2E 5D.4.1")
        
        print("[DEBUG] Searching and selecting product OTET 1L...")
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        print("[DEBUG] Completing Line Info...")
        page.locator("input[placeholder='Cantitate']").fill("1")
        page.locator("input[placeholder='0.00']").fill("1.00")
        page.locator("input[placeholder='Lot']").fill("TEST-5D41")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking Adauga Linie button...")
        page.locator("button:has-text('Linie')").click()
        page.wait_for_timeout(1000)
        
        print("[DEBUG] Clicking FINALIZEAZA RECEPTIA button...")
        try:
            page.locator("button:has-text('FINALIZEAZ')").click(timeout=5000)
            page.wait_for_timeout(1000)
        except Exception as e:
            page.screenshot(path="debug_reception_timeout.png", full_page=True)
            raise e
        
        try:
            page.wait_for_selector("[data-testid='reception-detail-page']", timeout=10000)
            print("[PASS] Scenario 1 PASS: Receptie realizata cu succes! (Toast or detail page detected)")
        except Exception as e:
            print("[DEBUG] Toast or detail page not detected directly. Trying fallback check...")
            try:
                doc_val = page.locator("input[placeholder='Ex: 123456']").input_value(timeout=2000)
                if not doc_val:
                    print("[PASS] Scenario 1 PASS: Receptie realizata cu succes! (Formular resetat corect)")
                else:
                    raise Exception("Formularul nu s-a resetat.")
            except Exception:
                raise e
        
        page.wait_for_timeout(3000)
        
        # --- SCENARIO 2: Formular Incomplet (Fara produse) ---
        print("\n--- SCENARIO 2: Formular Incomplet (Fara produse) ---")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        print("[DEBUG] Completing Document Info without adding lines...")
        page.locator("input[placeholder='Ex: 123456']").fill("REC-INVALID-002")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Checking validation for invalid line addition (empty quantity/value)...")
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("input[placeholder='Cantitate']").fill("0")
        page.locator("button:has-text('Linie')").click()
        
        try:
            page.locator("text=pozitiv").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Validare formular incomplet / cantitate invalida interceptata corect!")
        except Exception as e:
            print("[DEBUG] Toast not detected directly. Checking if line was prevented from being added...")
            page.locator("button:has-text('FINALIZEAZ')").wait_for(state="detached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Validare formular incomplet functioneaza corect (linia nu a fost adaugata).")
            
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Toate scenariile de test pentru RPC Receptie au trecut cu succes!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
