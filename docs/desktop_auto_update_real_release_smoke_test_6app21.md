# Manual Smoke Test Guide: Real Auto-Update Verification (Stage 6APP.2.1)

This guide provides step-by-step instructions to verify the auto-updater system on a real production/client machine or POS device. It ensures that the transition between Version A (initial release) and Version B (updated release) is smooth, secure, preserves local settings, and behaves correctly under network failure or active checkout conditions.

---

## Prerequisites
- **Target OS:** Windows (client/POS machine).
- **Environment:** Node.js, npm, git.
- **Provider:** GitHub Releases (configured under `publish` in `package.json`).
- **Permissions:** Admin privileges on the test machine (required by the NSIS installer if system-wide, or user-level directory access).

---

## Step A: Prepare & Install Version A (Initial Release)

1. Open `package.json` and set the version to `1.0.0`.
   ```json
   "version": "1.0.0"
   ```
2. Build the application and generate the installer packages:
   ```bash
   npm install
   npm run build
   npm run electron:build
   ```
3. Locate the generated artifacts in the `release/` folder:
   - `Sistem Gestiune Magazin Setup 1.0.0.exe` (NSIS installer)
   - `Sistem Gestiune Magazin 1.0.0.exe` (Portable executable)
   - `latest.yml`
   - `Sistem Gestiune Magazin Setup 1.0.0.exe.blockmap`
4. Run `Sistem Gestiune Magazin Setup 1.0.0.exe` on the test machine. Follow the installation steps and complete the setup.
5. Launch the installed application.
6. Log in and go to **Store Settings** (`/setari-magazin`):
   - Verify that **Versiune Aplicație** displays `1.0.0`.
   - Verify that **Mediu Runtime** displays `Electron Desktop`.
   - Verify that the **Centru Actualizări** panel is visible and displays `Nu s-a verificat recent.`.
   - Configure a dummy folder pathway in the **Setări FiscalNet** card (e.g., `C:\FiscalNet\Bonuri`) and save to verify persistence later.

---

## Step B: Prepare Version B (Updated Release)

1. Open `package.json` and increment the version to `1.0.1`.
   ```json
   "version": "1.0.1"
   ```
2. Open `src/features/app-update/AppUpdatePanel.tsx` and verify that the NSIS warning is present:
   `Auto-update se aplică doar pentru versiunea instalată prin installer NSIS. Versiunea portable este doar pentru testare.`
3. Compile and build the updated files:
   ```bash
   npm run build
   npm run electron:build
   ```
4. Verify the new files in the `release/` folder:
   - `Sistem Gestiune Magazin Setup 1.0.1.exe`
   - `latest.yml` (now pointing to version `1.0.1`)
   - `Sistem Gestiune Magazin Setup 1.0.1.exe.blockmap`

---

## Step C: Publish the Release (GitHub Releases Provider)

1. Log in to your GitHub account and navigate to the repository: `sk1fallRed25/GestiuneMagazinV.0.01`.
2. Go to **Releases** and click **Draft a new release**.
3. Create a release tag matching the version: `v1.0.1`. Title the release: `Release v1.0.1 (Auto-Update Smoke Test)`.
4. Upload the following files from the `release/` directory to the release assets box:
   - `Sistem Gestiune Magazin Setup 1.0.1.exe`
   - `latest.yml`
   - `Sistem Gestiune Magazin Setup 1.0.1.exe.blockmap`
5. **IMPORTANT:** Publish the release as **Latest/Stable** (ensure it is marked as a public release so the updater service can retrieve the metadata without requiring private repository tokens).

---

## Step D: Execute the Real Auto-Update Test

1. Open the previously installed **Version 1.0.0** application on the test machine.
2. Navigate to **Store Settings**.
3. Click the **Verifică update** button.
   - Verify the status text changes to `Se verifică actualizările...`.
   - Once checking completes, verify that the status displays `Actualizare nouă disponibilă!` and the **Descarcă update** button appears.
4. Click the **Descarcă update** button.
   - Verify the progress bar appears and increases from `0%` to `100%`.
   - Verify the status text displays `Se descarcă actualizarea... (<percent>%)`.
   - Once download finishes, verify the status displays `Actualizare descărcată. Gata de instalare!` and the **Instalează și repornește** button appears.
5. Click **Instalează și repornește**.
   - Verify a dialog prompt is shown: `Închide aplicația și instalează update-ul? Asigură-te că nu ai vânzări în curs.`.
   - Confirm the prompt. The application should close, launch the NSIS update installer silently or semi-silently in the background, and restart.
6. After restart, log back into the app and navigate to **Store Settings**:
   - Verify that **Versiune Aplicație** now displays `1.0.1`.
   - Verify that all local configurations in **Setări FiscalNet** are intact and have not been reset.

---

## Step E: Verify POS Safety Guards

1. In the running **Version 1.0.0** application, navigate to the **POS Page** and scan or add at least one product to the active cart (which persists under the key 'pos_cart' in localStorage).
2. Navigate to **Store Settings** and repeat the update checking/downloading steps until the **Instalează și repornește** button is visible.
3. Click **Instalează și repornește**.
   - Verify that the update installation is strictly blocked.
   - Verify that a warning alert is shown: `Finalizează sau golește coșul înainte de instalarea update-ului.`.
   - Confirm that the application did NOT close or trigger the update installation.
4. Go back to the POS Page, clear the cart (remove all products), return to Store Settings, and click **Instalează și repornește**.
   - Verify that the update installation now proceeds successfully.

---

## Step F: Verify Offline & Network Failure Recovery

1. In the running **Version 1.0.0** application, disconnect the machine from the internet (e.g., disable Wi-Fi or unplug the ethernet cable).
2. Go to **Store Settings** and click **Verifică update**.
   - Verify that the network status indicates `OFFLINE`.
   - Verify that the update action fails gracefully and displays a user-safe error message (e.g., `Eroare: Conectează-te la internet...` or `net::ERR_INTERNET_DISCONNECTED`).
3. Reconnect the machine to the internet.
4. Verify that the network status updates to `ONLINE`.
5. Click **Verifică update** again and confirm it successfully discovers the update.
