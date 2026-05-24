import { UserRole } from './types';

export interface RouteConfig {
  allowedRoles: UserRole[];
  moduleKey?: string;
  requiresStoreContext?: boolean;
}

export const routeConfigs: Record<string, RouteConfig> = {
  '/': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'dashboard',
    requiresStoreContext: true,
  },
  '/produse': {
    allowedRoles: ['admin', 'platform_owner', 'manager', 'gestionar'],
    moduleKey: 'products',
    requiresStoreContext: true,
  },
  '/expirari': {
    allowedRoles: ['admin', 'platform_owner', 'manager', 'gestionar'],
    moduleKey: 'expiration_tracking',
    requiresStoreContext: true,
  },
  '/pierderi': {
    allowedRoles: ['admin', 'platform_owner', 'gestionar'],
    moduleKey: 'loss_reporting',
    requiresStoreContext: true,
  },
  '/istoric-pierderi': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'waste_audit',
    requiresStoreContext: true,
  },
  '/receptie': {
    allowedRoles: ['admin', 'platform_owner', 'gestionar'],
    moduleKey: 'reception',
    requiresStoreContext: true,
  },
  '/transfer': {
    allowedRoles: ['admin', 'platform_owner', 'gestionar'],
    moduleKey: 'transfer',
    requiresStoreContext: true,
  },
  '/vanzare': {
    allowedRoles: ['admin', 'platform_owner', 'casier'],
    moduleKey: 'pos',
    requiresStoreContext: true,
  },
  '/pos': {
    allowedRoles: ['casier', 'admin', 'platform_owner'],
    moduleKey: 'pos',
    requiresStoreContext: true,
  },
  '/istoric-vanzari': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'sales_history',
    requiresStoreContext: true,
  },
  '/ai-consultant': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'ai_consultant',
    requiresStoreContext: true,
  },
  '/rapoarte': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'commercial_reports',
    requiresStoreContext: true,
  },
  '/setari-magazin': {
    allowedRoles: ['admin', 'platform_owner', 'manager'],
    moduleKey: 'store_settings',
    requiresStoreContext: true,
  },
  '/fast-add': {
    allowedRoles: ['admin', 'platform_owner'],
    moduleKey: 'quick_add',
    requiresStoreContext: true,
  },
  '/owner': {
    allowedRoles: ['platform_owner'],
    moduleKey: 'owner_console',
    requiresStoreContext: false,
  },
};

// Backwards compatibility
export const routePermissions: Record<string, UserRole[]> = Object.keys(routeConfigs).reduce(
  (acc, path) => {
    acc[path] = routeConfigs[path].allowedRoles;
    return acc;
  },
  {} as Record<string, UserRole[]>
);

/**
 * Verifică dacă un rol are acces la o rută specifică.
 */
export const canAccessRoute = (role: UserRole | null, path: string): boolean => {
  if (!role) return false;
  
  const exactPath = Object.keys(routeConfigs).find(p => path === p || (p !== '/' && path.startsWith(p)));
  
  if (!exactPath) {
    return ['admin', 'platform_owner'].includes(role);
  }

  return routeConfigs[exactPath].allowedRoles.includes(role);
};

/**
 * Helperi pentru roluri agregate (RBAC)
 */

export const isAdminLike = (role: UserRole | string | null): boolean => {
  if (!role) return false;
  return ['admin', 'platform_owner'].includes(role as UserRole);
};

export const isManagerLike = (role: UserRole | string | null): boolean => {
  if (!role) return false;
  return isAdminLike(role) || role === 'manager';
};

export const isStockOperator = (role: UserRole | string | null): boolean => {
  if (!role) return false;
  return isManagerLike(role) || role === 'gestionar';
};

export const isCashierLike = (role: UserRole | string | null): boolean => {
  if (!role) return false;
  return isAdminLike(role) || role === 'casier';
};

