import { supabase } from '../../supabaseClient';
import { AuthProfile, StoreMembership, UserRole } from './types';

interface StoreRow {
  id: string;
  name: string;
  address?: string | null;
  fiscal_code?: string | null;
  settings?: Record<string, unknown> | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RawStoreMembership {
  store_id: string;
  profile_id: string;
  role: UserRole;
  active: boolean;
  store: StoreRow | StoreRow[] | null;
}


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

    const memberships = data as unknown as RawStoreMembership[];

    const activeMemberships = (memberships || []).filter(m => {
      const storeObj = Array.isArray(m.store) ? m.store[0] : m.store;
      return storeObj && storeObj.active !== false;
    });

    return activeMemberships.map((m) => {
      const storeObj = (Array.isArray(m.store) ? m.store[0] : m.store) || undefined;
      const settings = storeObj?.settings || {};
      const fiscalCode = storeObj?.fiscal_code || '';
      const workpointNumber = settings?.workpointNumber !== undefined && settings?.workpointNumber !== null ? Number(settings.workpointNumber) : 1;
      const displayCode = String(settings?.displayCode || `${fiscalCode} / ${workpointNumber}`);

      return {
        ...m,
        store: storeObj as unknown as StoreMembership['store'],
        storeName: storeObj?.name || '',
        fiscalCode,
        workpointNumber,
        displayCode
      };
    }) as StoreMembership[];
  },

  /**
   * Selectează automat primul magazin disponibil
   */
  async getFirstAvailableStore(userId: string): Promise<StoreMembership | null> {
    const memberships = await this.getUserStoreMemberships(userId);
    if (memberships.length > 0) {
      return memberships[0];
    }
    return null;
  }

};
