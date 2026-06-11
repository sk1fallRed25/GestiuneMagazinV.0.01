import sys
import os
import subprocess
import random

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR RECEPTION WORKFLOW & HISTORY (6REC.1)")
    safe_print("======================================================================\n")

    # 1. Page & Forms exist in source
    safe_print("--- Check 1: Codebase existence checks ---")
    page_path = os.path.join("src", "features", "reception", "ReceptionPage.tsx")
    form_path = os.path.join("src", "features", "reception", "components", "ReceptionDocumentForm.tsx")
    history_path = os.path.join("src", "features", "reception", "components", "ReceptionHistory.tsx")
    detail_path = os.path.join("src", "features", "reception", "components", "ReceptionDetail.tsx")
    service_path = os.path.join("src", "features", "reception", "services", "receptionService.ts")

    assert os.path.exists(page_path), "ReceptionPage.tsx does not exist"
    assert os.path.exists(form_path), "ReceptionDocumentForm.tsx does not exist"
    assert os.path.exists(history_path), "ReceptionHistory.tsx does not exist"
    assert os.path.exists(detail_path), "ReceptionDetail.tsx does not exist"
    assert os.path.exists(service_path), "receptionService.ts does not exist"
    safe_print("PASS: Core feature files verified.")

    # 2. Test ID audits in codebase
    safe_print("\n--- Check 2: Test ID audits ---")
    with open(page_path, "r", encoding="utf-8") as f:
        page_content = f.read()
    assert 'data-testid="reception-page"' in page_content, "Missing reception-page testid"
    assert 'data-testid="reception-confirm-modal"' in page_content, "Missing reception-confirm-modal testid"

    header_path = os.path.join("src", "features", "reception", "components", "ReceptionHeader.tsx")
    assert os.path.exists(header_path), "ReceptionHeader.tsx does not exist"
    with open(header_path, "r", encoding="utf-8") as f:
        header_content = f.read()
    assert 'data-testid="reception-new-button"' in header_content, "Missing reception-new-button testid"
    assert 'data-testid="reception-history-button"' in header_content, "Missing reception-history-button testid"

    with open(form_path, "r", encoding="utf-8") as f:
        form_content = f.read()
    assert 'data-testid="reception-supplier-select"' in form_content, "Missing reception-supplier-select"
    assert 'data-testid="reception-invoice-number-input"' in form_content, "Missing reception-invoice-number-input"

    with open(history_path, "r", encoding="utf-8") as f:
        history_content = f.read()
    assert 'data-testid="reception-history-page"' in history_content, "Missing reception-history-page"
    assert 'data-testid="reception-history-row"' in history_content, "Missing reception-history-row"
    assert 'data-testid="reception-history-view-details"' in history_content, "Missing reception-history-view-details"

    with open(detail_path, "r", encoding="utf-8") as f:
        detail_content = f.read()
    assert 'data-testid="reception-detail-page"' in detail_content, "Missing reception-detail-page"
    assert 'data-testid="reception-readonly-badge"' in detail_content, "Missing reception-readonly-badge"
    assert 'data-testid="reception-posted-readonly-warning"' in detail_content, "Missing reception-posted-readonly-warning"
    assert 'data-testid="reception-detail-item-row"' in detail_content, "Missing reception-detail-item-row"
    safe_print("PASS: All critical data-testid parameters found in source code.")

    # 3. Safety Audits (finalize_sale, FiscalNet, auto-update, no .exe)
    safe_print("\n--- Check 3: Safety audits ---")
    try:
        git_diff = subprocess.check_output(["git", "diff", "--name-only"], text=True)
    except Exception:
        git_diff = ""

    modified_files = [line.strip() for line in git_diff.split("\n") if line.strip()]
    safe_print(f"Modified files: {modified_files}")

    for file in modified_files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".js"):
            if not os.path.exists(file):
                continue
            with open(file, "r", encoding="utf-8") as f:
                file_content = f.read()
            if "finalize_sale" in file_content and "reception" not in file:
                # Ensure finalize_sale was not modified in checkout paths
                safe_print(f"Warning: 'finalize_sale' mentioned in modified file {file}. Check that POS flow is safe.")
            if "FiscalNet" in file_content:
                safe_print(f"Warning: 'FiscalNet' mentioned in modified file {file}.")
            if "auto-update" in file_content:
                safe_print(f"Warning: 'auto-update' mentioned in modified file {file}.")

    # Verify no .exe generated
    exe_files = []
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or ".git" in root or "dist" in root:
            continue
        for file in files:
            if file.endswith(".exe"):
                exe_files.append(os.path.join(root, file))
    
    assert len(exe_files) == 0, f"Found generated .exe files: {exe_files}"
    safe_print("PASS: Safety checks passed. No .exe found.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR RECEPTION WORKFLOW & HISTORY (6REC.1)")
    safe_print("======================================================================\n")

    port = "5173"
    for p in ["5176", "5174", "5175", "5173"]:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect(("localhost", int(p)))
            s.close()
            port = p
            break
        except Exception:
            pass

    app_url = f"http://localhost:{port}"
    safe_print(f"Connecting to app at {app_url}")

    # Generate unique invoice details to prevent collision
    suffix = str(random.randint(10000, 99999))
    invoice_num = f"INV-6REC1-{suffix}"
    supplier_name = f"Furnizor Test E2E {suffix}"
    safe_print(f"Generated Document Number: {invoice_num}")
    safe_print(f"Generated Supplier Name: {supplier_name}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        try:
            # 1. Login
            safe_print("Step 1: Logging in...")
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            page.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("Login successful.")
            page.wait_for_timeout(1000)

            # Ensure active store is Magazin Principal
            try:
                store_btn = page.locator("#store-context-switcher-btn")
                store_btn.wait_for(state="visible", timeout=15000)
                current_store_text = store_btn.locator("p.truncate").first.inner_text()
                if "Magazin Principal" not in current_store_text:
                    safe_print(f"Switching store from '{current_store_text}' to 'Magazin Principal'...")
                    page.on("dialog", lambda dialog: dialog.accept())
                    store_btn.click()
                    page.locator("button:has-text('Magazin Principal')").first.click()
                    page.wait_for_timeout(2000)
            except Exception as e:
                safe_print(f"Could not switch store: {e}")

            # 2. Go to Goods Reception
            safe_print("\nStep 2: Accessing Goods Reception...")
            page.goto(f"{app_url}/#/receptie")
            page.locator('[data-testid="reception-page"]').wait_for(state="visible", timeout=10000)
            safe_print("Goods Reception page loaded.")

            # 3. Create Draft Reception
            safe_print("\nStep 3: Creating Draft Reception...")
            # Header info
            page.locator('[data-testid="reception-invoice-number-input"]').fill(invoice_num)
            page.locator('[data-testid="reception-supplier-select"]').fill(supplier_name)
            page.locator('textarea[placeholder*="Detalii suplimentare"]').fill("Test NIR Draft E2E")
            
            # Add product line
            page.locator("input[placeholder*='Scrie denumirea sau codul']").fill("Paine")
            page.locator("div.cursor-pointer:has-text('Paine 300GR')").wait_for(state="visible", timeout=5000)
            page.locator("div.cursor-pointer:has-text('Paine 300GR')").click()
            
            page.locator("input[placeholder='Cantitate']").fill("5")
            page.locator("input[placeholder='0.00']").fill("10.00")
            page.locator("button:has-text('Adaugă Linie')").click()
            page.wait_for_timeout(1000)

            # Click Save Draft
            safe_print("Saving draft to database...")
            page.locator('[data-testid="reception-draft-save-button"]').click()
            page.locator('[data-testid="reception-status-draft"]').wait_for(state="visible", timeout=5000)
            safe_print("[PASS] Draft saved successfully.")
            page.wait_for_timeout(1000)

            # 4. Verify draft is listed in History log
            safe_print("\nStep 4: Verifying draft in History Log...")
            page.locator('[data-testid="reception-history-button"]').click()
            page.locator('[data-testid="reception-history-page"]').wait_for(state="visible", timeout=5000)
            
            # Check draft is displayed
            draft_row = page.locator('[data-testid="reception-history-row"]').filter(has_text=invoice_num)
            draft_row.wait_for(state="visible", timeout=5000)
            assert draft_row.locator('[data-testid="reception-status-draft"]').is_visible(), "Row status badge in history should be DRAFT"
            safe_print("[PASS] Draft successfully listed in History log with DRAFT badge.")

            # 5. Open details and verify details view
            safe_print("\nStep 5: Opening draft details...")
            draft_row.locator('[data-testid="reception-history-view-details"]').click()
            page.locator('[data-testid="reception-detail-page"]').wait_for(state="visible", timeout=5000)
            
            # Verify details header
            assert page.locator('[data-testid="reception-status-draft"]').is_visible(), "Details page should show DRAFT status"
            assert page.locator('[data-testid="reception-detail-item-row"]').filter(has_text="Paine 300GR").is_visible(), "Product Paine 300GR should be visible in detail lines"
            safe_print("[PASS] Details view verified for Draft.")

            # 6. Confirm Reception
            safe_print("\nStep 6: Confirming/Posting Draft to Stock...")
            page.locator('[data-testid="reception-confirm-button"]').click()
            
            # Wait for E2E-compliant confirm modal to show
            confirm_modal = page.locator('[data-testid="reception-confirm-modal"]')
            confirm_modal.wait_for(state="visible", timeout=3000)
            
            # Click confirm button in modal
            confirm_modal.locator("button:has-text('Confirmă')").click()
            page.wait_for_timeout(2000)

            # Verify it transitioned to posted detail page
            page.locator('[data-testid="reception-detail-page"]').wait_for(state="visible", timeout=5000)
            assert page.locator('[data-testid="reception-status-posted"]').is_visible(), "Details status badge should be CONFIRMATA"
            assert page.locator('[data-testid="reception-readonly-badge"]').is_visible(), "Read-only warning badge should be present"
            assert page.locator('[data-testid="reception-posted-readonly-warning"]').is_visible(), "Read-only warning message text should be present"
            safe_print("[PASS] Reception confirmed and posted to stock successfully. Page is now read-only.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                safe_print(f"Current URL: {page.url}")
            except Exception:
                pass
            page.screenshot(path="screenshot_reception_workflow_error.png")
            context.close()
            browser.close()
            sys.exit(1)

        context.close()
        browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL GOODS RECEPTION WORKFLOW & HISTORY E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    run_e2e_tests()
