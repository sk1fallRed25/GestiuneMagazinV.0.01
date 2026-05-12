import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';
import { AuthState, AuthProfile, UserRole } from './types';
import { authService } from './authService';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: null,
    tenantId: null,
    storeId: null,
    loading: true,
    error: null,
  });

  const loadProfile = useCallback(async (userId: string) => {
    const profile = await authService.getCurrentProfile(userId);
    if (profile) {
      setState(prev => ({
        ...prev,
        profile,
        role: profile.role,
        tenantId: profile.tenant_id,
        storeId: profile.store_id || null,
        loading: false
      }));
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // 1. Verifică sesiunea inițială
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        loadProfile(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    // 2. Ascultă schimbările de stare Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        loadProfile(session.user.id);
      } else {
        setState({
          session: null,
          user: null,
          profile: null,
          role: null,
          tenantId: null,
          storeId: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email: string, pass: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await authService.signInWithPassword(email, pass);
    
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { error };
    }

    if (data.user) {
      await loadProfile(data.user.id);
    }

    return { error: null };
  };

  const logout = async () => {
    await authService.signOut();
    setState({
      session: null,
      user: null,
      profile: null,
      role: null,
      tenantId: null,
      storeId: null,
      loading: false,
      error: null,
    });
  };

  const refreshProfile = async () => {
    if (state.user) {
      await loadProfile(state.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile }}>
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
