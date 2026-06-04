# Auto-Update Real Release Smoke Test Preparation - Stage 6APP.2.1

This document summarizes the audit results, verification tests, and operational risk assessment for testing the Electron auto-update system E2E in a live customer environment.

---

## 1. Audit Verification Results
- **Auto-Update Provider:** GitHub Releases (configured under `publish` in `package.json`).
- **Main Build Target:** NSIS installer (`nsis`) for atomic updates and user directory write controls.
- **Secondary Target:** Portable executable (`portable`) kept for dev testing.
- **Preload IPC Channel Guards:** Fully verified via mock test scripts.
- **POS Safety Cart Guards:** Confirmed blocking when `localStorage` contains `pos_cart` items.

### Hardening Fix Completed
During the publish audit, we discovered that `electron-updater-service.js` was omitted from the `build.files` list in `package.json`. If left unpackaged, calling the updater inside production would throw a `Module Not Found` fatal startup crash. We successfully updated `package.json` to include `electron-updater-service.js` in the packaging checklist.

---

## 2. Publish Artifact Checklist
To carry out a live update from Version A (e.g. `1.0.0`) to Version B (e.g. `1.0.1`), the following artifacts MUST be built and uploaded to the stable GitHub release tag (`v1.0.1`):
1. **`Sistem Gestiune Magazin Setup 1.0.1.exe`**: The actual installer binary.
2. **`latest.yml`**: Contains version metadata and SHA512 check hashes needed by `electron-updater` to discover and validate the update package.
3. **`Sistem Gestiune Magazin Setup 1.0.1.exe.blockmap`**: Enables binary differential delta downloads, reducing bandwidth consumption.

---

## 3. Real E2E Test Execution Protocol (Manual steps)
A real live update smoke test cannot be fully automated because it requires interacting with operating system level prompts, restarting the desktop application instance, and simulating physical network adapter disconnects.

A comprehensive verification requires the following manual steps:
1. Compile, install, and run **Version 1.0.0** (NSIS installer).
2. Save dummy details under **Setări FiscalNet** to test configurations persistence.
3. Bump version in `package.json` to `1.0.1`, build, and draft a public release under the tag `v1.0.1` on GitHub.
4. Attach `latest.yml`, the `.exe` installer, and the `.blockmap` file to the release.
5. In the running Version 1.0.0 application, check for updates, click download, and verify download completion.
6. Test safety blocking by populating the POS checkout cart.
7. Empty the cart and confirm the installation. Check that the application restarts cleanly as Version 1.0.1 and retains the FiscalNet folders.

---

## 4. Key Deployment Risks & Mitigation

| Identified Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Missing Code Signing** | Windows SmartScreen warnings block execution or show "Unknown Publisher". | Purchase a Sectigo or DigiCert EV Code Signing Certificate to sign the NSIS `.exe` installer before building. |
| **Antivirus False Positives** | Local security software quarantines or blocks the silent updater download. | Whitelist the executable certificate or report false positives to major antivirus databases. |
| **Interrupted Downloads** | Network disconnection during download leaves corrupted files in `Temp`. | `electron-updater` performs checksum validation (`latest.yml` hash match) and retries on failure. |
| **User Access Rights (UAC)** | POS Casier user has standard privileges and cannot write to `Program Files`. | Configure NSIS to install per-user (`allowToChangeInstallationDirectory: true`) so it installs in the user's `AppData\Local` workspace, requiring no Admin credentials. |

---

## 5. Next Recommended Step
Proceed with **`6APP.3 Offline Sales Queue Blueprint`** to design the transactional queuing system for offline checkouts, or execute the physical hardware manual smoke test following [desktop_auto_update_real_release_smoke_test_6app21.md](file:///c:/Users/stefan/WebstormProjects/GestiuneMagazinV.0.01/docs/desktop_auto_update_real_release_smoke_test_6app21.md).
