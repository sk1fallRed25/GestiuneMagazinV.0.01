# FiscalNet Electron Runtime Detection Hotfix — Etapa 6G.FN.3.2

## Problema Raportată

Aplicația packaged Electron (.exe) generată cu Electron Builder afișa mesajul:
> **"Browser Sandbox (Scriere dezactivată)"**

în UI-ul FiscalNet, deși rula ca `.exe` pe POS.  
Aceasta însemna că renderer-ul nu detecta corect `window.electronAPI`.

## Cauza Identificată

### 🔴 ROOT CAUSE: `electron-preload.js` lipsea din `build.files`

În `package.json`, configurarea Electron Builder:

```json
"build": {
  "files": [
    "dist/**/*",
    "electron-main.js",
    "package.json"
  ]
}
```

**`electron-preload.js` NU era inclus.** Când Electron Builder împacheta aplicația:

1. `electron-main.js` era inclus → procesul principal pornea
2. `electron-preload.js` **lipsea** → `path.join(__dirname, 'electron-preload.js')` nu găsea fișierul
3. Preload-ul eșua silențios → `window.electronAPI` nu era niciodată creat
4. UI-ul verifica `!!window.electronAPI` → `false` → "Browser Sandbox"

### Probleme secundare identificate

- **Detecție inconsistentă**: 4 fișiere diferite aveau 3 moduri diferite de a verifica `electronAPI`
- **Fără tip global**: `ElectronAPI` era declarat inline doar în `SaleDetailsModal.tsx`
- **Fără diagnostic vizibil**: Nu exista niciun mod de a vedea în UI de ce detecția eșua
- **Debug noise**: `console.log` activ în producție

## Fix-ul Aplicat

### 1. `package.json` — ROOT CAUSE FIX

```diff
 "files": [
   "dist/**/*",
   "electron-main.js",
+  "electron-preload.js",
   "package.json"
 ]
```

### 2. `electron-preload.js` — Verificat OK (nu a necesitat modificări)

```js
contextBridge.exposeInMainWorld('electronAPI', {
    writeFiscalNetFile: (args) => ipcRenderer.invoke('write-fiscal-net-file', args),
    readFiscalNetResponse: (args) => ipcRenderer.invoke('read-fiscal-net-response', args),
    isElectron: true  // ← boolean simplu, nu funcție
});
```

### 3. `electron-main.js` — Verificat OK

- `nodeIntegration: false` ✅
- `contextIsolation: true` ✅
- `preload: path.join(__dirname, 'electron-preload.js')` ✅

### 4. `src/features/fiscal-net/fiscalNetRuntime.ts` — NOU

Helper centralizat cu detecție defensivă:

```ts
export function isFiscalNetDesktopRuntime(): boolean {
  // Suportă atât boolean cât și funcție (fallback legacy)
  const marker = api.isElectron;
  const electronMarker =
    marker === true || (typeof marker === 'function' && marker() === true);
  return electronMarker && typeof api.writeFiscalNetFile === 'function';
}

export function getFiscalNetRuntimeDiagnostics(): { ... }
```

### 5. `src/types/electron.d.ts` — NOU

Declarație globală de tip pentru `window.electronAPI`.

### 6. UI Updates — 4 fișiere unificate

| Fișier | Înainte | După |
|--------|---------|------|
| `FiscalNetStationSettings.tsx` | `!!window.electronAPI` | `isFiscalNetDesktopRuntime()` + panou diagnostic |
| `SaleDetailsModal.tsx` | `!!window.electronAPI` + console.log | `isFiscalNetDesktopRuntime()` |
| `fiscalNetPostCheckoutService.ts` | `win.electronAPI.isElectron === true` | `isFiscalNetDesktopRuntime()` |
| `usePos.ts` | `win.electronAPI.isElectron === true` | `isFiscalNetDesktopRuntime()` |

### 7. Panou Diagnostic în Setări FiscalNet

Afișează 4 indicatori cu `data-testid`:

| Indicator | data-testid | Valoare |
|-----------|------------|---------|
| Runtime | `fiscalnet-runtime-is-electron` | Desktop/Electron detectat / Browser Sandbox |
| Preload | `fiscalnet-runtime-has-electron-api` | electronAPI prezent: DA/NU |
| Write API | `fiscalnet-runtime-has-write-api` | disponibil: DA/NU |
| Read API | `fiscalnet-runtime-has-read-api` | disponibil: DA/NU |

## Verificare în UI

După regenerarea `.exe` și deploy pe POS:

1. Deschide **Setări Magazin** → secțiunea **Setări Stație FiscalNet**
2. Verifică panoul **Diagnosticare Runtime Electron**
3. Toate cele 4 indicatoare trebuie să fie **verzi** (DA)
4. Status Runtime trebuie să afișeze **Desktop Bridge Activ (Electron)**

## Regenerare .exe

```bash
npm run build
npm run electron:build
```

Fișierul generat: `release/Sistem Gestiune Magazin.exe`  
Copiază pe POS și înlocuiește versiunea anterioară.

## Rezultate Teste

| Test | Rezultat |
|------|---------|
| `npm run build` | ✅ PASS |
| `test_fiscalnet_electron_runtime_detection_6gfn32.py` | ✅ 32/32 PASS |
| `test_fiscalnet_pos_auto_write_6gfn3.py` | ✅ ALL PASS |
| `test_fiscalnet_ipc_security_6gfn21.py` | ✅ Node IPC PASS |
| `test_fiscalnet_station_settings_6gfn22.py` | ✅ Static + E2E PASS |
