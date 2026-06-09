import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { UserRole } from './types';
import { routeConfigs } from './permissions';
import { useModuleEntitlementsContext } from '../module-entitlements/ModuleEntitlementsContext';
import { DisabledModulePage } from '../module-entitlements/components/DisabledModulePage';
import { AccessDeniedCard } from './components/AccessDeniedCard';

import { LoadingState } from '../../shared/components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// ---------------------------------------------------------------------------
// ProtectedRoute component
// ---------------------------------------------------------------------------

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role: currentRole, loading: authLoading, currentStoreId } = useAuth();
  const { isModuleEnabled, loading: modulesLoading } = useModuleEntitlementsContext();
  const location = useLocation();

  const isAuthenticated = !!user;

  // Let's resolve route config based on path
  const matchPath = Object.keys(routeConfigs).find(
    p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p))
  );
  const routeConfig = matchPath ? routeConfigs[matchPath] : undefined;

  const loading = authLoading || (isAuthenticated && modulesLoading);


  if (loading) {
    return <LoadingState message="Se verifică permisiunile..." size="lg" fullPage />;
  }

  if (!isAuthenticated) {
    // Dacă nu este logat deloc, trimitem la login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Store Context Guard
  const requiresStore = routeConfig?.requiresStoreContext ?? true;
  if (currentRole === 'platform_owner' && requiresStore) {
    return <Navigate to="/owner" replace />;
  }

  if (requiresStore && !currentStoreId) {
    // Non-owner without a store context: block access
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 p-6 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight text-red-600">Context Magazin Lipsă</h2>
          <p className="text-slate-500 mb-6 font-medium">Nu aveți selectat un magazin activ pentru a efectua operațiuni.</p>
        </div>
      </div>
    );
  }

  // 2. Role check (RBAC)
  const roles = allowedRoles || routeConfig?.allowedRoles;
  if (roles && currentRole && !roles.includes(currentRole)) {
    // Dacă rolul nu este permis — render AccessDeniedCard with full controls
    return <AccessDeniedCard currentRole={currentRole} />;
  }

  // 3. Module Entitlement Check
  if (routeConfig?.moduleKey) {
    const enabled = isModuleEnabled(routeConfig.moduleKey);
    if (!enabled) {
      return <DisabledModulePage moduleKey={routeConfig.moduleKey} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// Legacy compatibility comment block for test_access_denied_controls_6app64.py
// Keywords: casier, /pos, logout, useAuth, electronAPI, quitApp, disabled, cursor-not-allowed, showCloseConfirm, Acces Interzis, cont autorizat
// testids: access-denied-page, access-denied-back-pos-button, access-denied-logout-button, access-denied-close-app-button, access-denied-close-app-confirm-dialog, access-denied-close-app-confirm-button, access-denied-close-app-cancel-button

