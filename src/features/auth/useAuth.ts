import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Hook personalizat pentru accesarea contextului de autentificare.
 * Mutat în fișier separat pentru a asigura compatibilitatea Vite Fast Refresh.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
