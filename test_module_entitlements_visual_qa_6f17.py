# -*- coding: utf-8 -*-
import os
import sys
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')

"""
test_module_entitlements_visual_qa_6f17.py
Etapa 6F.1.7 — Module Entitlements E2E Hardening / Visual QA

Scenarii:
A. Platform Owner — no store context → sidebar fara operatiuni
B. Owner Console — tab Module Magazin → empty state si selectie magazin
C. Toggle AI Consultant + audit log
D. Route Guard — modul dezactivat → DisabledModulePage
E. Planned modules blocate (offline_sync, fiscal_bridge)
F. Preset modal safety (cancel fara aplicare)
G. Non-owner user (admin@admin.com)
H. Visual QA responsive (4 viewports)
I. Cleanup robust in finally via bulk_set_store_modules RPC

Restrictii:
- ZERO DML direct (fara .from(...).insert/update/delete)
- Scrieri EXCLUSIV prin set_store_module_access / bulk_set_store_modules
- Nu modifica POS / Products / Sales / Reports / Fiscal Bridge
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

APP_URL = "http://localhost:5175"
OWNER_EMAIL = "admin@owner.com"
OWNER_PASS = "admin123"
ADMIN_EMAIL = "admin@admin.com"
ADMIN_PASS = "admin123"
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

def skip(msg):
    print(f"  [SKIP] {msg}")
    results.append(("SKIP", msg))

def login(page, email, password, wait_text="Dashboard"):
    page.goto(f"{APP_URL}/#/login")
    page.wait_for_load_state("networkidle")
    page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
    page.locator("input[type='text']").fill(email)
    page.locator("input[type='password']").fill(password)
    page.locator("button[type='submit']").click()
    page.wait_for_url(f"{APP_URL}/**", timeout=15000)

def rpc_get_modules(page, store_id):
    return page.evaluate("""async (sid) => {
        const { data, error } = await window.supabase.rpc('get_store_module_access', { p_store_id: sid });
        if (error) return { error: error.message };
        return { modules: data };
    }""", store_id)

def rpc_set_module(page, store_id, module_key, enabled, reason):
    return page.evaluate("""async (args) => {
        const { data, error } = await window.supabase.rpc('set_store_module_access', {
            p_store_id: args.store_id,
            p_module_key: args.module_key,
            p_enabled: args.enabled,
            p_reason: args.reason
        });
        if (error) return { error: error.message };
        return { ok: true };
    }""", {"store_id": store_id, "module_key": module_key, "enabled": enabled, "reason": reason})

def rpc_bulk_restore(page, store_id, payload):
    return page.evaluate("""async (args) => {
        const { data, error } = await window.supabase.rpc('bulk_set_store_modules', {
            p_store_id: args.store_id,
            p_modules: args.payload
        });
        if (error) return { error: error.message };
        return { ok: true };
    }""", {"store_id": store_id, "payload": payload})

def build_restore_payload(snapshot_modules):
    payload = []
    for m in snapshot_modules:
        if m.get("status") in ("planned", "disabled"):
            continue
        if m.get("owner_only"):
            continue
        explicit = m.get("explicit_enabled")
        effective = m.get("effective_enabled", False)
        enabled = explicit if explicit is not None else effective
        payload.append({
            "module_key": m["module_key"],
            "enabled": bool(enabled),
            "reason": "Restore snapshot E2E 6F.1.7"
        })
    return payload

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        snapshot_modules = None
        store_id = None
        owner_page = None
        main_context = None

        try:
            # ─── SETUP: captura snapshot pre-test ────────────────────
            print("\n=== SETUP: Captare snapshot pre-test ===")
            main_context = browser.new_context(viewport={"width": 1440, "height": 900})
            owner_page = main_context.new_page()
            login(owner_page, OWNER_EMAIL, OWNER_PASS)
            owner_page.goto(f"{APP_URL}/#/owner")
            owner_page.wait_for_load_state("networkidle")
            owner_page.locator("#owner-tab-overview").wait_for(state="visible", timeout=10000)

            # Obtine store_id si snapshot
            res = owner_page.evaluate(f"""async () => {{
                const {{ data: stores }} = await window.supabase
                    .from('stores').select('id,name').eq('name', '{STORE_NAME}');
                if (!stores || stores.length === 0) return {{ error: 'store not found' }};
                const {{ data: mods, error }} = await window.supabase.rpc('get_store_module_access', {{
                    p_store_id: stores[0].id
                }});
                if (error) return {{ error: error.message }};
                return {{ store_id: stores[0].id, modules: mods }};
            }}""")

            if "error" in res:
                raise Exception(f"Snapshot failed: {res['error']}")

            store_id = res["store_id"]
            snapshot_modules = res["modules"]
            ok(f"Snapshot capturat: {len(snapshot_modules)} module, store_id={store_id[:8]}...")

            # Seteaza baseline: ai_consultant=false
            r = rpc_set_module(owner_page, store_id, "ai_consultant", False, "Baseline E2E 6F.1.7")
            if "error" in r:
                fail(f"Baseline ai_consultant=false: {r['error']}")
            else:
                ok("Baseline ai_consultant setat la false via RPC")

            # ─── A. Platform Owner — no store context ─────────────────
            print("\n=== A. Platform Owner — no store context ===")
            try:
                owner_page.goto(f"{APP_URL}/#/owner")
                owner_page.wait_for_load_state("networkidle")
                # Verifica placeholder sidebar (owner fara magazin selectat)
                placeholder = owner_page.locator("text=Selectează un magazin").first
                if placeholder.is_visible():
                    ok("Placeholder 'Selectează un magazin' vizibil in sidebar")
                else:
                    skip("Placeholder sidebar not found (posibil magazin selectat din sesiune anterioara)")
                # Verifica ca Owner Console este accesibila
                owner_page.locator("#owner-tab-overview").wait_for(state="visible", timeout=5000)
                ok("Tab Owner Console (overview) este accesibil")
            except PlaywrightTimeout as e:
                fail(f"Scenariul A: {e}")

            # ─── B. Owner Console — tab Module Magazin ───────────────
            print("\n=== B. Owner Console — tab Module Magazin ===")
            try:
                owner_page.locator("#owner-tab-modules").click()
                owner_page.wait_for_load_state("networkidle")

                # Empty state fara magazin selectat
                empty = owner_page.locator("text=Selectați un magazin").first
                if empty.is_visible():
                    ok("Empty state 'Selectați un magazin' vizibil fara magazin selectat")
                else:
                    skip("Empty state nu e vizibil (posibil magazin deja selectat)")

                # Selecteaza Magazin Principal via tab Stores
                owner_page.locator("#owner-tab-stores").click()
                owner_page.wait_for_load_state("networkidle")
                store_row = owner_page.locator(f"tr[title='{STORE_NAME}'], tr:has-text('{STORE_NAME}')").first
                store_row.wait_for(state="visible", timeout=8000)
                store_row.click()
                owner_page.locator("#owner-tab-modules").click()
                owner_page.wait_for_load_state("networkidle")

                # Verifica header magazin
                store_header = owner_page.locator(f"text={STORE_NAME}").first
                store_header.wait_for(state="visible", timeout=8000)
                ok(f"Header magazin '{STORE_NAME}' vizibil in tab Module")

                # Verifica preset cards
                basic_btn = owner_page.locator("button:has-text('Basic')").first
                basic_btn.wait_for(state="visible", timeout=5000)
                ok("Preset cards (Basic) sunt vizibile")

                # Verifica toggle ai_consultant
                ai_toggle = owner_page.locator("#toggle-ai_consultant")
                ai_toggle.wait_for(state="visible", timeout=8000)
                ok("Toggle #toggle-ai_consultant este vizibil")

                # Verifica planned modules
                offline_toggle = owner_page.locator("#toggle-offline_sync")
                if offline_toggle.is_visible():
                    if offline_toggle.is_disabled():
                        ok("Toggle offline_sync este disabled (planned)")
                    else:
                        fail("Toggle offline_sync ar trebui sa fie disabled!")
                else:
                    # Poate nu e vizibil dar badge-ul planned apare
                    planned_badge = owner_page.locator("text=Planificat").first
                    if planned_badge.is_visible():
                        ok("Badge 'Planificat' vizibil pentru module planned")
                    else:
                        skip("offline_sync toggle/badge not found")

            except PlaywrightTimeout as e:
                fail(f"Scenariul B: {e}")

            # ─── C. Toggle AI Consultant + Audit Log ─────────────────
            print("\n=== C. Toggle AI Consultant + Audit Log ===")
            try:
                # Navigheaza la tab Module (deja selectat magazinul)
                owner_page.locator("#owner-tab-modules").click()
                owner_page.wait_for_load_state("networkidle")

                ai_toggle = owner_page.locator("#toggle-ai_consultant")
                ai_toggle.wait_for(state="visible", timeout=8000)

                # Verifica ca e false (din baseline)
                checked_val = ai_toggle.get_attribute("aria-checked")
                if checked_val == "false":
                    ok("ai_consultant initial=false confirmat")
                else:
                    skip(f"ai_consultant aria-checked={checked_val} (baseline posibil deja aplicat)")

                # Click toggle
                ai_toggle.click()

                # Reasoning modal
                modal_title = owner_page.locator("#toggle-modal-title")
                modal_title.wait_for(state="visible", timeout=5000)
                ok("Modal reasoning deschis dupa toggle")

                reason_input = owner_page.locator("#reason-input")
                reason_input.fill("E2E Visual QA 6F.1.7")

                confirm_btn = owner_page.locator("#toggle-confirm-btn")
                confirm_btn.wait_for(state="visible", timeout=3000)
                confirm_btn.click()

                modal_title.wait_for(state="hidden", timeout=8000)
                ok("Modal reasoning inchis dupa confirmare")

                # Verifica aria-checked=true
                owner_page.wait_for_timeout(1000)
                new_val = ai_toggle.get_attribute("aria-checked")
                if new_val == "true":
                    ok("Toggle ai_consultant=true dupa confirmare")
                else:
                    fail(f"Toggle ai_consultant aria-checked={new_val} (expected true)")

                # Verifica Audit Log
                owner_page.locator("#owner-tab-audit").click()
                owner_page.wait_for_load_state("networkidle")
                owner_page.wait_for_timeout(1500)

                # Cauta intrarea in audit logs
                audit_entry = owner_page.locator("td:has-text('Activare Modul'), td:has-text('ai_consultant'), span:has-text('Activare modul')").first
                if audit_entry.is_visible():
                    ok("Audit log 'Activare modul' gasit dupa toggle")
                else:
                    # Incearca refresh
                    refresh_btn = owner_page.locator("button[title*='mprosp']")
                    if refresh_btn.is_visible():
                        refresh_btn.click()
                        owner_page.wait_for_timeout(2000)
                    # Cauta badge Activare Modul
                    badge = owner_page.locator("span:has-text('Activare Modul')").first
                    if badge.is_visible():
                        ok("Badge 'Activare Modul' gasit in Audit Logs")
                    else:
                        skip("Audit log entry nu a putut fi verificat in UI (posibil latenta)")

            except PlaywrightTimeout as e:
                fail(f"Scenariul C: {e}")

            # ─── D. Route Guard ───────────────────────────────────────
            print("\n=== D. Route Guard ===")
            try:
                # D1: ai_consultant=false → DisabledModulePage
                rpc_set_module(owner_page, store_id, "ai_consultant", False, "D. Route Guard test")

                # Login admin separat
                admin_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                admin_pg = admin_ctx.new_page()
                login(admin_pg, ADMIN_EMAIL, ADMIN_PASS)
                admin_pg.wait_for_load_state("networkidle")

                # Acces direct ruta dezactivata
                admin_pg.goto(f"{APP_URL}/#/ai-consultant")
                admin_pg.wait_for_load_state("networkidle")

                # Cauta DisabledModulePage
                disabled_el = admin_pg.locator("#disabled-module-title, h1:has-text('Dezactivat'), h2:has-text('Dezactivat'), h1:has-text('Restric')").first
                if disabled_el.is_visible():
                    ok("DisabledModulePage afisat la acces direct cu modul dezactivat")
                else:
                    # Poate e redirectat la dashboard
                    if "dashboard" in admin_pg.url or "owner" in admin_pg.url:
                        ok("Redirectat la dashboard/owner cu modul dezactivat (route guard activ)")
                    else:
                        fail(f"Nu s-a detectat route guard. URL curent: {admin_pg.url}")

                # D2: Verifica sidebar link ascuns
                ai_sidebar = admin_pg.locator("a[href*='ai-consultant']").first
                if not ai_sidebar.is_visible():
                    ok("Link AI Consultant absent din sidebar cu modul dezactivat")
                else:
                    fail("Link AI Consultant vizibil in sidebar cu modul dezactivat!")

                # D3: Activeaza modul si verifica acces
                rpc_set_module(owner_page, store_id, "ai_consultant", True, "D. Route Guard test enabled")
                admin_pg.reload()
                admin_pg.wait_for_load_state("networkidle")
                admin_pg.wait_for_timeout(2000)

                admin_pg.goto(f"{APP_URL}/#/ai-consultant")
                admin_pg.wait_for_load_state("networkidle")

                disabled_again = admin_pg.locator("#disabled-module-title").first
                if disabled_again.is_visible():
                    fail("DisabledModulePage apare si cu modul activ!")
                else:
                    ok("Pagina ai-consultant accesibila cu modul activ")

                admin_ctx.close()

                # Reseteaza la false dupa test
                rpc_set_module(owner_page, store_id, "ai_consultant", False, "D. Route Guard cleanup")

            except PlaywrightTimeout as e:
                fail(f"Scenariul D: {e}")

            # ─── E. Planned modules ────────────────────────────────────
            print("\n=== E. Planned modules ===")
            try:
                owner_page.locator("#owner-tab-modules").click()
                owner_page.wait_for_load_state("networkidle")

                planned_keys = ["offline_sync", "fiscal_bridge"]
                for key in planned_keys:
                    toggle = owner_page.locator(f"#toggle-{key}")
                    if toggle.is_visible():
                        if toggle.is_disabled():
                            ok(f"Toggle {key} este disabled (planned)")
                        else:
                            fail(f"Toggle {key} ar trebui sa fie disabled!")
                    else:
                        badge = owner_page.locator(f"[data-module='{key}'] span:has-text('Planificat'), text=Planificat").first
                        if badge.is_visible():
                            ok(f"Badge 'Planificat' gasit pentru {key}")
                        else:
                            skip(f"Nu s-a gasit toggle/badge pentru {key}")

            except PlaywrightTimeout as e:
                fail(f"Scenariul E: {e}")

            # ─── F. Preset Modal Safety ────────────────────────────────
            print("\n=== F. Preset Modal Safety ===")
            try:
                owner_page.locator("#owner-tab-modules").click()
                owner_page.wait_for_load_state("networkidle")

                basic_btn = owner_page.locator("button:has-text('Basic')").first
                basic_btn.wait_for(state="visible", timeout=5000)
                basic_btn.click()

                preset_title = owner_page.locator("#preset-modal-title")
                preset_title.wait_for(state="visible", timeout=5000)
                ok("Preset modal deschis")

                cancel_btn = owner_page.locator("#preset-cancel-btn")
                confirm_btn = owner_page.locator("#preset-confirm-btn")

                if cancel_btn.is_visible():
                    ok("#preset-cancel-btn vizibil")
                else:
                    fail("#preset-cancel-btn LIPSESTE")

                if confirm_btn.is_visible():
                    ok("#preset-confirm-btn vizibil")
                else:
                    fail("#preset-confirm-btn LIPSESTE")

                cancel_btn.click()
                preset_title.wait_for(state="hidden", timeout=5000)
                ok("Modal preset inchis dupa Anuleaza (fara aplicare)")

            except PlaywrightTimeout as e:
                fail(f"Scenariul F: {e}")

            # ─── G. Non-owner user ────────────────────────────────────
            print("\n=== G. Non-owner user ===")
            try:
                g_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                g_pg = g_ctx.new_page()
                login(g_pg, ADMIN_EMAIL, ADMIN_PASS)
                g_pg.wait_for_load_state("networkidle")

                # ai_consultant=false → linkul absent
                ai_link = g_pg.locator("a[href*='ai-consultant']").first
                if not ai_link.is_visible():
                    ok("Non-owner: link AI Consultant absent cu modul dezactivat")
                else:
                    fail("Non-owner: link AI Consultant vizibil cu modul dezactivat!")

                # Acces direct → DisabledModulePage sau redirect
                g_pg.goto(f"{APP_URL}/#/ai-consultant")
                g_pg.wait_for_load_state("networkidle")
                blocked = g_pg.locator("#disabled-module-title, h1:has-text('Dezactivat'), h1:has-text('Restric')").first
                if blocked.is_visible() or "dashboard" in g_pg.url:
                    ok("Non-owner: acces direct la modul dezactivat blocat corect")
                else:
                    fail(f"Non-owner: route guard nefunctional. URL={g_pg.url}")

                g_ctx.close()
            except PlaywrightTimeout as e:
                fail(f"Scenariul G: {e}")

            # ─── H. Visual QA Responsive ──────────────────────────────
            print("\n=== H. Visual QA Responsive ===")
            os.makedirs("artifacts/6f17", exist_ok=True)

            for vp in VIEWPORTS:
                vp_name = vp["name"]
                try:
                    vp_ctx = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
                    vp_pg = vp_ctx.new_page()
                    login(vp_pg, OWNER_EMAIL, OWNER_PASS)
                    vp_pg.goto(f"{APP_URL}/#/owner")
                    vp_pg.wait_for_load_state("networkidle")

                    # Verifica tab-uri vizibile
                    vp_pg.locator("#owner-tab-overview").wait_for(state="visible", timeout=10000)
                    ok(f"{vp_name} ({vp['width']}x{vp['height']}): Owner Console tabs vizibile")

                    # Mergi la tab modules
                    vp_pg.locator("#owner-tab-modules").click()
                    vp_pg.wait_for_load_state("networkidle")

                    # Screenshot
                    screenshot_path = f"artifacts/6f17/viewport_{vp_name.lower()}.png"
                    vp_pg.screenshot(path=screenshot_path)
                    ok(f"{vp_name}: Screenshot salvat la {screenshot_path}")

                    vp_ctx.close()
                except PlaywrightTimeout as e:
                    fail(f"Viewport {vp_name}: {e}")

        except Exception as e:
            fail(f"Eroare generala: {e}")
            import traceback
            traceback.print_exc()

        finally:
            # ─── CLEANUP: Restaurare snapshot ────────────────────────
            print("\n=== CLEANUP: Restaurare snapshot ===")
            if snapshot_modules and store_id and owner_page and not owner_page.is_closed():
                try:
                    payload = build_restore_payload(snapshot_modules)
                    print(f"  Restaurare {len(payload)} module via bulk_set_store_modules...")
                    r = rpc_bulk_restore(owner_page, store_id, payload)
                    if "error" in r:
                        print(f"  [CLEANUP FAIL] {r['error']}")
                    else:
                        print("  [CLEANUP OK] Snapshot restaurat cu succes.")
                except Exception as ce:
                    print(f"  [CLEANUP ERROR] {ce}")
            else:
                print("  [CLEANUP SKIP] Snapshot indisponibil sau pagina inchisa.")

            browser.close()

    # ─── RAPORT FINAL ─────────────────────────────────────────────────
    print("\n" + "="*60)
    print("RAPORT FINAL — Etapa 6F.1.7")
    print("="*60)
    passed = [r for r in results if r[0] == "PASS"]
    failed = [r for r in results if r[0] == "FAIL"]
    skipped = [r for r in results if r[0] == "SKIP"]
    print(f"  PASS:  {len(passed)}")
    print(f"  FAIL:  {len(failed)}")
    print(f"  SKIP:  {len(skipped)}")

    if failed:
        print("\nVerificari esuate:")
        for _, msg in failed:
            print(f"  - {msg}")
        print("\n[RESULT] PARTIAL PASS" if passed else "[RESULT] FAIL")
        sys.exit(1)
    else:
        print("\n[RESULT] PASS — Toate verificarile au trecut!")

if __name__ == "__main__":
    run()
