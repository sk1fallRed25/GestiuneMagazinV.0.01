import { supabase } from '../../../shared/supabase/supabaseClient';
import { OwnerConsoleData, OwnerStore, OwnerStoreMember, OwnerMemberRole, OwnerProfile, UnassignedProfile, StoreWithoutAdmin, AssignStoreMemberPayload, AssignStoreMemberResult } from '../types';

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
   * Obține lista completă a profilelor din sistem cu asocierile lor la magazine
   */
  async getProfiles(): Promise<OwnerProfile[]> {
    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active, created_at')
      .order('email', { ascending: true });

    if (profilesErr) {
      console.error("Eroare la obținerea profilelor:", profilesErr.message);
      throw new Error(`Eroare Supabase (profiles): ${profilesErr.message}`);
    }

    const { data: membersData, error: membersErr } = await supabase
      .from('store_members')
      .select('store_id, profile_id, role, active');

    if (membersErr) {
      console.error("Eroare la obținerea membrilor pentru asocieri:", membersErr.message);
      throw new Error(`Eroare Supabase (store_members): ${membersErr.message}`);
    }

    const { data: storesData, error: storesErr } = await supabase
      .from('stores')
      .select('id, name');

    if (storesErr) {
      console.error("Eroare la obținerea magazinelor pentru asocieri:", storesErr.message);
      throw new Error(`Eroare Supabase (stores): ${storesErr.message}`);
    }

    const rawProfiles = (profilesData || []) as ProfileDbRow[];
    const rawMembers = (membersData || []) as StoreMemberDbRow[];
    const rawStores = (storesData || []) as { id: string; name: string }[];

    const storeMap = new Map<string, string>(rawStores.map(s => [s.id, s.name]));

    return rawProfiles.map(profile => {
      const userMembers = rawMembers.filter(m => m.profile_id === profile.id);
      const assignedStores = userMembers.map(m => ({
        storeId: m.store_id,
        storeName: storeMap.get(m.store_id) || 'Magazin Necunoscut',
        role: (m.role as OwnerMemberRole) || 'casier',
        active: m.active ?? true
      }));

      return {
        id: profile.id,
        email: profile.email || 'fara_email@domeniu.com',
        fullName: profile.full_name || null,
        globalRole: profile.role || 'casier',
        active: profile.active ?? true,
        createdAt: profile.created_at || new Date().toISOString(),
        storeCount: assignedStores.length,
        assignedStores
      };
    });
  },

  /**
   * Obține profilele care nu sunt asociate niciunui magazin
   */
  async getUnassignedProfiles(): Promise<UnassignedProfile[]> {
    const profiles = await this.getProfiles();
    return profiles
      .filter(p => p.storeCount === 0)
      .map(p => ({
        id: p.id,
        email: p.email,
        fullName: p.fullName,
        globalRole: p.globalRole,
        active: p.active,
        createdAt: p.createdAt
      }));
  },

  /**
   * Obține magazinele care nu au niciun administrator activ alocat
   */
  async getStoresWithoutAdmin(): Promise<StoreWithoutAdmin[]> {
    const stores = await this.getStores();
    const { data: membersData, error: membersErr } = await supabase
      .from('store_members')
      .select('store_id, role, active');

    if (membersErr) {
      console.error("Eroare la obținerea membrilor pentru magazine fără admin:", membersErr.message);
      throw new Error(`Eroare Supabase (store_members): ${membersErr.message}`);
    }

    const rawMembers = (membersData || []) as { store_id: string; role: string; active?: boolean | null }[];

    return stores
      .filter(store => {
        const hasActiveAdmin = rawMembers.some(
          m => m.store_id === store.id && m.role === 'admin' && m.active !== false
        );
        return !hasActiveAdmin;
      })
      .map(store => ({
        storeId: store.id,
        storeName: store.name,
        active: store.active,
        memberCount: store.membersCount
      }));
  },

  /**
   * Obține datele agregate pentru Owner Console (statistici, magazine, membri magazin selectat, profile, alerte)
   */
  async getOwnerConsoleData(): Promise<OwnerConsoleData> {
    const stores = await this.getStores();
    const selectedStoreMembers = stores.length > 0 ? await this.getStoreMembers(stores[0].id) : [];
    const profiles = await this.getProfiles();

    const { data: allMembers, error: membersErr } = await supabase
      .from('store_members')
      .select('store_id, profile_id, role, active');

    if (membersErr) {
      console.error("Eroare la obținerea tuturor membrilor pentru statistici:", membersErr.message);
      throw new Error(`Eroare Supabase (statistici): ${membersErr.message}`);
    }

    const rawAllMembers = (allMembers || []) as { store_id: string; profile_id: string; role: string; active?: boolean | null }[];

    // Calculăm unassignedProfiles din profiles
    const unassignedProfiles = profiles
      .filter(p => p.storeCount === 0)
      .map(p => ({
        id: p.id,
        email: p.email,
        fullName: p.fullName,
        globalRole: p.globalRole,
        active: p.active,
        createdAt: p.createdAt
      }));

    // Calculăm storesWithoutAdmin
    const storesWithoutAdmin = stores
      .filter(store => {
        const hasActiveAdmin = rawAllMembers.some(
          m => m.store_id === store.id && m.role === 'admin' && m.active !== false
        );
        return !hasActiveAdmin;
      })
      .map(store => ({
        storeId: store.id,
        storeName: store.name,
        active: store.active,
        memberCount: store.membersCount
      }));

    // Calculăm statistici
    const storesCount = stores.length;
    const activeStoresCount = stores.filter(s => s.active).length;

    const uniqueMembers = new Set(rawAllMembers.filter(m => m.active !== false).map(m => m.profile_id));
    const membersCount = uniqueMembers.size;

    const uniqueAdmins = new Set(rawAllMembers.filter(m => m.active !== false && m.role === 'admin').map(m => m.profile_id));
    const adminsCount = uniqueAdmins.size;

    const totalStores = storesCount;
    const activeStores = activeStoresCount;
    const totalProfiles = profiles.length;
    const activeProfiles = profiles.filter(p => p.active).length;
    const totalStoreMembers = rawAllMembers.length;
    const activeStoreMembers = rawAllMembers.filter(m => m.active !== false).length;
    const totalStoreAdmins = rawAllMembers.filter(m => m.role === 'admin').length;
    const unassignedProfilesCount = unassignedProfiles.length;
    const storesWithoutAdminCount = storesWithoutAdmin.length;

    return {
      stats: {
        // Nume existente pentru compatibilitate cu componentele vechi
        storesCount,
        activeStoresCount,
        membersCount,
        adminsCount,

        // Nume extinse
        totalStores,
        activeStores,
        totalProfiles,
        activeProfiles,
        totalStoreMembers,
        activeStoreMembers,
        totalStoreAdmins,
        unassignedProfiles: unassignedProfilesCount,
        storesWithoutAdmin: storesWithoutAdminCount
      },
      stores,
      selectedStoreMembers,
      profiles,
      unassignedProfiles,
      storesWithoutAdmin
    };
  },

  /**
   * Activează sau dezactivează accesul unui membru la un magazin
   */
  async setStoreMemberActive(storeId: string, profileId: string, active: boolean): Promise<void> {
    if (!storeId || !profileId) {
      throw new Error(`Identificatori invalizi: storeId=${storeId}, profileId=${profileId}`);
    }

    // 1. Actualizează starea în store_members
    const { error: memberErr } = await supabase
      .from('store_members')
      .update({ active })
      .eq('store_id', storeId)
      .eq('profile_id', profileId);

    if (memberErr) {
      console.error(`Eroare la actualizarea stării membrului storeId=${storeId}, profileId=${profileId}:`, memberErr.message);
      throw new Error(`Eroare Supabase (update store_members): ${memberErr.message}`);
    }
  },

  /**
   * Actualizează rolul unui membru într-un magazin
   */
  async updateStoreMemberRole(storeId: string, profileId: string, role: OwnerMemberRole): Promise<void> {
    if (role as string === 'platform_owner') {
      throw new Error("Nu este permisă setarea rolului platform_owner prin Owner Console.");
    }

    const validRoles: OwnerMemberRole[] = ['admin', 'manager', 'gestionar', 'casier'];
    if (!validRoles.includes(role)) {
      throw new Error(`Rol invalid specificat: ${role}`);
    }

    if (!storeId || !profileId) {
      throw new Error(`Identificatori invalizi: storeId=${storeId}, profileId=${profileId}`);
    }

    // 1. Actualizează rolul în store_members
    const { error: memberErr } = await supabase
      .from('store_members')
      .update({ role })
      .eq('store_id', storeId)
      .eq('profile_id', profileId);

    if (memberErr) {
      console.error(`Eroare la actualizarea rolului pentru membrul storeId=${storeId}, profileId=${profileId}:`, memberErr.message);
      throw new Error(`Eroare Supabase (update store_members): ${memberErr.message}`);
    }
  },

  /**
   * Alocă sau actualizează un utilizator existent la un magazin în store_members
   */
  async assignStoreMember(payload: AssignStoreMemberPayload): Promise<AssignStoreMemberResult> {
    const { profileId, storeId, role, active } = payload;

    if (!profileId) {
      throw new Error("Profilul selectat nu există.");
    }
    if (!storeId) {
      throw new Error("Magazinul selectat nu există.");
    }
    if ((role as string) === 'platform_owner') {
      throw new Error("Rol invalid pentru magazin.");
    }
    const validRoles: OwnerMemberRole[] = ['admin', 'manager', 'gestionar', 'casier'];
    if (!validRoles.includes(role)) {
      throw new Error("Rol invalid pentru magazin.");
    }

    // 1. Verifică dacă profilul există
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, role, active')
      .eq('id', profileId)
      .maybeSingle();

    if (profileErr || !profileData) {
      throw new Error("Profilul selectat nu există.");
    }

    // 2. Verifică dacă magazinul există
    const { data: storeData, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, active')
      .eq('id', storeId)
      .maybeSingle();

    if (storeErr || !storeData) {
      throw new Error("Magazinul selectat nu există.");
    }

    // 3. Upsert în store_members, cu fallback la select + update/insert dacă upsert eșuează din lipsă constraint unic
    const { error: upsertErr } = await supabase
      .from('store_members')
      .upsert({
        store_id: storeId,
        profile_id: profileId,
        role,
        active
      }, {
        onConflict: 'store_id,profile_id'
      });

    if (upsertErr) {
      console.warn("Upsert în store_members a eșuat (posibil lipsă constraint unic pe store_id, profile_id). Încercăm fallback select + update/insert:", upsertErr.message);

      // Fallback: verificăm dacă rândul există
      const { data: existingMember, error: checkErr } = await supabase
        .from('store_members')
        .select('store_id, profile_id')
        .eq('store_id', storeId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (checkErr) {
        console.error("Eroare la verificarea existenței membrului în fallback:", checkErr.message);
        throw new Error("Utilizatorul nu a putut fi alocat la magazin.");
      }

      if (existingMember) {
        // Rândul există, facem update
        const { error: updateErr } = await supabase
          .from('store_members')
          .update({ role, active })
          .eq('store_id', storeId)
          .eq('profile_id', profileId);

        if (updateErr) {
          console.error("Eroare la actualizarea membrului în fallback:", updateErr.message);
          throw new Error("Utilizatorul nu a putut fi alocat la magazin.");
        }
      } else {
        // Rândul nu există, facem insert
        const { error: insertErr } = await supabase
          .from('store_members')
          .insert({
            store_id: storeId,
            profile_id: profileId,
            role,
            active
          });

        if (insertErr) {
          console.error("Eroare la inserarea membrului în fallback:", insertErr.message);
          throw new Error("Utilizatorul nu a putut fi alocat la magazin.");
        }
      }
    }

    return {
      storeId,
      profileId,
      role,
      active
    };
  }
};

