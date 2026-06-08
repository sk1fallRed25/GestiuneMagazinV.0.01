import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { UserRole } from './types';
import { routeConfigs } from './permissions';
import { useModuleEntitlementsContext } from '../module-entitlements/ModuleEntitlementsContext';
import { DisabledModulePage } from '../module-entitlements/components/DisabledModulePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// ---------------------------------------------------------------------------
// AccessDeniedCard — self-contained card with Logout, Back, and Close App
// ---------------------------------------------------------------------------

interface AccessDeniedCardProps {
  currentRole: UserRole;
}

const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({ currentRole }) => {
  const { logout, user, currentStoreId } = useAuth();
  const navigate = useNavigate();
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
  const isCashier = currentRole === 'casier';

  // Primary back route: POS for cashier, Dashboard for others
  const primaryRoute = isCashier ? '/pos' : '/';
  const primaryLabel = isCashier ? 'Înapoi la POS' : 'Înapoi la Dashboard';

  const handleBack = () => {
    navigate(primaryRoute);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCloseApp = () => {
    if (!isElectron) return;
    setShowCloseConfirm(true);
  };

  const confirmCloseApp = () => {
    setShowCloseConfirm(false);
    if ((window as any).electronAPI?.appControls?.quitApp) {
      (window as any).electronAPI.appControls.quitApp();
    }
  };

  const cancelCloseApp = () => {
    setShowCloseConfirm(false);
  };

  return (
    <>
      {/* Close App Confirm Dialog */}
      {showCloseConfirm && (
        <div
          data-testid="access-denied-close-app-confirm-dialog"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 text-white text-center">
              <h3 className="text-lg font-black">Închide aplicația?</h3>
              <p className="text-slate-300 text-xs font-medium mt-1">
                Aplicația se va închide complet.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <button
                data-testid="access-denied-close-app-confirm-button"
                onClick={confirmCloseApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
              >
                Închide aplicația
              </button>
              <button
                data-testid="access-denied-close-app-cancel-button"
                onClick={cancelCloseApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm transition-all"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-testid="access-denied-page" className="flex items-center justify-center min-h-[60vh] p-6 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          {/* Warning icon */}
          <div className="text-red-500 mb-4 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Acces Interzis</h2>
          <p className="text-slate-500 mb-2 font-medium">
            Contul dumneavoastră ({currentRole}) nu are permisiunile necesare pentru a accesa această secțiune.
          </p>

          {isCashier && (
            <p className="text-xs text-slate-400 mb-6 italic">
              Pentru operațiuni de administrare, autentifică-te cu un cont autorizat.
            </p>
          )}
          {!isCashier && <div className="mb-6" />}

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Primary: Back to POS (cashier) or Dashboard (others) */}
            <button
              data-testid="access-denied-back-pos-button"
              onClick={handleBack}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] text-sm"
            >
              {primaryLabel}
            </button>

            {/* Logout */}
            <button
              data-testid="access-denied-logout-button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 border border-red-100 transition-all active:scale-[0.98] text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Deconectare
            </button>

            {/* Close App (Electron only) */}
            <button
              data-testid="access-denied-close-app-button"
              onClick={handleCloseApp}
              disabled={!isElectron}
              title={isElectron ? 'Închide aplicația desktop' : 'Închiderea aplicației este disponibilă doar în versiunea desktop.'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border transition-all ${
                isElectron
                  ? 'bg-slate-800 text-white hover:bg-slate-900 border-slate-700 active:scale-[0.98] shadow-lg'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {isElectron ? 'Închide aplicația' : 'Închide aplicația (doar desktop)'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

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
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium italic">Se verifică permisiunile...</p>
        </div>
      </div>
    );
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
