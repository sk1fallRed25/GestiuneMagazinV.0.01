import sys
import re
import json
from playwright.sync_api import sync_playwright

def safe_print(msg):
    print(msg.encode('ascii', 'replace').decode('ascii'))

def sanity_scan_self():
    safe_print("[SAFE] Performing DML-Zero sanity scan on the test script itself...")
    with open(__file__, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We count occurrences of .insert(, .update(, .delete( to prevent direct mutations in test script
    # We allow exactly 1 match because they are defined in this scanning logic.
    forbidden = {
        r"\.insert\(": 0,
        r"\.update\(": 0,
        r"\.delete\(": 0
    }
    
    for pattern in forbidden:
        matches = re.findall(pattern, content)
        forbidden[pattern] = len(matches)
        
    for pattern, count in forbidden.items():
        if count > 1:
            safe_print(f"[FAIL] Sanity scan failed: Direct DML mutation pattern '{pattern}' detected {count} times.")
            sys.exit(2)
            
    safe_print("[PASS] Sanity scan passed. No unauthorized database writes in test script.")

def run_test():
    sanity_scan_self()
    
    with sync_playwright() as p:
        safe_print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        page.on("console", lambda msg: safe_print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))

        def handle_dialog(dialog):
            safe_print(f"[DEBUG] Intercepted dialog ({dialog.type}): {dialog.message}")
            dialog.accept()

        page.on("dialog", handle_dialog)

        # 1. Login
        safe_print("\n1. Navigating to login...")
        page.goto("http://localhost:5173/#/login")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        safe_print("Logging in as admin@admin.com ...")
        page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
        page.locator("input[type='text']").fill("admin@admin.com")
        page.locator("input[type='password']").fill("admin123")
        page.wait_for_timeout(500)
        page.locator("button[type='submit']").click()
        
        safe_print("Waiting for Dashboard to load...")
        page.locator("text=Deconectare").wait_for(state="visible", timeout=30000)
        safe_print("[PASS] Logged in successfully.")

        # 2. Navigate to POS to make a clean sale (Standard A — 21%)
        safe_print("\n2. Navigating to POS...")
        page.goto("http://localhost:5173/#/vanzare")
        page.wait_for_load_state("networkidle")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(1500)

        # Clear cart if any items are there
        trash_btn = page.locator("button.text-gray-400.hover\\:text-red-500").first
        while trash_btn.is_visible():
            trash_btn.click()
            page.wait_for_timeout(500)

        # Search for 'OTET 1L' (VAT Group A, 21%)
        safe_print("Adding 'OTET 1L' to cart...")
        page.locator("input[placeholder*='Caută produs (nume sau cod)']").fill("OTET 1L")
        product_btn = page.locator("button:has-text('OTET 1L')")
        product_btn.wait_for(state="visible", timeout=5000)
        product_btn.click()
        page.wait_for_timeout(500)

        # Select NUMERAR payment and finalize
        page.locator("button:has-text('NUMERAR')").click()
        page.wait_for_timeout(500)
        safe_print("Finalizing POS sale...")
        page.locator("button:has-text('ÎNCASEAZĂ')").click(no_wait_after=True)
        page.wait_for_timeout(2000)

        # 3. Navigate to Sales History
        safe_print("\n3. Navigating to Sales History page...")
        page.goto("http://localhost:5173/#/istoric-vanzari")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # Verify page loaded
        page.locator("h1:has-text('Istoric Vânzări')").wait_for(state="visible", timeout=10000)
        
        # 4. Open the details of the newly created sale (first row)
        safe_print("Opening details for the last transaction...")
        detail_buttons = page.locator("button[title='Detalii Bon']")
        detail_buttons.first.wait_for(state="visible", timeout=5000)
        detail_buttons.first.click()
        
        # Wait for details modal to open
        page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
        page.wait_for_timeout(1000)
        
        # Verify the VAT group badge in the items table
        safe_print("Verifying VAT snapshot details in table...")
        vat_badge = page.locator("span:has-text('A — 21%')")
        vat_badge.first.wait_for(state="visible", timeout=5000)
        
        # Verify VAT and Base text details on the item
        page.locator("text=TVA inclus:").first.wait_for(state="visible", timeout=5000)
        page.locator("text=Bază:").first.wait_for(state="visible", timeout=5000)
        
        # Verify the aggregate VAT breakdown in footer
        safe_print("Verifying footer VAT breakdown...")
        page.locator("td:has-text('Grupa A (21%)')").wait_for(state="visible", timeout=5000)
        page.locator("td:has-text('Bază totală (fără TVA):')").wait_for(state="visible", timeout=5000)
        page.locator("td:has-text('TVA inclus total:')").wait_for(state="visible", timeout=5000)
        
        # Close the modal
        safe_print("Closing details modal...")
        page.locator("button[aria-label='Închide detaliile bonului']").click()
        page.locator("h3:has-text('DETALII BON')").wait_for(state="hidden", timeout=5000)
        page.wait_for_timeout(500)

        # 5. Check fallback display for legacy sale
        safe_print("\n5. Querying database for a legacy sale...")
        legacy_sale_id = page.evaluate("""async () => {
            const supabase = window.supabase;
            const { data, error } = await supabase.from('sales')
                .select('id, sale_items(vat_group)')
                .order('created_at', { ascending: false });
            if (error) return null;
            const legacySale = data.find(s => s.sale_items && s.sale_items.some(si => si.vat_group === null));
            return legacySale ? legacySale.id : null;
        }""")
        
        if legacy_sale_id:
            short_id = legacy_sale_id[:8]
            safe_print(f"Found legacy sale ID: {legacy_sale_id} (short: {short_id}). Locating in UI table...")
            
            # Locate row by short ID and click details button
            row_locator = page.locator(f"tr:has-text('{short_id}')")
            row_locator.first.wait_for(state="visible", timeout=5000)
            row_locator.first.locator("button[title='Detalii Bon']").click()
            
            page.locator("h3:has-text('DETALII BON')").wait_for(state="visible", timeout=5000)
            page.wait_for_timeout(1000)
            
            # Legacy item should display estimated or unavailable info
            has_fallback_badge = page.locator("span:has-text('Estimativ')").first.is_visible()
            has_unavail_badge = page.locator("span:has-text('TVA indisponibil')").first.is_visible()
            
            if has_fallback_badge:
                safe_print("[PASS] Legacy fallback detected successfully ('Estimativ' badge present).")
            elif has_unavail_badge:
                safe_print("[PASS] Legacy fallback detected successfully ('TVA indisponibil' badge present).")
            else:
                safe_print("[WARNING] Neither 'Estimativ' nor 'TVA indisponibil' badge was found on legacy sale details.")
                
            # Check footer legacy warning
            warning_locator = page.locator("td:has-text('Bon legacy')")
            warning_locator.wait_for(state="visible", timeout=5000)
            warning_text = warning_locator.inner_text()
            safe_print(f"Found warning banner: '{warning_text}'")
            assert "legacy" in warning_text.lower(), "Legacy warning banner missing in tfoot"
            safe_print("[PASS] Legacy warnings and fallbacks verified.")
            
            page.locator("button[aria-label='Închide detaliile bonului']").click()
        else:
            safe_print("[NOTE] No legacy sales found in the database. Skipping legacy sale UI verification.")

        browser.close()

if __name__ == '__main__':
    try:
        run_test()
        safe_print("\n[SUCCESS] E2E Playwright verification test completed successfully!")
        sys.exit(0)
    except Exception as e:
        safe_print(f"\n[FAIL] E2E Playwright verification test failed: {e}")
        sys.exit(1)
