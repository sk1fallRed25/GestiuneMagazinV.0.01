import sys
import re
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
        
        print("Navigating to login...")
        page.goto("http://localhost:5173/#/login")
        page.wait_for_load_state("networkidle")
        
        print("Logging in as admin@admin.com ...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        
        page.locator("text=Magazin Principal").wait_for(state="visible", timeout=15000)
        print("[PASS] Logged in successfully.")
        
        product_name = "OTET 1L"  # We use OTET 1L as it exists and is tested
        
        # --- A. RECEPTION (receive_stock) ---
        print("\n--- A. RECEPTION (receive_stock) ---")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        
        page.locator("input[placeholder='Ex: 123456']").fill("REC-SMOKE-5D6")
        page.locator("textarea[placeholder*='Detalii suplimentare']").fill("Smoke Test 5D.6")
        
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill(product_name)
        page.locator(f"div.cursor-pointer:has-text('{product_name}')").wait_for(state="visible", timeout=5000)
        page.locator(f"div.cursor-pointer:has-text('{product_name}')").click()
        
        page.locator("input[placeholder='Cantitate']").fill("5")
        page.locator("input[placeholder='0.00']").fill("1.00")
        page.locator("input[placeholder='Lot']").fill("SMOKE-5D6")
        page.wait_for_timeout(500)
        
        page.locator("button:has-text('Linie')").click()
        page.wait_for_timeout(1000)
        
        print("[DEBUG] Submitting reception...")
        page.locator("button:has-text('FINALIZEAZ')").click(no_wait_after=True)
        
        try:
            page.wait_for_selector("[data-testid='reception-detail-page']", timeout=10000)
            print("[PASS] Reception successful (toast or detail page detected)!")
        except Exception as e:
            try:
                doc_val = page.locator("input[placeholder='Ex: 123456']").input_value(timeout=2000)
                if doc_val == "":
                    print("[PASS] Reception successful (form reset)!")
                else:
                    raise Exception("Reception failed, form not reset!")
            except Exception:
                raise e
            
        page.wait_for_timeout(2000)
        
        # --- B. TRANSFER (transfer_stock) ---
        print("\n--- B. TRANSFER (transfer_stock) ---")
        page.goto("http://localhost:5173/#/transfer")
        page.wait_for_load_state("networkidle")
        
        page.locator("input[placeholder*='Caut']").last.wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Caut']").last.fill(product_name)
        
        product_btn = page.locator(f"div.cursor-pointer:has-text('{product_name}')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        
        page.locator("input[type='number']").wait_for(state="visible", timeout=5000)
        page.locator("input[type='number']").fill("2")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Submitting transfer...")
        page.locator("button:has-text('TRANSFER')").click(no_wait_after=True)
        
        try:
            page.locator("text=Transfer realizat").wait_for(state="attached", timeout=10000)
            print("[PASS] Transfer successful (toast detected)!")
        except Exception:
            qty_val = page.locator("input[type='number']").input_value()
            if qty_val == "":
                print("[PASS] Transfer successful (form reset)!")
            else:
                raise Exception("Transfer failed, form not reset!")
            
        page.wait_for_timeout(2000)
        
        # --- C. POS (finalize_sale) ---
        print("\n--- C. POS (finalize_sale) ---")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        
        page.locator("input[placeholder*='Caut']").last.wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Caut']").last.fill(product_name)
        
        pos_product = page.locator(f"button:has-text('{product_name}')")
        pos_product.wait_for(state="visible", timeout=5000)
        pos_product.click()
        page.wait_for_timeout(1000)
        
        page.locator("button:has-text('NUMERAR')").click()
        print("[DEBUG] Submitting POS sale...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        
        try:
            page.locator("text=finalizat").wait_for(state="attached", timeout=10000)
            print("[PASS] POS sale successful (toast detected)!")
        except Exception:
            total_text = page.locator("span.text-5xl").inner_text()
            import re
            match = re.search(r"([\d.]+)", total_text)
            total = float(match.group(1)) if match else 0.0
            if total == 0.0:
                print("[PASS] POS sale successful (cart reset)!")
            else:
                raise Exception("POS sale failed, cart not reset!")
            
        page.wait_for_timeout(2000)
        
        # --- D. WASTE (record_waste) ---
        print("\n--- D. WASTE (record_waste) ---")
        page.goto("http://localhost:5173/#/pierderi")
        page.wait_for_load_state("networkidle")
        
        page.locator("input[placeholder*='Denumire sau Cod Bare']").wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill(product_name)
        
        waste_product = page.locator(f"button:has-text('{product_name}')")
        waste_product.wait_for(state="visible", timeout=5000)
        waste_product.click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Depozit')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("1")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Smoke Test 5D.6 Waste")
        page.wait_for_timeout(500)
        
        print("[DEBUG] Submitting waste...")
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        
        try:
            page.locator("text=Casare înregistrată cu succes!").wait_for(state="attached", timeout=10000)
            print("[PASS] Waste recording successful (toast detected)!")
        except Exception:
            page.locator("text=Raport Casare").wait_for(state="detached", timeout=10000)
            print("[PASS] Waste recording successful (modal closed)!")
            
        page.wait_for_timeout(2000)
        
        # --- NEGATIVE TESTS ---
        print("\n--- NEGATIVE TESTS ---")
        
        # 1. Invalid Reception
        print("Testing Invalid Reception...")
        page.goto("http://localhost:5173/#/receptie")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder='Ex: 123456']").wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder='Ex: 123456']").fill("REC-INVALID-002")
        page.locator("input[placeholder*='Scrie denumirea sau codul']").fill(product_name)
        page.locator(f"div.cursor-pointer:has-text('{product_name}')").wait_for(state="visible", timeout=5000)
        page.locator(f"div.cursor-pointer:has-text('{product_name}')").click()
        page.locator("input[placeholder='Cantitate']").fill("0")
        page.locator("button:has-text('Linie')").click()
        try:
            page.locator("text=pozitiv").wait_for(state="attached", timeout=5000)
            print("[PASS] Invalid Reception blocked by UI (toast detected)!")
        except Exception:
            page.locator("button:has-text('FINALIZEAZ')").wait_for(state="detached", timeout=5000)
            print("[PASS] Invalid Reception blocked by UI (finalize button detached)!")
            
        # 2. Invalid Transfer (> stock)
        print("Testing Invalid Transfer...")
        page.goto("http://localhost:5173/#/transfer")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder*='Caut']").last.wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Caut']").last.fill(product_name)
        product_btn = page.locator(f"div.cursor-pointer:has-text('{product_name}')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        page.locator("input[type='number']").wait_for(state="visible", timeout=5000)
        page.locator("input[type='number']").fill("99999")
        page.locator("button:has-text('TRANSFER')").click(no_wait_after=True)
        try:
            page.locator("text=insuficient").wait_for(state="attached", timeout=10000)
            print("[PASS] Invalid Transfer blocked by UI/Backend (toast detected)!")
        except Exception:
            qty_val = page.locator("input[type='number']").input_value()
            if qty_val == "99999":
                print("[PASS] Invalid Transfer blocked by UI/Backend (input not reset)!")
            else:
                print("[FAIL] Invalid Transfer not blocked!")
                raise Exception("Invalid Transfer was not blocked (form reset).")
            
        # 3. Invalid POS (> stock)
        print("Testing Invalid POS...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder*='Caut']").last.wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Caut']").last.fill(product_name)
        pos_product = page.locator(f"button:has-text('{product_name}')")
        pos_product.wait_for(state="visible", timeout=5000)
        pos_product.click()
        page.wait_for_timeout(500)
        
        plus_btn = page.locator("button", has=page.locator("svg.lucide-plus")).first
        for _ in range(100):
            if plus_btn.is_disabled():
                print("[PASS] Invalid POS blocked by UI!")
                break
            plus_btn.click(force=True)
            page.wait_for_timeout(10)
            
        # 4. Invalid Waste (> stock)
        print("Testing Invalid Waste...")
        page.goto("http://localhost:5173/#/pierderi")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder*='Denumire sau Cod Bare']").wait_for(state="visible", timeout=10000)
        page.locator("input[placeholder*='Denumire sau Cod Bare']").fill(product_name)
        waste_product = page.locator(f"button:has-text('{product_name}')")
        waste_product.wait_for(state="visible", timeout=5000)
        waste_product.click()
        
        page.locator("text=Raport Casare").wait_for(state="visible", timeout=5000)
        page.locator("div.max-w-2xl button:has-text('Depozit')").click()
        page.locator("div.max-w-2xl input[type='number']").fill("99999")
        page.locator("div.max-w-2xl select").select_option("Produs deteriorat")
        page.locator("div.max-w-2xl textarea").fill("Smoke Test Invalid Waste")
        page.wait_for_timeout(500)
        
        page.locator("div.max-w-2xl button:has-text('Confirmă Casarea')").click(no_wait_after=True)
        try:
            page.locator("text=Stoc insuficient").wait_for(state="attached", timeout=10000)
            print("[PASS] Invalid Waste blocked by UI/Backend (toast detected)!")
        except Exception:
            page.locator("text=Raport Casare").wait_for(state="visible", timeout=10000)
            print("[PASS] Invalid Waste blocked by UI/Backend (modal remained open)!")
            
        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        print("\n[SUCCESS] Transactional Smoke Test 5D.6 passed!")
        sys.exit(0)
    except Exception as e:
        err_str = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"\n[FAIL] Test esuat: {err_str}")
        sys.exit(1)
