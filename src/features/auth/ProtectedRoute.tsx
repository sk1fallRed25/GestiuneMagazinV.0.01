import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { UserRole } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role: authRole, loading } = useAuth();
  const location = useLocation();

  // Verificăm modul legacy din variabilele de mediu
  const allowLegacy = import.meta.env.VITE_ALLOW_LEGACY_LOGIN === 'true';
  const legacyRole = allowLegacy ? (localStorage.getItem('magazin_role') as UserRole) : null;
  
  // Rolul efectiv: prioritizăm Auth real, apoi legacy
  const currentRole = authRole || legacyRole;
  const isAuthenticated = !!user || (allowLegacy && !!legacyRole);

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

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    // Dacă rolul nu este permis
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 p-6 text-slate-800">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          <div className="text-red-500 mb-4 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Acces Interzis</h2>
          <p className="text-slate-500 mb-6 font-medium">Contul dumneavoastră ({currentRole}) nu are permisiunile necesare pentru a accesa această secțiune.</p>
          <button 
            onClick={() => window.history.back()}
            className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-lg"
          >
            Înapoi la Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
