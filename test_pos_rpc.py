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
            page.screenshot(path="login_debug_pos.png", full_page=True)
            raise e
        
        # --- PRE-STEP: Reception 10 buc of OTET 1L to ensure stock ---
        print("\n--- PRE-STEP: Reception 10 buc OTET 1L ---")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        
        page.locator("input[placeholder='Ex: 123456']").fill("REC-POS-5D51")
        page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Test E2E 5D.5.1 Pre-step")
        
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("OTET 1L")
        page.locator("div.cursor-pointer:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
        page.locator("div.cursor-pointer:has-text('OTET 1L')").click()
        
        page.locator("input[placeholder='Cantitate']").fill("10")
        page.locator("input[placeholder='0.00']").fill("1.00")
        page.locator("input[placeholder='Lot']").fill("TEST-POS-5D51")
        page.wait_for_timeout(500)
        
        page.locator("button:has-text('Linie')").click()
        page.wait_for_timeout(1000)
        page.locator("button:has-text('FINALIZEAZ')").click(no_wait_after=True)
        
        try:
            page.wait_for_selector("[data-testid='reception-detail-page']", timeout=10000)
            print("[DEBUG] Pre-step reception confirmed.")
        except Exception as e:
            print("[DEBUG] Timeout waiting for reception confirm.")
            
        page.wait_for_timeout(2000)
        
        # --- PRE-STEP PART 2: Transfer 10 buc of OTET 1L to Magazin ---
        print("\n--- PRE-STEP PART 2: Transfer 10 buc OTET 1L to Magazin ---")
        page.goto("http://localhost:5173/#/transfer")
        page.wait_for_load_state("networkidle")
        
        page.locator("input[placeholder*='Caut']").last.wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Caut']").last.fill("OTET 1L")
        
        product_btn = page.locator("div.cursor-pointer:has-text('OTET 1L')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        
        page.locator("input[type='number']").wait_for(state="visible", timeout=5000)
        page.locator("input[type='number']").fill("10")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Submitting transfer...")
        page.locator("button:has-text('TRANSFER')").click(no_wait_after=True)
        
        try:
            page.locator("text=Transfer realizat").wait_for(state="attached", timeout=10000)
            print("[DEBUG] Pre-step transfer confirmed (toast).")
        except Exception:
            qty_val = page.locator("input[type='number']").input_value()
            if qty_val == "":
                print("[DEBUG] Pre-step transfer confirmed (reset).")
            else:
                print("[WARNING] Pre-step transfer might have failed or slow.")
            
        page.wait_for_timeout(2000)
        
        # --- NAVIGATE TO POS ---
        print("\nNavigating to /#/vanzare ...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        
        print("Waiting for POS page to load ...")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(2000)
        
        # helper to add OTET 1L to cart
        def add_otet_to_cart():
            page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
            page.locator("button:has-text('OTET 1L')").wait_for(state="visible", timeout=5000)
            page.locator("button:has-text('OTET 1L')").click()
            page.wait_for_timeout(1000)
            
        def extract_total():
            total_text = page.locator("span.text-5xl").inner_text()
            print(f"[DEBUG] Extracted total text: {total_text}")
            import re
            match = re.search(r"([\d.]+)", total_text)
            if match:
                return float(match.group(1))
            return 0.0

        # --- SCENARIO 1: Vânzare Cash ---
        print("\n--- SCENARIO 1: Vânzare Cash ---")
        add_otet_to_cart()
        page.locator("button:has-text('NUMERAR')").click()
        
        print("[DEBUG] Clicking INCASEAZA button...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        
        try:
            page.locator("text=finalizată cu").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 1 PASS: Vanzare cash realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Checking if cart reset...")
            total = extract_total()
            if total == 0:
                print("[PASS] Scenario 1 PASS: Vanzare cash realizata cu succes! (Cos golit)")
            else:
                raise Exception("Cosul nu s-a golit la cash.")
        
        page.wait_for_timeout(3000)
        
        # --- SCENARIO 2: Vânzare Card ---
        print("\n--- SCENARIO 2: Vanzare Card ---")
        add_otet_to_cart()
        page.locator("button:has-text('CARD')").click()
        
        print("[DEBUG] Clicking INCASEAZA button...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        
        try:
            page.locator("text=finalizată cu").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 2 PASS: Vanzare card realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Checking if cart reset...")
            total = extract_total()
            if total == 0:
                print("[PASS] Scenario 2 PASS: Vanzare card realizata cu succes! (Cos golit)")
            else:
                raise Exception("Cosul nu s-a golit la card.")
        
        page.wait_for_timeout(3000)
        
        # --- SCENARIO 3: Vânzare Mixtă ---
        print("\n--- SCENARIO 3: Vanzare Mixta ---")
        add_otet_to_cart()
        total_mixt = extract_total()
        
        page.locator("button:has-text('MIXT')").click()
        page.wait_for_timeout(500)
        
        cash_part = 0.10 if total_mixt >= 0.10 else total_mixt
        card_part = total_mixt - cash_part
        
        cash_input = page.locator("label:has-text('SUMĂ CASH')").locator("..").locator("input")
        card_input = page.locator("label:has-text('SUMĂ CARD')").locator("..").locator("input")
        
        # force evaluation and dispatch event
        cash_input.fill(f"{cash_part:.2f}")
        page.keyboard.press("Tab")
        card_input.fill(f"{card_part:.2f}")
        page.keyboard.press("Tab")
        
        print("[DEBUG] Clicking INCASEAZA button...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        
        try:
            page.locator("text=finalizată cu").wait_for(state="attached", timeout=5000)
            print("[PASS] Scenario 3 PASS: Vanzare mixta realizata cu succes! (Toast detectat)")
        except Exception as e:
            print("[DEBUG] Checking if cart reset...")
            total = extract_total()
            if total == 0:
                print("[PASS] Scenario 3 PASS: Vanzare mixta realizata cu succes! (Cos golit)")
            else:
                raise Exception("Cosul nu s-a golit la plata mixta.")
        
        page.wait_for_timeout(3000)

        # --- SCENARIO 4: Stoc Insuficient ---
        print("\n--- SCENARIO 4: Stoc Insuficient ---")
        
        print("[DEBUG] Adding product to cart...")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        product_btn = page.locator("button:has-text('OTET 1L')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click(force=True)
        page.wait_for_timeout(500)
        
        print("[DEBUG] Clicking + button in cart until disabled...")
        plus_btn = page.locator("button", has=page.locator("svg.lucide-plus")).first
        for _ in range(200):
            if plus_btn.is_disabled():
                print("[PASS] Scenario 4 PASS: Stoc insuficient prins din frontend la limitarea quantity (+ disabled)!")
                break
            plus_btn.click(force=True)
            page.wait_for_timeout(20)
        else:
            raise Exception("Nu a aparut eroarea de stoc insuficient, butonul + a ramas activ.")
            
        page.wait_for_timeout(1000)
        
        # Golește coșul ca să rămânem clean
        # Nu există buton explicit de golire în cod, așa că vom șterge manual itemul din coș
        trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
        if trash_btn.is_visible():
            trash_btn.click()
        page.wait_for_timeout(1000)

        # --- SCENARIO 5: Plata Mixta Invalida ---
        print("\n--- SCENARIO 5: Plata Mixta Invalida ---")
        add_otet_to_cart()
        total_mixt = extract_total()
        
        page.locator("button:has-text('MIXT')").click()
        page.wait_for_timeout(500)
        
        cash_part = total_mixt + 10 # wrong total
        card_part = 5 # wrong total
        
        cash_input = page.locator("label:has-text('SUMĂ CASH')").locator("..").locator("input")
        card_input = page.locator("label:has-text('SUMĂ CARD')").locator("..").locator("input")
        
        cash_input.fill(f"{cash_part:.2f}")
        card_input.fill(f"{card_part:.2f}")
        
        print("[DEBUG] Clicking INCASEAZA button...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        
        try:
            # We expect an error toast
            page.locator("text=nu coincide").wait_for(state="attached", timeout=3000)
            print("[PASS] Scenario 5 PASS: Plata mixta invalida blocata!")
        except Exception:
            total = extract_total()
            if total > 0:
                 print("[PASS] Scenario 5 PASS: Vanzarea a fost blocata (cosul nu s-a golit).")
            else:
                 raise Exception("Vanzarea cu sume mixte invalide a fost permisa!")
                 
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Toate scenariile de test pentru POS RPC au trecut cu succes!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
