import sys
import os
import json

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_release_smoke_static_tests():
    safe_print("\n=== RUNNING STATIC VERIFICATION FOR AUTO-UPDATE RELEASE READYNESS (6APP.2.1) ===")
    
    # 1. Verify package.json configurations
    safe_print("\n--- Verifying package.json static configurations ---")
    try:
        pkg_path = "package.json"
        assert os.path.exists(pkg_path), "package.json is missing!"
        
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
            
        # Verify win targets
        win_targets = pkg.get("build", {}).get("win", {}).get("target", [])
        assert "nsis" in win_targets, "NSIS target is missing from package.json build configurations!"
        assert "portable" in win_targets, "Portable target is missing from package.json build configurations!"
        
        # Verify appId and productName
        assert pkg.get("build", {}).get("appId") == "com.gestiunemagazin.app", "appId must be 'com.gestiunemagazin.app'"
        assert pkg.get("build", {}).get("productName") == "Sistem Gestiune Magazin", "productName must be 'Sistem Gestiune Magazin'"
        
        # Verify publish configurations
        publish_config = pkg.get("build", {}).get("publish", {})
        assert publish_config.get("provider") == "github", "Publish provider must be 'github'"
        assert publish_config.get("owner") == "sk1fallRed25", "Publish owner must be 'sk1fallRed25'"
        assert publish_config.get("repo") == "GestiuneMagazinV.0.01", "Publish repo must be 'GestiuneMagazinV.0.01'"
        
        # Verify build files list contains service file (CRITICAL HARDENING FIX)
        build_files = pkg.get("build", {}).get("files", [])
        assert "electron-updater-service.js" in build_files, "electron-updater-service.js must be included in package.json build.files list!"
        
        # Verify dependency list
        deps = pkg.get("dependencies", {})
        assert "electron-updater" in deps, "electron-updater must be present in package.json dependencies!"
        
        safe_print("[PASS] package.json configurations are correct.")
    except Exception as e:
        safe_print(f"[FAIL] package.json verification failed: {e}")
        sys.exit(1)
        
    # 2. Verify files exist in filesystem
    safe_print("\n--- Verifying key updater source files existence ---")
    try:
        assert os.path.exists("electron-updater-service.js"), "electron-updater-service.js does not exist in the root!"
        assert os.path.exists("src/features/app-update/AppUpdatePanel.tsx"), "AppUpdatePanel.tsx is missing!"
        assert os.path.exists("docs/desktop_auto_update_real_release_smoke_test_6app21.md"), "Smoke test manual guide is missing!"
        
        safe_print("[PASS] All required updater files exist.")
    except Exception as e:
        safe_print(f"[FAIL] Files existence check failed: {e}")
        sys.exit(1)

    # 3. Verify AppUpdatePanel has installer distinction note
    safe_print("\n--- Verifying AppUpdatePanel installer distinction note ---")
    try:
        panel_path = "src/features/app-update/AppUpdatePanel.tsx"
        with open(panel_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        assert "Auto-update se aplică doar pentru versiunea instalată prin installer NSIS" in content, \
            "AppUpdatePanel.tsx is missing the NSIS/portable distinction warning note!"
            
        safe_print("[PASS] AppUpdatePanel warning note is present.")
    except Exception as e:
        safe_print(f"[FAIL] AppUpdatePanel text check failed: {e}")
        sys.exit(1)

    # 4. Verify Smoke Test Guide contains critical procedural criteria
    safe_print("\n--- Verifying Smoke Test Guide criteria ---")
    try:
        guide_path = "docs/desktop_auto_update_real_release_smoke_test_6app21.md"
        with open(guide_path, "r", encoding="utf-8") as f:
            guide = f.read()
            
        criteria = [
            "Version A",
            "Version B",
            "latest.yml",
            "Sistem Gestiune Magazin Setup",
            "GitHub Releases",
            "pos_cart",
            "FiscalNet",
            "offline"
        ]
        
        for item in criteria:
            assert item.lower() in guide.lower(), f"Smoke test guide is missing references to '{item}'!"
            
        safe_print("[PASS] Smoke test guide covers all E2E verification requirements.")
    except Exception as e:
        safe_print(f"[FAIL] Smoke test guide check failed: {e}")
        sys.exit(1)
        
    safe_print("\n=== [SUCCESS] ALL STATIC VERIFICATION CHECKS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    run_release_smoke_static_tests()
