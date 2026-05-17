export type OwnerMemberRole = 'admin' | 'manager' | 'gestionar' | 'casier';

export interface OwnerStore {
  id: string;
  name: string;
  address: string | null;
  fiscalCode: string | null;
  active: boolean;
  createdAt: string;
  membersCount: number;
}

export interface OwnerStoreMember {
  id: string; // format: storeId_profileId
  storeId: string;
  profileId: string;
  email: string;
  fullName: string | null;
  role: OwnerMemberRole;
  active: boolean;
  createdAt: string;
}

export interface OwnerConsoleStats {
  storesCount: number;
  activeStoresCount: number;
  membersCount: number;
  adminsCount: number;
}

export interface OwnerConsoleData {
  stats: OwnerConsoleStats;
  stores: OwnerStore[];
  selectedStoreMembers: OwnerStoreMember[];
}
