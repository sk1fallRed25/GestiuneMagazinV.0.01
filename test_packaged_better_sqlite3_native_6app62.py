import os
import sys
import json
import re
import subprocess

def test_packaged_better_sqlite3_native():
    print("======================================================================")
    print("RUNNING STATIC TEST FOR PACKAGED BETTER-SQLITE3 NATIVE DEPENDENCY (6APP.6.2)")
    print("======================================================================\n")

    package_file = "package.json"
    sqlite_service_file = "electron-sqlite-service.js"

    # 1. Check if files exist
    if not os.path.exists(package_file):
        print(f"FAIL: {package_file} does not exist.")
        sys.exit(1)
    if not os.path.exists(sqlite_service_file):
        print(f"FAIL: {sqlite_service_file} does not exist.")
        sys.exit(1)
    
    print("PASS: Required files exist.")

    # 2. Parse package.json
    try:
        with open(package_file, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
    except Exception as e:
        print(f"FAIL: Could not parse package.json: {e}")
        sys.exit(1)

    dependencies = pkg_data.get("dependencies", {})
    dev_dependencies = pkg_data.get("devDependencies", {})
    build_config = pkg_data.get("build", {})
    build_files = build_config.get("files", [])
    asar_unpack = build_config.get("asarUnpack", [])

    # Verify better-sqlite3 placement
    if "better-sqlite3" not in dependencies:
        print("FAIL: 'better-sqlite3' is not listed in dependencies.")
        sys.exit(1)
    print("PASS: 'better-sqlite3' is listed in dependencies.")

    if "better-sqlite3" in dev_dependencies:
        print("FAIL: 'better-sqlite3' is still listed in devDependencies.")
        sys.exit(1)
    print("PASS: 'better-sqlite3' is NOT in devDependencies.")

    # Verify build.files contains electron-sqlite-service.js
    if "electron-sqlite-service.js" not in build_files:
        print("FAIL: 'electron-sqlite-service.js' is not listed in package.json build.files.")
        sys.exit(1)
    print("PASS: 'electron-sqlite-service.js' is listed in package.json build.files.")

    # Verify asarUnpack configuration
    # Accepts either "**/*.node" or a path containing "better-sqlite3"
    node_unpack = "**/*.node" in asar_unpack
    specific_unpack = any("better-sqlite3" in item for item in asar_unpack)
    if not (node_unpack or specific_unpack):
        print("FAIL: 'asarUnpack' does not configure unpacking for native binaries or 'better-sqlite3'. Current config:", asar_unpack)
        sys.exit(1)
    print(f"PASS: 'asarUnpack' configured correctly: {asar_unpack}")

    # 3. Verify electron-sqlite-service.js imports better-sqlite3 compatibly
    try:
        with open(sqlite_service_file, "r", encoding="utf-8") as f:
            sqlite_content = f.read()
    except Exception as e:
        print(f"FAIL: Could not read {sqlite_service_file}: {e}")
        sys.exit(1)

    # Check for require('better-sqlite3') or import Database from 'better-sqlite3'
    if "better-sqlite3" not in sqlite_content:
        print("FAIL: electron-sqlite-service.js does not reference 'better-sqlite3'.")
        sys.exit(1)

    # Verify it uses createRequire (highly recommended for robust CommonJS loading in ESM main process)
    if "createRequire" not in sqlite_content or "require('better-sqlite3')" not in sqlite_content.replace('"', "'").replace(" ", ""):
        print("WARNING: electron-sqlite-service.js does not seem to use the 'createRequire' pattern for better-sqlite3.")
        # We'll allow it if import is used, but warn or fail based on strictness. Let's make it a PASS since we implemented createRequire.
        # Let's enforce it to make sure the fix is active:
        if "createRequire" not in sqlite_content:
            print("FAIL: electron-sqlite-service.js must use 'createRequire' to load 'better-sqlite3' safely.")
            sys.exit(1)

    print("PASS: electron-sqlite-service.js imports better-sqlite3 using createRequire.")

    # 4. Run npm run build and check if it succeeds
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
    print("ALL STATIC CHECKS FOR BETTER-SQLITE3 NATIVE DEPENDENCY PASSED!")
    print("======================================================================")

if __name__ == "__main__":
    test_packaged_better_sqlite3_native()
