import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthState, UserRole } from './types';
import { authService } from './authService';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  selectStore: (storeId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: null,
    currentStoreId: null,
    currentStore: null,
    currentStoreName: null,
    storeRole: null,
    currentStoreRole: null,
    availableStores: [],
    loading: true,
    error: null,
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
      let memberships = await authService.getUserStoreMemberships(userId);

      if (profile.role === 'platform_owner') {
        const { data: allStores, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .eq('active', true);

        if (!storesError && allStores) {
          memberships = allStores.map(store => {
            const settings = (store.settings as Record<string, any>) || {};
            const fiscalCode = store.fiscal_code || '';
            const workpointNumber = settings.workpointNumber !== undefined && settings.workpointNumber !== null ? Number(settings.workpointNumber) : 1;
            const displayCode = String(settings.displayCode || `${fiscalCode} / ${workpointNumber}`);

            return {
              store_id: store.id,
              profile_id: userId,
              role: 'admin',
              active: true,
              store: store as any,
              storeName: store.name,
              fiscalCode,
              workpointNumber,
              displayCode
            };
          });
        }
      }

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
      let currentMembership = null;
      if (profile.role === 'platform_owner') {
        localStorage.removeItem('selected_store_id');
      } else {
        const savedStoreId = localStorage.getItem('selected_store_id');
        currentMembership = memberships.find(m => m.store_id === savedStoreId) || memberships[0] || null;
        if (currentMembership) {
          localStorage.setItem('selected_store_id', currentMembership.store_id);
        }
      }

      setState(prev => ({
        ...prev,
        profile,
        role: profile.role,
        availableStores: memberships,
        currentStoreId: currentMembership?.store_id || null,
        currentStore: currentMembership?.store || null,
        currentStoreName: currentMembership?.store?.name || null,
        storeRole: (currentMembership?.role as UserRole) || null,
        currentStoreRole: (currentMembership?.role as UserRole) || null,
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
          currentStoreName: null,
          storeRole: null,
          currentStoreRole: null,
          availableStores: [],
          loading: false,
          error: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileAndStores]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).authState = state;
    }
  }, [state]);

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
    localStorage.removeItem('selected_store_id');
    setState({
      session: null,
      user: null,
      profile: null,
      role: null,
      currentStoreId: null,
      currentStore: null,
      currentStoreName: null,
      storeRole: null,
      currentStoreRole: null,
      availableStores: [],
      loading: false,
      error: null
    });
  };

  const refreshProfile = async () => {
    if (state.user) {
      await loadProfileAndStores(state.user.id);
    }
  };

  const selectStore = async (storeId: string) => {
    if (!storeId) {
      localStorage.removeItem('selected_store_id');
      setState(prev => ({
        ...prev,
        currentStoreId: null,
        currentStore: null,
        currentStoreName: null,
        storeRole: null,
        currentStoreRole: null
      }));
      return;
    }
    const membership = state.availableStores.find(m => m.store_id === storeId);
    if (membership) {
      localStorage.setItem('selected_store_id', membership.store_id);
      setState(prev => ({
        ...prev,
        currentStoreId: membership.store_id,
        currentStore: membership.store || null,
        currentStoreName: membership.store?.name || null,
        storeRole: (membership.role as UserRole),
        currentStoreRole: (membership.role as UserRole)
      }));
    }
  };

  const switchStore = selectStore;

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile, switchStore, selectStore }}>
      {children}
    </AuthContext.Provider>
  );
};

