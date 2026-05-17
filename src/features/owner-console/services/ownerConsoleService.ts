import { supabase } from '../../../shared/supabase/supabaseClient';
import { OwnerConsoleData, OwnerStore, OwnerStoreMember, OwnerMemberRole } from '../types';

interface StoreDbRow {
  id: string;
  name: string;
  address?: string | null;
  fiscal_code?: string | null;
  active?: boolean | null;
  created_at?: string | null;
}

interface StoreMemberDbRow {
  store_id: string;
  profile_id: string;
  role: string;
  active?: boolean | null;
}

interface ProfileDbRow {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  active?: boolean | null;
  created_at?: string | null;
}

export const ownerConsoleService = {
  /**
   * Obține lista completă de magazine pentru platform_owner
   */
  async getStores(): Promise<OwnerStore[]> {
    const { data: storesData, error: storesErr } = await supabase
      .from('stores')
      .select('id, name, address, fiscal_code, active, created_at')
      .order('created_at', { ascending: false });

    if (storesErr) {
      console.error("Eroare la obținerea magazinelor:", storesErr.message);
      throw new Error(`Eroare Supabase (stores): ${storesErr.message}`);
    }

    const { data: membersData, error: membersErr } = await supabase
      .from('store_members')
      .select('store_id, active');

    if (membersErr) {
      console.error("Eroare la obținerea membrilor magazinelor:", membersErr.message);
      throw new Error(`Eroare Supabase (store_members): ${membersErr.message}`);
    }

    const rawStores = (storesData || []) as StoreDbRow[];
    const rawMembers = (membersData || []) as { store_id: string; active?: boolean | null }[];

    return rawStores.map(store => {
      const membersCount = rawMembers.filter(m => m.store_id === store.id && m.active !== false).length;
      return {
        id: store.id,
        name: store.name || 'Magazin Fără Nume',
        address: store.address || null,
        fiscalCode: store.fiscal_code || null,
        active: store.active ?? true,
        createdAt: store.created_at || new Date().toISOString(),
        membersCount
      };
    });
  },

  /**
   * Obține membrii asociați unui magazin specific
   */
  async getStoreMembers(storeId: string): Promise<OwnerStoreMember[]> {
    const { data: membersData, error: membersErr } = await supabase
      .from('store_members')
      .select('store_id, profile_id, role, active')
      .eq('store_id', storeId);

    if (membersErr) {
      console.error(`Eroare la obținerea membrilor pentru magazinul ${storeId}:`, membersErr.message);
      throw new Error(`Eroare Supabase (store_members): ${membersErr.message}`);
    }

    const rawMembers = (membersData || []) as StoreMemberDbRow[];
    if (rawMembers.length === 0) {
      return [];
    }

    const profileIds = rawMembers.map(m => m.profile_id);

    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active, created_at')
      .in('id', profileIds);

    if (profilesErr) {
      console.error("Eroare la obținerea profilelor membrilor:", profilesErr.message);
      throw new Error(`Eroare Supabase (profiles): ${profilesErr.message}`);
    }

    const rawProfiles = (profilesData || []) as ProfileDbRow[];
    const profileMap = new Map<string, ProfileDbRow>(rawProfiles.map(p => [p.id, p]));

    return rawMembers.map(m => {
      const profile = profileMap.get(m.profile_id);
      return {
        id: `${m.store_id}_${m.profile_id}`,
        storeId: m.store_id,
        profileId: m.profile_id,
        email: profile?.email || 'necunoscut@domeniu.com',
        fullName: profile?.full_name || null,
        role: (m.role as OwnerMemberRole) || 'casier',
        active: m.active ?? true,
        createdAt: profile?.created_at || new Date().toISOString()
      };
    });
  },

  /**
   * Obține datele agregate pentru Owner Console (statistici, magazine, membri magazin selectat)
   */
  async getOwnerConsoleData(): Promise<OwnerConsoleData> {
    const stores = await this.getStores();
    const selectedStoreMembers = stores.length > 0 ? await this.getStoreMembers(stores[0].id) : [];

    const { data: allMembers, error: membersErr } = await supabase
      .from('store_members')
      .select('profile_id, role, active');

    if (membersErr) {
      console.error("Eroare la obținerea tuturor membrilor pentru statistici:", membersErr.message);
      throw new Error(`Eroare Supabase (statistici): ${membersErr.message}`);
    }

    const rawAllMembers = (allMembers || []) as { profile_id: string; role: string; active?: boolean | null }[];

    const storesCount = stores.length;
    const activeStoresCount = stores.filter(s => s.active).length;

    // Calculăm numărul unic de membri activi în sistem
    const uniqueMembers = new Set(rawAllMembers.filter(m => m.active !== false).map(m => m.profile_id));
    const membersCount = uniqueMembers.size;

    // Calculăm numărul unic de administratori de magazin
    const uniqueAdmins = new Set(rawAllMembers.filter(m => m.active !== false && m.role === 'admin').map(m => m.profile_id));
    const adminsCount = uniqueAdmins.size;

    return {
      stats: {
        storesCount,
        activeStoresCount,
        membersCount,
        adminsCount
      },
      stores,
      selectedStoreMembers
    };
  },

  /**
   * Activează sau dezactivează accesul unui membru la un magazin
   */
  async setStoreMemberActive(memberId: string, active: boolean): Promise<void> {
    const [storeId, profileId] = memberId.split('_');
    if (!storeId || !profileId) {
      throw new Error(`ID membru invalid: ${memberId}`);
    }

    // 1. Actualizează starea în store_members
    const { error: memberErr } = await supabase
      .from('store_members')
      .update({ active })
      .eq('store_id', storeId)
      .eq('profile_id', profileId);

    if (memberErr) {
      console.error(`Eroare la actualizarea stării membrului ${memberId}:`, memberErr.message);
      throw new Error(`Eroare Supabase (update store_members): ${memberErr.message}`);
    }

    // 2. Pentru consecvență, verificăm dacă e cazul să actualizăm și profilul public
    // (Dacă utilizatorul e dezactivat din magazin, menținem profilul activ general, dar actualizăm dacă e singurul magazin)
    const { data: userMemberships, error: checkErr } = await supabase
      .from('store_members')
      .select('store_id, active')
      .eq('profile_id', profileId)
      .eq('active', true);

    if (!checkErr && (!userMemberships || userMemberships.length === 0)) {
      // Dacă nu mai are niciun magazin activ, putem seta și profilul ca inactiv
      await supabase.from('profiles').update({ active: false }).eq('id', profileId);
    } else if (active) {
      // Dacă a fost reactivat, ne asigurăm că profilul general este activ
      await supabase.from('profiles').update({ active: true }).eq('id', profileId);
    }
  },

  /**
   * Actualizează rolul unui membru într-un magazin
   */
  async updateStoreMemberRole(memberId: string, role: OwnerMemberRole): Promise<void> {
    if (role as string === 'platform_owner') {
      throw new Error("Nu este permisă setarea rolului platform_owner prin Owner Console.");
    }

    const validRoles: OwnerMemberRole[] = ['admin', 'manager', 'gestionar', 'casier'];
    if (!validRoles.includes(role)) {
      throw new Error(`Rol invalid specificat: ${role}`);
    }

    const [storeId, profileId] = memberId.split('_');
    if (!storeId || !profileId) {
      throw new Error(`ID membru invalid: ${memberId}`);
    }

    // 1. Actualizează rolul în store_members
    const { error: memberErr } = await supabase
      .from('store_members')
      .update({ role })
      .eq('store_id', storeId)
      .eq('profile_id', profileId);

    if (memberErr) {
      console.error(`Eroare la actualizarea rolului pentru membrul ${memberId}:`, memberErr.message);
      throw new Error(`Eroare Supabase (update store_members): ${memberErr.message}`);
    }

    // 2. Actualizează rolul și în profiles pentru sincronizare perfectă a rolului principal
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profileId);

    if (profileErr) {
      console.error(`Eroare la actualizarea rolului în profiles pentru ${profileId}:`, profileErr.message);
      throw new Error(`Eroare Supabase (update profiles): ${profileErr.message}`);
    }
  }
};
