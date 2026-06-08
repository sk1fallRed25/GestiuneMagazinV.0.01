import os
import sys
import json
import re
import subprocess

def test_packaged_electron_sqlite_service():
    print("======================================================================")
    print("RUNNING STATIC TEST FOR PACKAGED ELECTRON SQLITE SERVICE (6APP.6.1)")
    print("======================================================================\n")

    # 1. Verify that electron-sqlite-service.js and electron-updater-service.js exist
    sqlite_service_file = "electron-sqlite-service.js"
    updater_service_file = "electron-updater-service.js"
    preload_file = "electron-preload.js"
    main_file = "electron-main.js"
    package_file = "package.json"

    files_to_check = [sqlite_service_file, updater_service_file, preload_file, main_file, package_file]
    for f in files_to_check:
        if not os.path.exists(f):
            print(f"FAIL: File '{f}' does not exist on filesystem.")
            sys.exit(1)
        print(f"PASS: File '{f}' exists.")

    # 2. Parse package.json
    try:
        with open(package_file, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
    except Exception as e:
        print(f"FAIL: Could not parse package.json: {e}")
        sys.exit(1)

    build_config = pkg_data.get("build", {})
    build_files = build_config.get("files", [])

    print(f"Current package.json build.files: {build_files}")

    required_build_files = [sqlite_service_file, updater_service_file, preload_file]
    for rf in required_build_files:
        if rf not in build_files:
            print(f"FAIL: '{rf}' is not listed in package.json build.files.")
            sys.exit(1)
        print(f"PASS: '{rf}' is listed in package.json build.files.")

    # 3. Verify electron-main.js imports electron-sqlite-service.js
    try:
        with open(main_file, "r", encoding="utf-8") as f:
            main_content = f.read()
    except Exception as e:
        print(f"FAIL: Could not read electron-main.js: {e}")
        sys.exit(1)

    # Check for direct import containing electron-sqlite-service.js
    if "electron-sqlite-service.js" not in main_content:
        print("FAIL: electron-main.js does not contain import to electron-sqlite-service.js")
        sys.exit(1)
    print("PASS: electron-main.js contains import to electron-sqlite-service.js")

    # 4. Check for any imports to files not included in build.files
    # Find all local/relative imports in electron-main.js
    # Example matches: import ... from './file.js'; or import './file.js';
    import_matches = re.findall(r"from\s+['\"](\./.*?)['\"]", main_content)
    # Also find direct imports without from if any
    direct_imports = re.findall(r"import\s+['\"](\./.*?)['\"]", main_content)
    
    all_local_imports = list(set(import_matches + direct_imports))
    print(f"Found local imports in electron-main.js: {all_local_imports}")

    for imp in all_local_imports:
        # Resolve the relative path to file basename
        imported_file = imp.lstrip("./")
        # Check if this imported file is listed in build.files
        if imported_file not in build_files:
            print(f"FAIL: '{imported_file}' is imported in electron-main.js but NOT included in package.json build.files.")
            sys.exit(1)
        print(f"PASS: Imported file '{imported_file}' is included in package.json build.files.")

    # 5. Run npm run build and check if it succeeds
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
    print("ALL STATIC CHECKS PASSED SUCCESSFULLY!")
    print("======================================================================")

if __name__ == "__main__":
    test_packaged_electron_sqlite_service()
