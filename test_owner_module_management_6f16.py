# -*- coding: utf-8 -*-
import os
import sys
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
"""
E2E Test - Owner Console Module Management UI
Etapa 6F.1.6 / 6F.1.6.1 (Hardened)

Securitate:
- Scrierile se fac EXCLUSIV prin RPC (set_store_module_access, bulk_set_store_modules).
- Nicio scriere directă DML pe store_module_access sau platform_modules.
- Snapshot complet înainte de test; restaurare în finally indiferent de PASS/FAIL.
- Preset-ul NU se aplică live pe Magazin Principal (risc operațional). 
  Se testează doar UI-ul modal: apare, poate fi anulat.
"""

from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:5175"

# ─────────────────────────────────────────────────────────────────
# Baseline operațional sigur pentru Magazin Principal
# Folosit în cleanup final dacă snapshot-ul nu a putut fi capturat.
# ─────────────────────────────────────────────────────────────────
OPERATIONAL_BASELINE = [
    {"module_key": "dashboard",          "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "products",           "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "pos",                "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "sales_history",      "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "quick_add",          "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "reception",          "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "transfer",           "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "loss_reporting",     "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "waste_audit",        "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "commercial_reports", "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "store_settings",     "enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "expiration_tracking","enabled": True,  "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "ai_consultant",      "enabled": False, "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "advanced_returns",   "enabled": False, "reason": "Restaurare baseline post E2E 6F.1.6"},
    {"module_key": "vat_reports",        "enabled": False, "reason": "Restaurare baseline post E2E 6F.1.6"},
]


def build_snapshot_payload(snapshot_modules, reason="Restaurare snapshot E2E 6F.1.6"):
    """
    Construiește payload pentru bulk_set_store_modules din snapshot-ul capturat.
    Include doar modulele cu explicit_enabled != null (nu planned/disabled).
    """
    payload = []
    for m in snapshot_modules:
        # Exclude module planned/disabled - RPC-ul le blochează oricum
        if m.get("status") in ("planned", "disabled"):
            continue
        # Exclude module owner_only
        if m.get("owner_only"):
            continue
        # Folosim explicit_enabled dacă există, altfel effective_enabled
        explicit = m.get("explicit_enabled")
        effective = m.get("effective_enabled", False)
        enabled = explicit if explicit is not None else effective
        payload.append({
            "module_key": m["module_key"],
            "enabled": bool(enabled),
            "reason": reason
        })
    return payload


def run_test():
    snapshot_modules = None
    store_id = None
    page = None
    browser = None

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(
            f"[BROWSER] {msg.type}: {msg.text.encode('ascii', 'replace').decode('ascii')}"
        ))

        try:
            # ────────────────────────────────────────────────────
            # 1. LOGIN ca platform_owner
            # ────────────────────────────────────────────────────
            print("1. Login ca admin@owner.com ...")
            page.goto(f"{APP_URL}/#/login")
            page.wait_for_load_state("networkidle")

            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@owner.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()

            # Asteapta redirect post-login - verificam ca pagina /owner s-a incarcat
            page.wait_for_url(f"{APP_URL}/**", timeout=15000)
            page.goto(f"{APP_URL}/#/owner")
            page.wait_for_load_state("networkidle")
            # Verificam ca tabul Stores din Owner Console este vizibil
            page.locator("#owner-tab-stores").wait_for(state="visible", timeout=15000)
            print("[PASS] Autentificat si navigat la Owner Console.")

            # ────────────────────────────────────────────────────
            # 2. CAPTURĂ SNAPSHOT COMPLET via RPC (pre-test)
            #    Folosit în finally pentru restaurare exactă.
            # ────────────────────────────────────────────────────
            print("\n--- 2. Captură snapshot module Magazin Principal ---")
            snapshot_res = page.evaluate("""async () => {
                const supabase = window.supabase;
                const { data: stores, error: stErr } = await supabase
                    .from('stores').select('id, name').eq('name', 'Magazin Principal');
                if (stErr || !stores || stores.length === 0)
                    return { error: 'Magazin Principal not found: ' + (stErr?.message || '') };

                const store = stores[0];
                const { data: modules, error: modErr } = await supabase
                    .rpc('get_store_module_access', { p_store_id: store.id });
                if (modErr)
                    return { error: 'get_store_module_access failed: ' + modErr.message };

                return { storeId: store.id, modules };
            }""")

            if "error" in snapshot_res:
                raise Exception(f"Snapshot capturat eșuat: {snapshot_res['error']}")

            store_id = snapshot_res["storeId"]
            snapshot_modules = snapshot_res["modules"]
            print(f"[PASS] Snapshot capturat: {len(snapshot_modules)} module pentru store_id={store_id}")

            # ────────────────────────────────────────────────────
            # 3. SETUP BASELINE PRE-TEST via RPC
            #    Asigurăm că ai_consultant=false înainte de test.
            # ────────────────────────────────────────────────────
            print("\n--- 3. Setup baseline pre-test (ai_consultant=false) ---")
            setup_res = page.evaluate("""async (storeId) => {
                const supabase = window.supabase;
                const { error } = await supabase.rpc('set_store_module_access', {
                    p_store_id: storeId,
                    p_module_key: 'ai_consultant',
                    p_enabled: false,
                    p_reason: 'Baseline E2E pre-test 6F.1.6'
                });
                if (error) return { error: error.message };
                return { success: true };
            }""", store_id)

            if "error" in setup_res:
                print(f"[WARN] Setup pre-test: {setup_res['error']} (continuăm)")
            else:
                print("[PASS] ai_consultant setat pe false pre-test.")

            page.reload()
            page.wait_for_load_state("networkidle")

            # ────────────────────────────────────────────────────
            # 4. SELECTARE MAGAZIN ÎN CONSOLE
            # ────────────────────────────────────────────────────
            print("\n--- 4. Selectare Magazin Principal în StoresTable ---")
            page.locator("#owner-tab-stores").click()
            page.wait_for_timeout(500)

            store_row = page.locator("tr", has=page.locator("text=Magazin Principal")).first
            store_row.wait_for(state="visible", timeout=5000)
            store_row.click()
            print("[PASS] Magazin Principal selectat.")

            # ────────────────────────────────────────────────────
            # 5. TAB MODULE ȘI VERIFICARE PANEL
            # ────────────────────────────────────────────────────
            print("\n--- 5. Tab 'Module Magazin' ---")
            module_tab = page.locator("#owner-tab-modules")
            module_tab.wait_for(state="visible", timeout=5000)
            module_tab.click()
            page.wait_for_timeout(1000)

            panel_header = page.locator("h3:has-text('Magazin Principal')")
            panel_header.wait_for(state="visible", timeout=5000)
            print("[PASS] OwnerStoreModulesPanel încărcat cu numele magazinului.")

            presets_section = page.locator("text=Configurare Rapid\u0103 Pachet Comercial")
            presets_section.wait_for(state="visible", timeout=5000)
            print("[PASS] Secțiunea Presets este vizibilă.")

            # ────────────────────────────────────────────────────
            # 6. TOGGLE INDIVIDUAL: ai_consultant (cu reason)
            # ────────────────────────────────────────────────────
            print("\n--- 6. Toggle individual 'ai_consultant' ---")
            toggle_btn = page.locator("#toggle-ai_consultant")
            toggle_btn.wait_for(state="visible", timeout=5000)

            is_checked = toggle_btn.get_attribute("aria-checked") == "true"
            assert not is_checked, "ai_consultant ar trebui să fie dezactivat înainte de test!"

            toggle_btn.click()

            modal_title = page.locator("#toggle-modal-title")
            modal_title.wait_for(state="visible", timeout=5000)
            print("[PASS] Modal Reasoning apărut.")

            reason_input = page.locator("#reason-input")
            reason_input.wait_for(state="visible", timeout=5000)
            reason_input.fill("Activare modul din test E2E 6F.1.6")

            confirm_toggle_btn = page.locator("#toggle-confirm-btn")
            confirm_toggle_btn.click()
            modal_title.wait_for(state="detached", timeout=10000)
            print("[PASS] Modal salvat și închis.")

            page.wait_for_function("""() => {
                const el = document.getElementById('toggle-ai_consultant');
                return el && el.getAttribute('aria-checked') === 'true';
            }""", timeout=10000)
            print("[PASS] Toggle UI actualizat la aria-checked=true.")

            # ────────────────────────────────────────────────────
            # 7. VERIFICARE AUDIT LOG
            # ────────────────────────────────────────────────────
            print("\n--- 7. Verificare Audit Logs ---")
            audit_tab = page.locator("#owner-tab-audit")
            audit_tab.click()
            page.wait_for_timeout(1000)

            audit_table = page.locator("table").first
            audit_table.wait_for(state="visible", timeout=5000)

            audit_row = page.locator("tr", has=page.locator("text=Activare modul")).first
            audit_row.wait_for(state="visible", timeout=10000)

            assert "Magazin Principal" in audit_row.text_content(), \
                "Audit log nu afișează magazinul corect!"
            print("[PASS] Audit log verificat: 'Activare modul' pentru Magazin Principal.")

            # ────────────────────────────────────────────────────
            # 8. TEST PRESET MODAL (UI ONLY - FĂRĂ APLICARE LIVE)
            #    Nu aplicăm preset pe Magazin Principal.
            #    Testăm doar: modalul apare, butonul Anulează funcționează.
            # ────────────────────────────────────────────────────
            print("\n--- 8. Test Preset Modal (UI only - fără aplicare live pe producție) ---")
            module_tab.click()
            page.wait_for_timeout(500)

            preset_btn = page.locator("button:has-text('BASIC')").first
            preset_btn.wait_for(state="visible", timeout=5000)
            preset_btn.click()

            preset_modal = page.locator("#preset-modal-title")
            preset_modal.wait_for(state="visible", timeout=5000)
            print("[PASS] Preset Confirmation Modal apărut.")

            # Verificăm că butonul Anulează există și are ID corect
            cancel_preset_btn = page.locator("#preset-cancel-btn")
            cancel_preset_btn.wait_for(state="visible", timeout=3000)

            # Verificăm că butonul Aplică există și are ID corect
            confirm_preset_visible = page.locator("#preset-confirm-btn")
            confirm_preset_visible.wait_for(state="visible", timeout=3000)
            print("[PASS] Preset modal are butoanele Anulează (#preset-cancel-btn) și Aplică (#preset-confirm-btn).")

            # Anulăm fără a aplica preset (protejăm Magazin Principal)
            cancel_preset_btn.click()
            preset_modal.wait_for(state="detached", timeout=5000)
            print("[PASS] Preset modal anulat. Magazin Principal NEMODIFICAT de preset.")
            print("[INFO] Preset test marcat: NOT RUN LIVE (risc operațional evitat).")

            # ────────────────────────────────────────────────────
            # 9. TEST MODUL PLANNED (offline_sync) - toggle blocat
            # ────────────────────────────────────────────────────
            print("\n--- 9. Verificare modul planned (offline_sync) toggle blocat ---")
            offline_toggle = page.locator("#toggle-offline_sync")
            if offline_toggle.count() > 0:
                is_disabled = offline_toggle.get_attribute("disabled") is not None
                assert is_disabled, "Toggle-ul offline_sync ar trebui să fie disabled (planned)!"
                print("[PASS] offline_sync toggle este disabled (planned/blocked) - corect.")
            else:
                print("[INFO] offline_sync nu este vizibil în UI (expected pentru modul planned).")

            print("\n[SUCCESS] Toate verificările E2E au trecut.")

        except Exception as e:
            print(f"\n[FAIL] Test eșuat la: {str(e)}")
            raise

        finally:
            # ────────────────────────────────────────────────────
            # CLEANUP ROBUST: Restaurare exactă snapshot sau baseline
            # Rulează INDIFERENT de PASS/FAIL.
            # ────────────────────────────────────────────────────
            print("\n--- CLEANUP: Restaurare stare module ---")

            if page and store_id:
                try:
                    if snapshot_modules:
                        # Construim payload din snapshot capturat
                        payload = build_snapshot_payload(snapshot_modules)
                        print(f"[CLEANUP] Restaurare snapshot ({len(payload)} module) via bulk_set_store_modules...")
                        cleanup_res = page.evaluate("""async ([storeId, modules]) => {
                            const supabase = window.supabase;
                            const { data, error } = await supabase.rpc('bulk_set_store_modules', {
                                p_store_id: storeId,
                                p_modules: modules
                            });
                            if (error) return { error: error.message };
                            return { success: true, data };
                        }""", [store_id, payload])

                        if "error" in cleanup_res:
                            print(f"[WARN] Cleanup snapshot eșuat: {cleanup_res['error']}")
                            print("[CLEANUP] Fallback la baseline operațional hardcodat...")
                            _restore_operational_baseline(page, store_id)
                        else:
                            print("[CLEANUP PASS] Snapshot restaurat cu succes.")
                    else:
                        print("[CLEANUP] Niciun snapshot disponibil. Aplicăm baseline operațional hardcodat...")
                        _restore_operational_baseline(page, store_id)

                except Exception as cleanup_err:
                    print(f"[CLEANUP WARN] Cleanup a eșuat complet: {cleanup_err}")
                    print("[CLEANUP WARN] Magazin Principal poate fi într-o stare inconsistentă. Verificați manual!")
            else:
                print("[CLEANUP WARN] page sau store_id indisponibil. Cleanup omis.")

            if browser:
                browser.close()


def _restore_operational_baseline(page, store_id):
    """
    Restaurare fallback: aplică baseline operațional hardcodat via bulk_set_store_modules.
    Folosit doar dacă snapshot-ul capturat nu poate fi restaurat.
    """
    try:
        result = page.evaluate("""async ([storeId, modules]) => {
            const supabase = window.supabase;
            const { data, error } = await supabase.rpc('bulk_set_store_modules', {
                p_store_id: storeId,
                p_modules: modules
            });
            if (error) return { error: error.message };
            return { success: true };
        }""", [store_id, OPERATIONAL_BASELINE])

        if "error" in result:
            print(f"[CLEANUP WARN] Baseline fallback eșuat: {result['error']}")
        else:
            print("[CLEANUP PASS] Baseline operațional restaurat via fallback.")
    except Exception as e:
        print(f"[CLEANUP ERROR] Baseline fallback excepție: {e}")


if __name__ == "__main__":
    try:
        run_test()
        print("\n[SUCCESS] E2E Owner Module Management UI Test (Etapa 6F.1.6 / 6F.1.6.1) Passed!")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FAIL] Test eșuat: {str(e)}")
        sys.exit(1)
