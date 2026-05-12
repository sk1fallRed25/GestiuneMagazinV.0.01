import { supabase } from '../../supabaseClient';
import { AuthProfile, StoreMembership, UserRole } from './types';

export const authService = {
  /**
   * Autentificare cu email și parolă prin Supabase Auth
   */
  async signInWithPassword(email: string, pass: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
  },

  /**
   * Deconectare
   */
  async signOut() {
    return await supabase.auth.signOut();
  },

  /**
   * Obține sesiunea curentă
   */
  async getCurrentSession() {
    return await supabase.auth.getSession();
  },

  /**
   * Obține profilul din tabela public.profiles (v2)
   */
  async getCurrentProfile(userId: string): Promise<AuthProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Eroare la încărcarea profilului:", error.message);
      return null;
    }

    if (!data.active) {
      throw new Error("Contul dumneavoastră este inactiv. Contactați administratorul.");
    }

    return data as AuthProfile;
  },

  /**
   * Obține apartenența la magazine din public.store_members (v2)
   */
  async getUserStoreMemberships(userId: string): Promise<StoreMembership[]> {
    const { data, error } = await supabase
      .from('store_members')
      .select(`
        store_id,
        profile_id,
        role,
        active,
        store:stores (*)
      `)
      .eq('profile_id', userId)
      .eq('active', true);

    if (error) {
      console.error("Eroare la încărcarea apartenenței la magazine:", error.message);
      return [];
    }

    // Supabase poate returna 'store' ca array dacă relația nu este recunoscută ca 1-la-1 în query-ul de select
    return (data || []).map((m: any) => ({
      ...m,
      store: Array.isArray(m.store) ? m.store[0] : m.store
    })) as StoreMembership[];
  },

  /**
   * Selectează automat primul magazin disponibil
   */
  async getFirstAvailableStore(userId: string, role: UserRole): Promise<StoreMembership | null> {
    const memberships = await this.getUserStoreMemberships(userId);
    if (memberships.length > 0) {
      return memberships[0];
    }
    return null;
  }
};
