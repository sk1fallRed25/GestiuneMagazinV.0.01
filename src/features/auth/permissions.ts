import { UserRole } from './types';

export const routePermissions: Record<string, UserRole[]> = {
  '/': ['admin', 'platform_owner', 'manager'],
  '/produse': ['admin', 'platform_owner', 'manager', 'gestionar'],
  '/expirari': ['admin', 'platform_owner', 'manager', 'gestionar'],
  '/pierderi': ['admin', 'platform_owner', 'gestionar'],
  '/istoric-pierderi': ['admin', 'platform_owner', 'manager'],
  '/receptie': ['admin', 'platform_owner', 'gestionar'],
  '/transfer': ['admin', 'platform_owner', 'gestionar'],
  '/vanzare': ['admin', 'platform_owner', 'casier'],
  '/pos': ['casier', 'admin', 'platform_owner'],
  '/istoric-vanzari': ['admin', 'platform_owner', 'manager'],
  '/ai-consultant': ['admin', 'platform_owner', 'manager'],
  '/rapoarte': ['admin', 'platform_owner', 'manager'],
};

/**
 * Verifică dacă un rol are acces la o rută specifică.
 */
export const canAccessRoute = (role: UserRole | null, path: string): boolean => {
  if (!role) return false;
  
  const exactPath = Object.keys(routePermissions).find(p => path === p || (p !== '/' && path.startsWith(p)));
  
  if (!exactPath) {
    return ['admin', 'platform_owner'].includes(role);
  }

  return routePermissions[exactPath].includes(role);
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
