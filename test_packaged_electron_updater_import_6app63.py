import os
import sys
import json
import re
import subprocess

def test_packaged_electron_updater_import():
    print("======================================================================")
    print("RUNNING STATIC TEST FOR PACKAGED ELECTRON UPDATER IMPORT (6APP.6.3)")
    print("======================================================================\n")

    updater_service_file = "electron-updater-service.js"
    package_file = "package.json"

    # 1. Check files exist
    for f in [updater_service_file, package_file]:
        if not os.path.exists(f):
            print(f"FAIL: File '{f}' does not exist.")
            sys.exit(1)
        print(f"PASS: File '{f}' exists.")

    # 2. Read updater service source
    try:
        with open(updater_service_file, "r", encoding="utf-8") as f:
            updater_content = f.read()
    except Exception as e:
        print(f"FAIL: Could not read {updater_service_file}: {e}")
        sys.exit(1)

    # 3. Verify NO ESM named import of autoUpdater from electron-updater
    bad_import_pattern = re.compile(r"""import\s*\{[^}]*autoUpdater[^}]*\}\s*from\s*['"]electron-updater['"]""")
    if bad_import_pattern.search(updater_content):
        print("FAIL: electron-updater-service.js still contains ESM named import:")
        print("  import { autoUpdater } from 'electron-updater'")
        print("  This WILL crash in packaged mode with 'type': 'module'.")
        sys.exit(1)
    print("PASS: No ESM named import of autoUpdater from 'electron-updater' found.")

    # 4. Verify createRequire is used from 'module'
    if "createRequire" not in updater_content:
        print("FAIL: electron-updater-service.js does not use 'createRequire'.")
        sys.exit(1)
    if "from 'module'" not in updater_content and 'from "module"' not in updater_content:
        print("FAIL: electron-updater-service.js does not import createRequire from 'module'.")
        sys.exit(1)
    print("PASS: Uses createRequire from 'module'.")

    # 5. Verify require('electron-updater') is used
    require_pattern = re.compile(r"""require\s*\(\s*['"]electron-updater['"]\s*\)""")
    if not require_pattern.search(updater_content):
        print("FAIL: electron-updater-service.js does not use require('electron-updater').")
        sys.exit(1)
    print("PASS: Uses require('electron-updater') via createRequire bridge.")

    # 6. Verify all updater functions are still present
    required_functions = [
        "initializeUpdater",
        "checkForUpdates",
        "downloadUpdate",
        "quitAndInstall",
    ]
    for fn in required_functions:
        if fn not in updater_content:
            print(f"FAIL: Required function/method '{fn}' not found in updater service.")
            sys.exit(1)
    print("PASS: All required updater functions are present.")

    # 7. Verify all event handlers are present
    required_events = [
        "checking-for-update",
        "update-available",
        "update-not-available",
        "download-progress",
        "update-downloaded",
        "'error'",
    ]
    for evt in required_events:
        if evt not in updater_content:
            print(f"FAIL: Required event handler for '{evt}' not found in updater service.")
            sys.exit(1)
    print("PASS: All required event handlers are present.")

    # 8. Verify IPC handlers are present
    required_ipc = [
        "updater:check-for-updates",
        "updater:download-update",
        "updater:install-update-now",
        "updater:get-update-status",
    ]
    for ipc in required_ipc:
        if ipc not in updater_content:
            print(f"FAIL: Required IPC handler '{ipc}' not found in updater service.")
            sys.exit(1)
    print("PASS: All IPC handlers are present.")

    # 9. Verify defensive fallback exists
    if "updaterAvailable" not in updater_content and "unavailable" not in updater_content:
        print("FAIL: No defensive fallback found for updater load failure.")
        sys.exit(1)
    print("PASS: Defensive fallback for updater load failure is present.")

    # 10. Parse package.json
    try:
        with open(package_file, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
    except Exception as e:
        print(f"FAIL: Could not parse package.json: {e}")
        sys.exit(1)

    # 11. Verify electron-updater in dependencies
    dependencies = pkg_data.get("dependencies", {})
    if "electron-updater" not in dependencies:
        print("FAIL: 'electron-updater' is not listed in package.json dependencies.")
        sys.exit(1)
    print("PASS: 'electron-updater' is listed in package.json dependencies.")

    # 12. Verify electron-updater-service.js in build.files
    build_files = pkg_data.get("build", {}).get("files", [])
    if "electron-updater-service.js" not in build_files:
        print("FAIL: 'electron-updater-service.js' is not in package.json build.files.")
        sys.exit(1)
    print("PASS: 'electron-updater-service.js' is in package.json build.files.")

    # 13. Run npm run build
    print("\nRunning 'npm run build' to verify build succeeds...")
    try:
        result = subprocess.run("npm run build", shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print("PASS: npm run build executed successfully.")
    except subprocess.CalledProcessError as e:
        print("FAIL: npm run build failed.")
        print("--- stdout ---")
        print(e.stdout)
        print("--- stderr ---")
        print(e.stderr)
        sys.exit(1)

    print("\n======================================================================")
    print("ALL STATIC CHECKS FOR ELECTRON UPDATER IMPORT HOTFIX (6APP.6.3) PASSED!")
    print("======================================================================")

if __name__ == "__main__":
    test_packaged_electron_updater_import()
