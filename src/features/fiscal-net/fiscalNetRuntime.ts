/**
 * Centralized Electron runtime detection for FiscalNet.
 * 
 * This module provides a single source of truth for checking whether the app
 * is running inside the Electron desktop shell with the required IPC bridge.
 * 
 * @see electron-preload.js — exposes window.electronAPI via contextBridge
 * @see package.json build.files — electron-preload.js must be included
 */

/**
 * Returns true if the application is running inside the Electron desktop
 * runtime AND the preload script has successfully exposed the FiscalNet IPC API.
 * 
 * Handles both:
 * - `isElectron: true` (boolean, current standard)
 * - `isElectron: () => true` (function, legacy fallback)
 */
export function isFiscalNetDesktopRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  
  const api = (window as any).electronAPI;
  if (!api) return false;

  // Defensive: support both boolean and function markers
  const marker = api.isElectron;
  const electronMarker =
    marker === true || (typeof marker === 'function' && marker() === true);

  return electronMarker && typeof api.writeFiscalNetFile === 'function';
}

/**
 * Returns detailed diagnostics about the Electron runtime state.
 * Used by the FiscalNet Station Settings diagnostic panel.
 */
export function getFiscalNetRuntimeDiagnostics(): {
  isElectron: boolean;
  hasElectronAPI: boolean;
  hasWriteAPI: boolean;
  hasReadAPI: boolean;
} {
  if (typeof window === 'undefined') {
    return { isElectron: false, hasElectronAPI: false, hasWriteAPI: false, hasReadAPI: false };
  }

  const api = (window as any).electronAPI;
  const hasElectronAPI = !!api;

  if (!hasElectronAPI) {
    return { isElectron: false, hasElectronAPI: false, hasWriteAPI: false, hasReadAPI: false };
  }

  const marker = api.isElectron;
  const isElectron =
    marker === true || (typeof marker === 'function' && marker() === true);

  return {
    isElectron,
    hasElectronAPI,
    hasWriteAPI: typeof api.writeFiscalNetFile === 'function',
    hasReadAPI: typeof api.readFiscalNetResponse === 'function',
  };
}
