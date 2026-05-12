import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthState, UserRole } from './types';
import { authService } from './authService';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: null,
    currentStoreId: null,
    currentStore: null,
    storeRole: null,
    availableStores: [],
    loading: true,
    error: null,
    tenantId: null, // Legacy alias
    storeId: null,  // Legacy alias
  });

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error || "Eroare neașteptată la autentificare.");
  };

  const loadProfileAndStores = useCallback(async (userId: string) => {
    try {
      // 1. Încarcă Profilul
      const profile = await authService.getCurrentProfile(userId);
      if (!profile) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: "Profilul nu a putut fi găsit în sistem." 
        }));
        return;
      }

      // 2. Încarcă Magazinele la care are acces
      const memberships = await authService.getUserStoreMemberships(userId);
      
      // 3. Verifică accesul (non-platform_owner trebuie să aibă cel puțin un magazin)
      if (profile.role !== 'platform_owner' && memberships.length === 0) {
        setState(prev => ({ 
          ...prev, 
          profile,
          role: profile.role,
          loading: false, 
          error: "Utilizatorul nu este asociat cu niciun magazin activ." 
        }));
        return;
      }

      // 4. Selectează Magazinul Curent (primul disponibil sau cel salvat anterior)
      const currentMembership = memberships[0] || null;

      setState(prev => ({
        ...prev,
        profile,
        role: profile.role,
        availableStores: memberships,
        currentStoreId: currentMembership?.store_id || null,
        currentStore: currentMembership?.store || null,
        storeRole: (currentMembership?.role as UserRole) || null,
        // Legacy aliases
        tenantId: null,
        storeId: currentMembership?.store_id || null,
        loading: false,
        error: null
      }));
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("Eroare critică la inițializare Auth:", message);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: message 
      }));
    }
  }, []);

  useEffect(() => {
    // 1. Verifică sesiunea inițială
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        loadProfileAndStores(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    // 2. Ascultă schimbările de stare Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        loadProfileAndStores(session.user.id);
      } else {
        setState({
          session: null,
          user: null,
          profile: null,
          role: null,
          currentStoreId: null,
          currentStore: null,
          storeRole: null,
          availableStores: [],
          loading: false,
          error: null,
          tenantId: null,
          storeId: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileAndStores]);

  const login = async (email: string, pass: string): Promise<{ error: Error | null }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await authService.signInWithPassword(email, pass);
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      if (data.user) {
        await loadProfileAndStores(data.user.id);
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(getErrorMessage(err));
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { error };
    }
  };

  const logout = async () => {
    await authService.signOut();
    setState({
      session: null,
      user: null,
      profile: null,
      role: null,
      currentStoreId: null,
      currentStore: null,
      storeRole: null,
      availableStores: [],
      loading: false,
      error: null,
      tenantId: null,
      storeId: null
    });
  };

  const refreshProfile = async () => {
    if (state.user) {
      await loadProfileAndStores(state.user.id);
    }
  };

  const switchStore = async (storeId: string) => {
    const membership = state.availableStores.find(m => m.store_id === storeId);
    if (membership) {
      setState(prev => ({
        ...prev,
        currentStoreId: membership.store_id,
        currentStore: membership.store || null,
        storeRole: (membership.role as UserRole),
        storeId: membership.store_id // legacy alias
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile, switchStore }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
