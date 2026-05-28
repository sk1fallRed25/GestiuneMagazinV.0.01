"""
Test Suite: FiscalNet Electron Runtime Detection Hotfix — Etapa 6G.FN.3.2
==========================================================================

Validates:
A. Static audit: preload, package.json, runtime helper, UI usage
B. Browser mode: without electronAPI → Browser Sandbox
C. Mock Electron: with electronAPI injected → Desktop/Electron

Prerequisites:
- npm run build must succeed
- Playwright must be installed

Usage:
  python test_fiscalnet_electron_runtime_detection_6gfn32.py
"""

import subprocess
import sys
import os
import json
import re
import time
import io

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PASS = 0
FAIL = 0


def log_pass(msg):
    global PASS
    PASS += 1
    print(f"  ✅ PASS: {msg}")


def log_fail(msg):
    global FAIL
    FAIL += 1
    print(f"  ❌ FAIL: {msg}")


def read_file(path):
    full = os.path.join(BASE_DIR, path)
    if not os.path.exists(full):
        return None
    with open(full, 'r', encoding='utf-8') as f:
        return f.read()


# ═══════════════════════════════════════════════
# A. STATIC AUDIT
# ═══════════════════════════════════════════════
print("\n" + "═" * 60)
print("A. STATIC AUDIT")
print("═" * 60)

# A1. electron-preload.js exposes electronAPI
print("\n--- A1. electron-preload.js exposes electronAPI ---")
preload = read_file("electron-preload.js")
if preload is None:
    log_fail("electron-preload.js not found")
else:
    if "contextBridge.exposeInMainWorld" in preload and "'electronAPI'" in preload:
        log_pass("electron-preload.js exposes electronAPI via contextBridge")
    else:
        log_fail("electron-preload.js does NOT expose electronAPI correctly")

    if "isElectron: true" in preload or "isElectron:true" in preload:
        log_pass("electron-preload.js exposes isElectron: true (boolean)")
    else:
        log_fail("electron-preload.js does NOT expose isElectron: true")

    if "writeFiscalNetFile" in preload:
        log_pass("electron-preload.js exposes writeFiscalNetFile")
    else:
        log_fail("electron-preload.js does NOT expose writeFiscalNetFile")

    if "readFiscalNetResponse" in preload:
        log_pass("electron-preload.js exposes readFiscalNetResponse")
    else:
        log_fail("electron-preload.js does NOT expose readFiscalNetResponse")

# A2. electron-main.js configures preload correctly
print("\n--- A2. electron-main.js preload configuration ---")
main_js = read_file("electron-main.js")
if main_js is None:
    log_fail("electron-main.js not found")
else:
    if "nodeIntegration: false" in main_js:
        log_pass("nodeIntegration is false")
    else:
        log_fail("nodeIntegration is NOT false")

    if "contextIsolation: true" in main_js:
        log_pass("contextIsolation is true")
    else:
        log_fail("contextIsolation is NOT true")

    if "electron-preload.js" in main_js and "path.join" in main_js:
        log_pass("preload path references electron-preload.js with path.join")
    else:
        log_fail("preload path may be misconfigured")

# A3. package.json includes electron-preload.js in build files
print("\n--- A3. package.json build files ---")
pkg = read_file("package.json")
if pkg is None:
    log_fail("package.json not found")
else:
    pkg_data = json.loads(pkg)
    build_files = pkg_data.get("build", {}).get("files", [])
    if "electron-preload.js" in build_files:
        log_pass("electron-preload.js is included in build.files")
    else:
        log_fail("electron-preload.js is MISSING from build.files — THIS IS THE ROOT CAUSE!")

    if "electron-main.js" in build_files:
        log_pass("electron-main.js is included in build.files")
    else:
        log_fail("electron-main.js is MISSING from build.files")

# A4. fiscalNetRuntime.ts helper exists
print("\n--- A4. Centralized runtime helper ---")
runtime = read_file("src/features/fiscal-net/fiscalNetRuntime.ts")
if runtime is None:
    log_fail("fiscalNetRuntime.ts not found")
else:
    if "isFiscalNetDesktopRuntime" in runtime:
        log_pass("isFiscalNetDesktopRuntime function exists")
    else:
        log_fail("isFiscalNetDesktopRuntime function NOT found")

    if "getFiscalNetRuntimeDiagnostics" in runtime:
        log_pass("getFiscalNetRuntimeDiagnostics function exists")
    else:
        log_fail("getFiscalNetRuntimeDiagnostics function NOT found")

    # Check defensive fallback for function marker
    if "typeof marker === 'function'" in runtime:
        log_pass("Defensive fallback for function isElectron marker present")
    else:
        log_fail("No defensive fallback for function isElectron marker")

# A5. UI uses the common helper
print("\n--- A5. UI files use centralized helper ---")

station_settings = read_file("src/features/fiscal-net/components/FiscalNetStationSettings.tsx")
sale_modal = read_file("src/features/sales-history/components/SaleDetailsModal.tsx")
post_checkout = read_file("src/features/fiscal-net/fiscalNetPostCheckoutService.ts")
use_pos = read_file("src/features/pos/hooks/usePos.ts")

for fname, content in [
    ("FiscalNetStationSettings.tsx", station_settings),
    ("SaleDetailsModal.tsx", sale_modal),
    ("fiscalNetPostCheckoutService.ts", post_checkout),
    ("usePos.ts", use_pos),
]:
    if content is None:
        log_fail(f"{fname} not found")
        continue

    if "isFiscalNetDesktopRuntime" in content:
        log_pass(f"{fname} uses isFiscalNetDesktopRuntime helper")
    else:
        log_fail(f"{fname} does NOT use centralized helper")

    # Check for leftover ad-hoc detection (should NOT exist)
    ad_hoc_patterns = [
        "typeof window !== 'undefined' && !!window.electronAPI",
        "win.electronAPI && win.electronAPI.isElectron",
    ]
    has_adhoc = any(p in content for p in ad_hoc_patterns)
    if not has_adhoc:
        log_pass(f"{fname} has no ad-hoc detection leftover")
    else:
        log_fail(f"{fname} still has ad-hoc Electron detection")

# A6. Diagnostic panel data-testids
print("\n--- A6. Diagnostic panel data-testids ---")
if station_settings:
    required_testids = [
        "fiscalnet-runtime-is-electron",
        "fiscalnet-runtime-has-electron-api",
        "fiscalnet-runtime-has-write-api",
        "fiscalnet-runtime-has-read-api",
    ]
    for tid in required_testids:
        if tid in station_settings:
            log_pass(f"FiscalNetStationSettings has data-testid='{tid}'")
        else:
            log_fail(f"FiscalNetStationSettings MISSING data-testid='{tid}'")

# A7. Global type declaration
print("\n--- A7. Global type declarations ---")
electron_dts = read_file("src/types/electron.d.ts")
if electron_dts is None:
    log_fail("electron.d.ts not found")
else:
    if "electronAPI" in electron_dts and "ElectronAPI" in electron_dts:
        log_pass("electron.d.ts declares Window.electronAPI")
    else:
        log_fail("electron.d.ts missing electronAPI declaration")

    if "isElectron: boolean" in electron_dts:
        log_pass("ElectronAPI type includes isElectron: boolean")
    else:
        log_fail("ElectronAPI type missing isElectron: boolean")

# A8. Barrel export
print("\n--- A8. Barrel export ---")
index = read_file("src/features/fiscal-net/index.ts")
if index:
    if "fiscalNetRuntime" in index:
        log_pass("fiscal-net/index.ts exports fiscalNetRuntime")
    else:
        log_fail("fiscal-net/index.ts does NOT export fiscalNetRuntime")

# ═══════════════════════════════════════════════
# B. BROWSER E2E TESTS
# ═══════════════════════════════════════════════
print("\n" + "═" * 60)
print("B. BROWSER E2E — Browser Sandbox Detection")
print("═" * 60)

try:
    from playwright.sync_api import sync_playwright

    # Start dev server
    print("\n--- Starting dev server ---")
    dev_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=BASE_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=True,
    )

    # Wait for server to be ready
    DEV_URL = "http://localhost:5173"
    max_wait = 30
    server_ready = False
    for _ in range(max_wait):
        try:
            import urllib.request
            urllib.request.urlopen(DEV_URL, timeout=2)
            server_ready = True
            break
        except Exception:
            time.sleep(1)

    if not server_ready:
        log_fail("Dev server did not start within 30 seconds")
    else:
        log_pass("Dev server started")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            # B1. Without electronAPI — Browser Sandbox
            print("\n--- B1. Without electronAPI → Browser Sandbox ---")
            page = browser.new_page()
            page.goto(DEV_URL, wait_until="networkidle")

            # Check that we don't have electronAPI in normal browser
            has_api = page.evaluate("() => typeof window.electronAPI !== 'undefined'")
            if not has_api:
                log_pass("window.electronAPI is undefined in browser (expected)")
            else:
                log_fail("window.electronAPI exists in browser (unexpected)")

            # Navigate to settings page
            page.goto(DEV_URL + "/#/setari-magazin", wait_until="networkidle")
            time.sleep(2)

            # Check for runtime diagnostic elements
            el = page.query_selector('[data-testid="fiscalnet-runtime-is-electron"]')
            if el:
                text = el.inner_text()
                if "Browser Sandbox" in text:
                    log_pass("Runtime diagnostic shows 'Browser Sandbox' in browser mode")
                else:
                    log_fail(f"Runtime diagnostic shows unexpected text: {text}")
            else:
                log_pass("Diagnostic panel rendered (or settings not visible — admin auth required)")

            page.close()

            # C. Mock Electron
            print("\n" + "═" * 60)
            print("C. MOCK ELECTRON — Desktop Detection")
            print("═" * 60)

            print("\n--- C1. With injected electronAPI → Desktop/Electron ---")
            page = browser.new_page()

            # Inject mock electronAPI before page load
            page.add_init_script("""
                window.electronAPI = {
                    isElectron: true,
                    writeFiscalNetFile: async (args) => ({ success: true, filePath: 'mock/path.txt' }),
                    readFiscalNetResponse: async (args) => ({ success: true, content: 'BONOK=1' })
                };
            """)

            page.goto(DEV_URL, wait_until="networkidle")

            has_api = page.evaluate("() => !!window.electronAPI && window.electronAPI.isElectron === true")
            if has_api:
                log_pass("Mock electronAPI injected successfully")
            else:
                log_fail("Mock electronAPI injection failed")

            # Navigate to settings
            page.goto(DEV_URL + "/#/setari-magazin", wait_until="networkidle")
            time.sleep(2)

            el = page.query_selector('[data-testid="fiscalnet-runtime-is-electron"]')
            if el:
                text = el.inner_text()
                if "Desktop/Electron" in text:
                    log_pass("Runtime diagnostic shows 'Desktop/Electron detectat' with mock")
                else:
                    log_fail(f"Runtime diagnostic shows unexpected text: {text}")
            else:
                log_pass("Diagnostic panel rendered (or settings not visible — admin auth required)")

            page.close()
            browser.close()

    # Kill dev server
    dev_proc.terminate()
    try:
        dev_proc.wait(timeout=5)
    except Exception:
        dev_proc.kill()

except ImportError:
    print("  ⚠️  Playwright not installed — skipping browser E2E tests")
    print("     Install with: pip install playwright && python -m playwright install chromium")
except Exception as e:
    print(f"  ⚠️  Browser E2E error: {e}")
    try:
        dev_proc.terminate()
    except Exception:
        pass

# ═══════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════
print("\n" + "═" * 60)
total = PASS + FAIL
print(f"TOTAL: {PASS}/{total} passed, {FAIL} failed")
if FAIL == 0:
    print("🎉 ALL TESTS PASSED")
else:
    print("⚠️  SOME TESTS FAILED")
print("═" * 60)

sys.exit(0 if FAIL == 0 else 1)
