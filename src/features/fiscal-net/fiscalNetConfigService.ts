export interface FiscalNetLocalConfig {
  enabled: boolean;
  bonuriPath: string;
  raspunsPath: string;
  realWriteEnabled: boolean;
  requireConfirmation: boolean;
  validatedAt?: string | null;
}

const CONFIG_KEY = 'fiscalnet-pilot-config';

const DEFAULT_CONFIG: FiscalNetLocalConfig = {
  enabled: false,
  bonuriPath: '',
  raspunsPath: '',
  realWriteEnabled: false,
  requireConfirmation: true,
  validatedAt: null
};

export function getFiscalNetConfig(): FiscalNetLocalConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem(CONFIG_KEY);
  if (!saved) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(saved);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CONFIG.enabled,
      bonuriPath: typeof parsed.bonuriPath === 'string' ? parsed.bonuriPath : DEFAULT_CONFIG.bonuriPath,
      raspunsPath: typeof parsed.raspunsPath === 'string' ? parsed.raspunsPath : DEFAULT_CONFIG.raspunsPath,
      realWriteEnabled: typeof parsed.realWriteEnabled === 'boolean' ? parsed.realWriteEnabled : DEFAULT_CONFIG.realWriteEnabled,
      requireConfirmation: typeof parsed.requireConfirmation === 'boolean' ? parsed.requireConfirmation : DEFAULT_CONFIG.requireConfirmation,
      validatedAt: parsed.validatedAt || parsed.lastValidatedAt || null
    };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveFiscalNetConfig(config: FiscalNetLocalConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function resetFiscalNetConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
}

export function isFiscalNetConfigReady(config: FiscalNetLocalConfig): boolean {
  return (
    config.enabled &&
    typeof config.bonuriPath === 'string' && config.bonuriPath.trim().length > 0 &&
    typeof config.raspunsPath === 'string' && config.raspunsPath.trim().length > 0 &&
    !!config.validatedAt
  );
}
