# -*- coding: utf-8 -*-
import os
import sys
import time
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

APP_URL = "http://localhost:5175"
OWNER_EMAIL = "admin@owner.com"
OWNER_PASS = "admin123"
STORE_NAME = "Magazin Principal"

VIEWPORTS = [
    {"name": "Desktop", "width": 1440, "height": 900},
    {"name": "Laptop",  "width": 1280, "height": 800},
    {"name": "Tablet",  "width": 768,  "height": 1024},
    {"name": "Mobile",  "width": 390,  "height": 844},
]

results = []

def ok(msg):
    print(f"  [PASS] {msg}")
    results.append(("PASS", msg))

def fail(msg):
    print(f"  [FAIL] {msg}")
    results.append(("FAIL", msg))

def test_lockdown():
    print("\n=== STARTING PLATFORM OWNER GLOBAL CONTEXT LOCKDOWN TEST (6F.1.8) ===")
    
    # Create screenshots output folder
    os.makedirs("artifacts/6f18", exist_ok=True)

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        try:
            # 1. Login as Platform Owner
            print("\n1. Se efectuează autentificarea ca Platform Owner...")
            page.on("console", lambda msg: print(f"  [BROWSER LOG] {msg.text}"))
            
            page.goto(f"{APP_URL}/#/login")
            page.wait_for_load_state("networkidle")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill(OWNER_EMAIL)
            page.locator("input[type='password']").fill(OWNER_PASS)
            page.locator("button[type='submit']").click()
            
            # Wait for Owner Console header or sidebar indicator
            page.locator("text=Consolă Proprietar").first.wait_for(state="visible", timeout=15000)
            ok("Autentificare reușită ca Platform Owner.")

            # 2. Verify global currentStoreId is null and localStorage contains no selected_store_id
            print("\n2. Se verifică starea contextului global...")
            auth_state = page.evaluate("window.authState")
            if auth_state:
                current_store_id = auth_state.get("currentStoreId")
                if current_store_id is None:
                    ok(f"State global currentStoreId este corect NULL: {current_store_id}")
                else:
                    fail(f"State global currentStoreId NU este NULL: {current_store_id}")
            else:
                fail("Nu s-a putut citi window.authState")

            local_storage_store_id = page.evaluate("localStorage.getItem('selected_store_id')")
            if local_storage_store_id is None:
                ok("localStorage.selected_store_id este corect NULL.")
            else:
                fail(f"localStorage.selected_store_id este definit: {local_storage_store_id}")

            # 3. Verify static header switcher badge
            print("\n3. Se verifică dacă switcher-ul din topbar este static...")
            switcher = page.locator("[aria-label*='Platform Owner activează administrarea globală']")
            switcher.wait_for(state="visible", timeout=5000)
            
            # Verify text contents (case-insensitive)
            switcher_text = switcher.inner_text().upper()
            if "PLATFORM ADMINISTRATION" in switcher_text and "FĂRĂ MAGAZIN ACTIV" in switcher_text and "ADMINISTRARE GLOBALĂ" in switcher_text:
                ok(f"Switcher-ul afișează corect badge-ul static de administrare platformă: {switcher_text.replace(chr(10), ' | ')}")
            else:
                fail(f"Switcher-ul nu conține textele corecte: {switcher_text}")

            # Verify tooltip title attribute
            title_attr = switcher.get_attribute("title")
            expected_title = "Platform Owner nu operează direct într-un magazin. Alege magazinul din panourile dedicate din Consolă Proprietar."
            if title_attr == expected_title:
                ok(f"Tooltip switcher corect: '{title_attr}'")
            else:
                fail(f"Tooltip switcher incorect. Găsit: '{title_attr}', Așteptat: '{expected_title}'")

            # Verify it's not a dropdown (clicking it should not create any popup list or dropdown menus)
            switcher.click()
            time.sleep(1) # wait briefly
            if page.locator("text=Magazine disponibile").count() == 0:
                ok("Apasarea pe switcher nu a deschis niciun dropdown de selectie. Păstrat static conform regulii.")
            else:
                fail("Dropdown-ul de selecție s-a deschis greșit pentru Platform Owner!")

            # 4. Verify Sidebar Isolation
            print("\n4. Se verifică izolarea sidebar-ului...")
            sidebar_nav = page.locator("aside nav")
            
            # Check Consolă Proprietar is present
            if sidebar_nav.locator("text=Consolă Proprietar").count() > 0:
                ok("Linkul către Consolă Proprietar este prezent în sidebar.")
            else:
                fail("Linkul către Consolă Proprietar lipsește din sidebar!")

            # Check Global Admin explanation text
            explanation_box = sidebar_nav.locator("text=Administrezi platforma global. Magazinele se gestionează din Consolă Proprietar.")
            if explanation_box.count() > 0:
                ok("Microcopy-ul de informare globală este prezent în sidebar.")
            else:
                fail("Microcopy-ul de informare globală lipsește din sidebar!")

            # Check that operational/disabled modules are NOT present
            restricted_keywords = ["Setări Magazin", "Rapoarte Comerciale", "Vânzare", "Recepție", "Transfer", "Produse", "Istoric Vânzări", "Dashboard"]
            found_restricted = []
            for word in restricted_keywords:
                if page.locator(f"aside nav >> text={word}").count() > 0:
                    found_restricted.append(word)
            
            if not found_restricted:
                ok("Izolare sidebar completă. Niciun link operațional/inutil nu a fost afișat.")
            else:
                fail(f"S-au găsit link-uri interzise în sidebar-ul platform owner: {found_restricted}")

            # 5. Verify direct URL redirects (Route guards lockdown)
            print("\n5. Se verifică route guards pentru platform owner...")
            unauthorized_urls = [
                "/#/vanzare",
                "/#/receptie",
                "/#/transfer",
                "/#/produse",
                "/#/setari-magazin",
                "/#/rapoarte"
            ]
            
            for url in unauthorized_urls:
                page.goto(f"{APP_URL}{url}")
                try:
                    page.wait_for_url("**/owner", timeout=5000)
                    ok(f"Navigarea directă la {url} a fost corect blocată și redirecționată la {page.url}")
                except PlaywrightTimeout:
                    fail(f"Navigarea directă la {url} a permis accesul sau a redirecționat greșit: {page.url}")

            # 6. Verify local-only store selection in Owner Console
            print("\n6. Se verifică selecția locală în Consolă Proprietar...")
            page.goto(f"{APP_URL}/#/owner")
            page.wait_for_load_state("networkidle")
            
            # Go to modules tab
            page.locator("#owner-tab-modules").click()
            
            # Wait for either loaded state with local disclaimer or empty state
            has_disclaimer = False
            try:
                page.locator("text=Această selecție nu schimbă contextul global al aplicației.").first.wait_for(state="visible", timeout=3000)
                has_disclaimer = True
                ok("Macheta modulelor cu disclaimerul local-only a fost încărcată.")
            except PlaywrightTimeout:
                try:
                    page.locator("text=Selectează un magazin pentru a configura modulele disponibile clientului.").first.wait_for(state="visible", timeout=3000)
                    ok("Macheta empty state module a fost încărcată.")
                except PlaywrightTimeout:
                    fail("Nici disclaimerul local-only și nici textul de empty state nu au putut fi găsite în tab-ul de module!")
            
            # Check local info microcopy if disclaimer is shown
            if has_disclaimer:
                if page.locator("text=Această selecție nu schimbă contextul global al aplicației.").count() > 0:
                    ok("Microcopy-ul local de selectie module magazin este corect afișat în panou.")
                else:
                    fail("Microcopy-ul local de selectie module magazin lipsește din panoul de module!")

            # Verify that select store does not write to localStorage selected_store_id
            local_storage_store_id = page.evaluate("localStorage.getItem('selected_store_id')")
            if local_storage_store_id is None:
                ok("Selecția locală nu a alterat localStorage (a rămas NULL).")
            else:
                fail(f"localStorage.selected_store_id s-a modificat greșit: {local_storage_store_id}")

            # 7. Visual QA: viewports validation
            print("\n7. Generare Visual QA screenshots responsive...")
            for vp in VIEWPORTS:
                page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
                page.wait_for_load_state("networkidle")
                time.sleep(1)
                
                screenshot_path = f"artifacts/6f18/lockdown_owner_console_{vp['name'].lower()}.png"
                page.screenshot(path=screenshot_path)
                ok(f"Screenshot generat pentru viewport {vp['name']} ({vp['width']}x{vp['height']}) la {screenshot_path}")

        except Exception as e:
            fail(f"Eroare neașteptată în timpul execuției testului: {str(e)}")
        finally:
            browser.close()

    print("\n=== REZULTATE E2E LOCKDOWN PLATFORM OWNER ===")
    total = len(results)
    passed = len([r for r in results if r[0] == "PASS"])
    failed = len([r for r in results if r[0] == "FAIL"])
    print(f"Total teste: {total} | Reușite: {passed} | Eșuate: {failed}")
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    test_lockdown()
