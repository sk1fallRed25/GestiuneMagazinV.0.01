import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { UserRole } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../../shared/components/ui';

interface AccessDeniedCardProps {
  currentRole: UserRole;
}

export const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({ currentRole }) => {
  const { logout } = useAuth();
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="bg-slate-800 p-6 text-white text-center select-none">
              <h3 className="text-lg font-bold">Închide aplicația?</h3>
              <p className="text-slate-300 text-xs font-semibold mt-1">
                Aplicația se va închide complet.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Button
                data-testid="access-denied-close-app-confirm-button"
                variant="danger"
                size="md"
                fullWidth
                onClick={confirmCloseApp}
              >
                Închide aplicația
              </Button>
              <Button
                data-testid="access-denied-close-app-cancel-button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={cancelCloseApp}
              >
                Anulează
              </Button>
            </div>
          </div>
        </div>
      )}

      <div data-testid="access-denied-page" className="flex items-center justify-center min-h-[60vh] p-6 text-slate-800">
        <Card data-testid="access-denied-card" className="max-w-md w-full" variant="elevated">
          <CardHeader className="flex flex-col items-center justify-center text-center pb-2 border-b-0">
            {/* Warning icon */}
            <div className="text-rose-600 mb-2 select-none flex justify-center bg-rose-50 p-4 rounded-full border border-rose-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-xl font-bold uppercase tracking-tight text-rose-600 select-none">
              Acces Interzis
            </CardTitle>
            <CardDescription className="text-slate-600 font-semibold max-w-xs leading-relaxed mt-2">
              Contul dumneavoastră ({currentRole}) nu are permisiunile necesare pentru a accesa această secțiune.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-2 text-center">
            {isCashier && (
              <p className="text-xs text-slate-500 mb-6 italic select-none font-medium">
                Pentru operațiuni de administrare, autentifică-te cu un cont autorizat.
              </p>
            )}
            {!isCashier && <div className="mb-4" />}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {/* Primary: Back to POS (cashier) or Dashboard (others) */}
              <Button
                data-testid={isCashier ? "access-denied-back-pos-button" : "access-denied-back-dashboard-button"}
                onClick={handleBack}
                variant="primary"
                size="md"
                fullWidth
              >
                {primaryLabel}
              </Button>

              {/* Logout */}
              <Button
                data-testid="access-denied-logout-button"
                onClick={handleLogout}
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                }
              >
                Deconectare
              </Button>

              {/* Close App (Electron only) */}
              <Button
                data-testid="access-denied-close-app-button"
                onClick={handleCloseApp}
                disabled={!isElectron}
                variant={isElectron ? 'danger' : 'secondary'}
                size="md"
                fullWidth
                title={isElectron ? 'Închide aplicația desktop' : 'Închiderea aplicației este disponibilă doar în versiunea desktop.'}
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                }
              >
                {isElectron ? 'Închide aplicația' : 'Închide aplicația (doar desktop)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AccessDeniedCard;
