import { UserRole } from './types';

export const routePermissions: Record<string, UserRole[]> = {
  '/': ['admin', 'tenant_admin', 'platform_owner', 'manager'],
  '/produse': ['admin', 'tenant_admin', 'platform_owner', 'manager', 'gestionar'],
  '/expirari': ['admin', 'tenant_admin', 'platform_owner', 'manager', 'gestionar'],
  '/pierderi': ['admin', 'tenant_admin', 'platform_owner', 'gestionar'],
  '/istoric-pierderi': ['admin', 'tenant_admin', 'platform_owner', 'manager'],
  '/receptie': ['admin', 'tenant_admin', 'platform_owner', 'gestionar'],
  '/transfer': ['admin', 'tenant_admin', 'platform_owner', 'gestionar'],
  '/vanzare': ['admin', 'tenant_admin', 'platform_owner', 'casier'],
  '/pos': ['casier', 'admin', 'tenant_admin', 'platform_owner'],
  '/istoric-vanzari': ['admin', 'tenant_admin', 'platform_owner', 'manager'],
  '/ai-consultant': ['admin', 'tenant_admin', 'platform_owner', 'manager'],
  '/furnizori': ['admin', 'tenant_admin', 'platform_owner', 'gestionar'],
};

/**
 * Verifică dacă un rol are acces la o rută specifică.
 * Dacă ruta nu este în listă, se consideră că necesită cel puțin rol de 'gestionar'.
 */
export const canAccessRoute = (role: UserRole | null, path: string): boolean => {
  if (!role) return false;
  
  // Găsim cea mai apropiată potrivire de rută (pentru rute cu parametri ca /comanda/:id)
  const exactPath = Object.keys(routePermissions).find(p => path === p || (p !== '/' && path.startsWith(p)));
  
  if (!exactPath) {
    // Default: doar adminii pot vedea rute nedefinite
    return ['admin', 'platform_owner', 'tenant_admin'].includes(role);
  }

  return routePermissions[exactPath].includes(role);
};
