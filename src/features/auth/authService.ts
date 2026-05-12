import { supabase } from '../../supabaseClient';
import { AuthProfile, UserRole } from './types';

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
   * Obține profilul de business din tabela 'profiles'
   * Handle error dacă tabela nu există încă
   */
  async getCurrentProfile(userId: string): Promise<AuthProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Dacă tabela nu există, Supabase returnează de obicei un cod de eroare (ex: 'PGRST116' sau '42P01')
        console.warn("Profilul nu a putut fi încărcat (posibil tabelă lipsă):", error.message);
        return null;
      }

      return data as AuthProfile;
    } catch (err) {
      console.error("Eroare neașteptată la încărcarea profilului:", err);
      return null;
    }
  },

  /**
   * Mapare roluri vechi -> roluri noi (pentru compatibilitate)
   */
  mapLegacyRoleToNewRole(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'admin': 'admin',
      'casier': 'casier',
      'gestionar': 'gestionar'
    };

    return roleMap[role.toLowerCase()] || 'casier';
  }
};
