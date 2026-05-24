export type ModuleStatus = 'active' | 'beta' | 'disabled' | 'planned';

export type ModuleCategory =
  | 'core'
  | 'stock'
  | 'sales'
  | 'admin'
  | 'reports'
  | 'ai'
  | 'fiscal'
  | 'offline'
  | 'platform';

export interface PlatformModule {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  category: ModuleCategory;
  routePaths: string[];
  defaultEnabled: boolean;
  requiresStoreContext: boolean;
  ownerOnly: boolean;
  minimumRoles: string[];
  dependencies: string[];
  status: ModuleStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StoreModuleAccessItem {
  moduleKey: string;
  name: string;
  description: string | null;
  category: ModuleCategory;
  routePaths: string[];
  status: ModuleStatus;
  defaultEnabled: boolean;
  explicitEnabled: boolean | null;
  effectiveEnabled: boolean;
  reason: string | null;
  enabledBy: string | null;
  enabledAt: string | null;
  disabledAt: string | null;
  dependencies: string[];
  minimumRoles: string[];
  requiresStoreContext: boolean;
  ownerOnly: boolean;
}

export interface ModuleAccessMap {
  [moduleKey: string]: StoreModuleAccessItem;
}

// Defensive helper parsers
const toStr = (val: unknown, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  return String(val);
};

const toStrOrNull = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  return String(val);
};

const toBool = (val: unknown, fallback = false): boolean => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true';
  return fallback;
};

const toBoolOrNull = (val: unknown): boolean | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true';
  return null;
};

const toStrArray = (val: unknown): string[] => {
  if (!val || !Array.isArray(val)) return [];
  return val.map(item => String(item));
};

const toRoutePathsArray = (val: unknown): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(item => String(item));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item));
      }
    } catch {
      // Ignore parsing errors
    }
  }
  return [];
};

export const parseStoreModuleAccessItem = (raw: unknown): StoreModuleAccessItem => {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    moduleKey: toStr(d.module_key ?? d.moduleKey),
    name: toStr(d.name),
    description: toStrOrNull(d.description),
    category: toStr(d.category, 'core') as ModuleCategory,
    routePaths: toRoutePathsArray(d.route_paths ?? d.routePaths),
    status: toStr(d.status, 'active') as ModuleStatus,
    defaultEnabled: toBool(d.default_enabled ?? d.defaultEnabled),
    explicitEnabled: toBoolOrNull(d.explicit_enabled ?? d.explicitEnabled),
    effectiveEnabled: toBool(d.effective_enabled ?? d.effectiveEnabled),
    reason: toStrOrNull(d.reason),
    enabledBy: toStrOrNull(d.enabled_by ?? d.enabledBy),
    enabledAt: toStrOrNull(d.enabled_at ?? d.enabledAt),
    disabledAt: toStrOrNull(d.disabled_at ?? d.disabledAt),
    dependencies: toStrArray(d.dependencies),
    minimumRoles: toStrArray(d.minimum_roles ?? d.minimumRoles),
    requiresStoreContext: toBool(d.requires_store_context ?? d.requiresStoreContext, true),
    ownerOnly: toBool(d.owner_only ?? d.ownerOnly, false),
  };
};

export const parsePlatformModule = (raw: unknown): PlatformModule => {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: toStr(d.id),
    moduleKey: toStr(d.module_key ?? d.moduleKey),
    name: toStr(d.name),
    description: toStrOrNull(d.description),
    category: toStr(d.category, 'core') as ModuleCategory,
    routePaths: toRoutePathsArray(d.route_paths ?? d.routePaths),
    defaultEnabled: toBool(d.default_enabled ?? d.defaultEnabled),
    requiresStoreContext: toBool(d.requires_store_context ?? d.requiresStoreContext, true),
    ownerOnly: toBool(d.owner_only ?? d.ownerOnly, false),
    minimumRoles: toStrArray(d.minimum_roles ?? d.minimumRoles),
    dependencies: toStrArray(d.dependencies),
    status: toStr(d.status, 'active') as ModuleStatus,
    createdAt: toStrOrNull(d.created_at ?? d.createdAt),
    updatedAt: toStrOrNull(d.updated_at ?? d.updatedAt),
  };
};

export const toModuleAccessMap = (items: unknown): ModuleAccessMap => {
  if (!items || !Array.isArray(items)) return {};
  const map: ModuleAccessMap = {};
  for (const item of items) {
    const parsed = parseStoreModuleAccessItem(item);
    if (parsed.moduleKey) {
      map[parsed.moduleKey] = parsed;
    }
  }
  return map;
};
