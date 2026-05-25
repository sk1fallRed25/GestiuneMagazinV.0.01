import { supabase } from '../../../shared/supabase/supabaseClient';
import {
  OwnerConsoleData,
  OwnerStore,
  OwnerStoreMember,
  OwnerMemberRole,
  OwnerProfile,
  UnassignedProfile,
  StoreWithoutAdmin,
  AssignStoreMemberPayload,
  AssignStoreMemberResult,
  CreateStorePayload,
  UpdateStorePayload,
  StoreManagementResult,
  StoreSettings,
  OwnerAuditAction,
  OwnerAuditEntityType,
  CreateOwnerAuditLogPayload,
  OwnerAuditLogView
} from '../types';

interface StoreDbRow {
  id: string;
  name: string;
  address?: string | null;
  fiscal_code?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  settings?: unknown;
  lifecycle_status?: string | null;
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

const normalizeFiscalCode = (input: string): string => {
  if (!input) throw new Error("CUI / Cod fiscal obligatoriu.");
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length < 2 || cleaned.length > 20) {
    throw new Error("CUI / Cod fiscal trebuie să aibă între 2 și 20 de caractere.");
  }
  return cleaned;
};

const parseWorkpointNumber = (value: unknown): number => {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 999) {
    throw new Error("Numărul punctului de lucru trebuie să fie un număr întreg între 1 și 999.");
  }
  return num;
};

const buildStoreDisplayCode = (fiscalCode: string, workpointNumber: number): string => {
  return `${fiscalCode} / ${workpointNumber}`;
};

const validateStorePayload = (payload: { name: string; fiscalCode: string; workpointNumber: number; active: boolean }) => {
  if (!payload.name || !payload.name.trim()) {
    throw new Error("Numele magazinului este obligatoriu.");
  }
  normalizeFiscalCode(payload.fiscalCode);
  parseWorkpointNumber(payload.workpointNumber);
  if (typeof payload.active !== 'boolean') {
    throw new Error("Starea de activare trebuie să fie boolean.");
  }
};

const parseStoreSettings = (rawSettings: unknown, fiscalCode: string | null): StoreSettings & { workpointNumber: number | null; displayCode: string | null } => {
  let workpointNumber: number | null = null;
  let displayCode: string | null = null;
  let companyName: string | null = null;
  let notes: string | null = null;

  if (rawSettings && typeof rawSettings === 'object') {
    const obj = rawSettings as Record<string, unknown>;
    if (obj.workpointNumber !== undefined && obj.workpointNumber !== null) {
      const num = Number(obj.workpointNumber);
      if (!isNaN(num)) workpointNumber = num;
    }
    if (typeof obj.displayCode === 'string') displayCode = obj.displayCode as string;
    if (typeof obj.companyName === 'string') companyName = obj.companyName as string;
    if (typeof obj.notes === 'string') notes = obj.notes as string;
  }

  if (!displayCode && fiscalCode && workpointNumber !== null) {
    displayCode = `${fiscalCode} / ${workpointNumber}`;
  }

  return {
    workpointNumber,
    displayCode,
    companyName,
    notes
  };
};

export const ownerConsoleService = {
  /**
   * Creează un log de audit în tabela public.audit_logs (non-blocking)
   */
  async createOwnerAuditLog(payload: CreateOwnerAuditLogPayload): Promise<void> {
    try {
      let profileId = payload.profileId;
      if (!profileId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          profileId = authData.user.id;
        }
      }

      const { error: auditErr } = await supabase
        .from('audit_logs')
        .insert({
          store_id: payload.storeId ?? null,
          profile_id: profileId ?? null,
          action: payload.action,
          entity_type: payload.entityType,
          entity_id: payload.entityId ?? null,
          old_data: payload.oldData ?? null,
          new_data: payload.newData ?? null,
          ip_address: null
        });

      if (auditErr) {
        console.warn("Audit log failed:", auditErr.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Audit log failed:", msg);
    }
  },

  /**
   * Obține lista de audit logs pentru platform_owner
   */
  async getOwnerAuditLogs(limit = 50): Promise<OwnerAuditLogView[]> {
    const { data: auditData, error: auditErr } = await supabase
      .from('audit_logs')
      .select('id, store_id, profile_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auditErr) {
      console.error("Eroare la obținerea audit logs:", auditErr.message);
      throw new Error(`Eroare Supabase (audit_logs): ${auditErr.message}`);
    }

    const rawLogs = (auditData || []) as {
      id: string;
      store_id?: string | null;
      profile_id?: string | null;
      action: string;
      entity_type: string;
      entity_id?: string | null;
      old_data?: unknown;
      new_data?: unknown;
      ip_address?: string | null;
      created_at?: string | null;
    }[];

    if (rawLogs.length === 0) return [];

    const storeIds = Array.from(new Set(rawLogs.map(l => l.store_id).filter(Boolean) as string[]));
    const profileIds = Array.from(new Set(rawLogs.map(l => l.profile_id).filter(Boolean) as string[]));

    let storeMap = new Map<string, string>();
    if (storeIds.length > 0) {
      const { data: storesData } = await supabase.from('stores').select('id, name').in('id', storeIds);
      if (storesData) {
        storeMap = new Map(storesData.map(s => [s.id, s.name]));
      }
    }

    let profileMap = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, email').in('id', profileIds);
      if (profilesData) {
        profileMap = new Map(profilesData.map(p => [p.id, p.email]));
      }
    }

    return rawLogs.map(log => {
      const storeName = log.store_id ? (storeMap.get(log.store_id) || 'Magazin Necunoscut') : 'Sistem Global';
      const actorEmail = log.profile_id ? (profileMap.get(log.profile_id) || 'Utilizator Necunoscut') : 'Sistem';

      let summary = '';
      switch (log.action) {
        case 'store.create':
          summary = `Creare magazin: ${(log.new_data as Record<string, unknown>)?.name || storeName}`;
          break;
        case 'store.update':
          summary = `Actualizare magazin: ${storeName}`;
          break;
        case 'member.assign':
          summary = `Alocare membru: ${(log.new_data as Record<string, unknown>)?.role || 'casier'} la ${storeName}`;
          break;
        case 'member.role_update':
          summary = `Modificare rol membru în ${(log.new_data as Record<string, unknown>)?.role || 'necunoscut'} la ${storeName}`;
          break;
        case 'member.active_update':
          summary = `Setare stare activare membru (${(log.new_data as Record<string, unknown>)?.active ? 'activ' : 'inactiv'}) la ${storeName}`;
          break;
        case 'store.suspend':
          summary = `Suspendare magazin: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'nespecificat'}`;
          break;
        case 'store.reactivate':
          summary = `Reactivare magazin: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'nespecificat'}`;
          break;
        case 'store.archive':
          summary = `Arhivare magazin: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'nespecificat'}`;
          break;
        case 'store.deletion_request':
          summary = `Solicitare ștergere: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'nespecificat'}`;
          break;
        case 'store.cancel_deletion':
          summary = `Anulare ștergere: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'nespecificat'}`;
          break;
        case 'store.hard_delete_blocked':
          summary = `Încercare ștergere blocată pentru magazin: ${storeName}. Motiv: ${(log.new_data as Record<string, unknown>)?.reason || 'activitate existentă'}`;
          break;
        default:
          summary = `Acțiune: ${log.action}`;
      }

      return {
        id: log.id,
        storeName,
        actorEmail,
        action: log.action as OwnerAuditAction,
        entityType: log.entity_type as OwnerAuditEntityType,
        createdAt: log.created_at || new Date().toISOString(),
        summary,
        oldData: (log.old_data as Record<string, unknown>) || null,
        newData: (log.new_data as Record<string, unknown>) || null
      };
    });
  },

  /**
   * Obține lista completă de magazine pentru platform_owner
   */
  async getStores(): Promise<OwnerStore[]> {
    const { data: storesData, error: storesErr } = await supabase
      .from('stores')
      .select('id, name, address, fiscal_code, active, created_at, settings, lifecycle_status')
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
      const fiscalCode = store.fiscal_code || null;
      const parsedSettings = parseStoreSettings(store.settings, fiscalCode);

      return {
        id: store.id,
        name: store.name || 'Magazin Fără Nume',
        address: store.address || null,
        fiscalCode,
        active: store.active ?? true,
        createdAt: store.created_at || new Date().toISOString(),
        membersCount,
        settings: parsedSettings,
        workpointNumber: parsedSettings.workpointNumber,
        displayCode: parsedSettings.displayCode,
        lifecycleStatus: (store.lifecycle_status || 'active') as any
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

    const { data: oldRow } = await supabase
      .from('store_members')
      .select('active')
      .eq('store_id', storeId)
      .eq('profile_id', profileId)
      .maybeSingle();

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

    await this.createOwnerAuditLog({
      storeId,
      action: 'member.active_update',
      entityType: 'store_member',
      entityId: profileId,
      oldData: oldRow ? { active: oldRow.active } : null,
      newData: { active }
    });
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

    const { data: oldRow } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('profile_id', profileId)
      .maybeSingle();

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

    await this.createOwnerAuditLog({
      storeId,
      action: 'member.role_update',
      entityType: 'store_member',
      entityId: profileId,
      oldData: oldRow ? { role: oldRow.role } : null,
      newData: { role }
    });
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

    const { data: existingBefore } = await supabase
      .from('store_members')
      .select('role, active')
      .eq('store_id', storeId)
      .eq('profile_id', profileId)
      .maybeSingle();

    const oldData: Record<string, unknown> = existingBefore
      ? { role: existingBefore.role, active: existingBefore.active, existed: true }
      : { role: null, active: null, existed: false };

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

    await this.createOwnerAuditLog({
      storeId,
      action: 'member.assign',
      entityType: 'store_member',
      entityId: profileId,
      oldData,
      newData: {
        profileId,
        storeId,
        role,
        active
      }
    });

    return {
      storeId,
      profileId,
      role,
      active
    };
  },

  /**
   * Creează un magazin nou în baza de date
   */
  async createStore(payload: CreateStorePayload): Promise<StoreManagementResult> {
    validateStorePayload(payload);
    const normFiscalCode = normalizeFiscalCode(payload.fiscalCode);
    const wpNum = parseWorkpointNumber(payload.workpointNumber);
    const dispCode = buildStoreDisplayCode(normFiscalCode, wpNum);

    // Verifică dacă există deja store cu același fiscal_code și settings->>workpointNumber
    const { data: existingStores, error: checkErr } = await supabase
      .from('stores')
      .select('id, fiscal_code, settings')
      .eq('fiscal_code', normFiscalCode);

    if (checkErr) {
      console.error("Eroare la verificarea duplicatelor:", checkErr.message);
      throw new Error("Magazinul nu a putut fi creat.");
    }

    const rawExisting = (existingStores || []) as StoreDbRow[];
    const isDuplicate = rawExisting.some(st => {
      const parsed = parseStoreSettings(st.settings, st.fiscal_code || null);
      return parsed.workpointNumber === wpNum;
    });

    if (isDuplicate) {
      throw new Error("Există deja un magazin pentru acest CUI și punct de lucru.");
    }

    const newSettings = {
      workpointNumber: wpNum,
      displayCode: dispCode,
      companyName: payload.companyName || null,
      notes: payload.notes || null
    };

    const { data: insertedStore, error: insertErr } = await supabase
      .from('stores')
      .insert({
        name: payload.name.trim(),
        fiscal_code: normFiscalCode,
        address: payload.address ? payload.address.trim() : null,
        active: payload.active,
        settings: newSettings
      })
      .select('id')
      .maybeSingle();

    if (insertErr || !insertedStore) {
      console.error("Eroare la inserarea magazinului:", insertErr?.message);
      throw new Error("Magazinul nu a putut fi creat.");
    }

    await this.createOwnerAuditLog({
      storeId: insertedStore.id,
      action: 'store.create',
      entityType: 'store',
      entityId: insertedStore.id,
      oldData: null,
      newData: {
        name: payload.name.trim(),
        fiscalCode: normFiscalCode,
        workpointNumber: wpNum,
        displayCode: dispCode,
        active: payload.active,
        address: payload.address ? payload.address.trim() : null,
        companyName: payload.companyName || null
      }
    });

    return {
      storeId: insertedStore.id,
      name: payload.name.trim(),
      fiscalCode: normFiscalCode,
      workpointNumber: wpNum,
      active: payload.active
    };
  },

  /**
   * Actualizează un magazin existent în baza de date
   */
  async updateStore(payload: UpdateStorePayload): Promise<StoreManagementResult> {
    if (!payload.storeId) {
      throw new Error("ID magazin invalid.");
    }
    validateStorePayload(payload);
    const normFiscalCode = normalizeFiscalCode(payload.fiscalCode);
    const wpNum = parseWorkpointNumber(payload.workpointNumber);
    const dispCode = buildStoreDisplayCode(normFiscalCode, wpNum);

    // Verifică duplicat pe alt store și obține snapshot-ul vechi
    const { data: existingStores, error: checkErr } = await supabase
      .from('stores')
      .select('id, name, address, fiscal_code, active, settings')
      .eq('fiscal_code', normFiscalCode);

    if (checkErr) {
      console.error("Eroare la verificarea duplicatelor la update:", checkErr.message);
      throw new Error("Magazinul nu a putut fi actualizat.");
    }

    const rawExisting = (existingStores || []) as StoreDbRow[];
    const isDuplicate = rawExisting.some(st => {
      if (st.id === payload.storeId) return false;
      const parsed = parseStoreSettings(st.settings, st.fiscal_code || null);
      return parsed.workpointNumber === wpNum;
    });

    if (isDuplicate) {
      throw new Error("Există deja un magazin pentru acest CUI și punct de lucru.");
    }

    // Găsește setările vechi pentru a face merge sigur și pentru oldData
    const currentStore = rawExisting.find(st => st.id === payload.storeId);
    let mergedSettings: Record<string, unknown> = {};
    if (currentStore?.settings && typeof currentStore.settings === 'object') {
      mergedSettings = { ...(currentStore.settings as Record<string, unknown>) };
    }

    mergedSettings.workpointNumber = wpNum;
    mergedSettings.displayCode = dispCode;
    mergedSettings.companyName = payload.companyName || null;
    mergedSettings.notes = payload.notes || null;

    const oldData: Record<string, unknown> | null = currentStore ? {
      id: currentStore.id,
      name: currentStore.name,
      fiscalCode: currentStore.fiscal_code,
      address: currentStore.address,
      active: currentStore.active,
      settings: currentStore.settings
    } : null;

    const newData: Record<string, unknown> = {
      id: payload.storeId,
      name: payload.name.trim(),
      fiscalCode: normFiscalCode,
      workpointNumber: wpNum,
      displayCode: dispCode,
      address: payload.address ? payload.address.trim() : null,
      active: payload.active,
      companyName: payload.companyName || null,
      notes: payload.notes || null,
      settings: mergedSettings
    };

    const { error: updateErr } = await supabase
      .from('stores')
      .update({
        name: payload.name.trim(),
        fiscal_code: normFiscalCode,
        address: payload.address ? payload.address.trim() : null,
        active: payload.active,
        settings: mergedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.storeId);

    if (updateErr) {
      console.error("Eroare la actualizarea magazinului:", updateErr.message);
      throw new Error("Magazinul nu a putut fi actualizat.");
    }

    await this.createOwnerAuditLog({
      storeId: payload.storeId,
      action: 'store.update',
      entityType: 'store',
      entityId: payload.storeId,
      oldData,
      newData
    });

    return {
      storeId: payload.storeId,
      name: payload.name.trim(),
      fiscalCode: normFiscalCode,
      workpointNumber: wpNum,
      active: payload.active
    };
  }
};

