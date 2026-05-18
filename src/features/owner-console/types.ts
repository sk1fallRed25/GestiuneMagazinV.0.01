export type OwnerMemberRole = 'admin' | 'manager' | 'gestionar' | 'casier';

export interface AssignStoreMemberPayload {
  profileId: string;
  storeId: string;
  role: OwnerMemberRole;
  active: boolean;
}

export interface AssignStoreMemberResult {
  storeId: string;
  profileId: string;
  role: OwnerMemberRole;
  active: boolean;
}

export interface AssignMemberFormState {
  profileId: string;
  storeId: string;
  role: OwnerMemberRole;
  active: boolean;
}

export interface StoreSettings {
  workpointNumber?: number | null;
  displayCode?: string | null;
  companyName?: string | null;
  notes?: string | null;
}

export interface OwnerStore {
  id: string;
  name: string;
  address: string | null;
  fiscalCode: string | null;
  active: boolean;
  createdAt: string;
  membersCount: number;
  settings?: StoreSettings;
  workpointNumber?: number | null;
  displayCode?: string | null;
}

export interface StoreFormState {
  name: string;
  fiscalCode: string;
  workpointNumber: string;
  address: string;
  active: boolean;
  companyName: string;
  notes: string;
}

export interface CreateStorePayload {
  name: string;
  fiscalCode: string;
  workpointNumber: number;
  address: string | null;
  active: boolean;
  companyName?: string | null;
  notes?: string | null;
}

export interface UpdateStorePayload {
  storeId: string;
  name: string;
  fiscalCode: string;
  workpointNumber: number;
  address: string | null;
  active: boolean;
  companyName?: string | null;
  notes?: string | null;
}

export interface StoreManagementResult {
  storeId: string;
  name: string;
  fiscalCode: string;
  workpointNumber: number;
  active: boolean;
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

export interface AssignedStoreInfo {
  storeId: string;
  storeName: string;
  role: OwnerMemberRole;
  active: boolean;
}

export interface OwnerProfile {
  id: string;
  email: string;
  fullName: string | null;
  globalRole: string;
  active: boolean;
  createdAt: string;
  storeCount: number;
  assignedStores: AssignedStoreInfo[];
}

export interface UnassignedProfile {
  id: string;
  email: string;
  fullName: string | null;
  globalRole: string;
  active: boolean;
  createdAt: string;
}

export interface StoreWithoutAdmin {
  storeId: string;
  storeName: string;
  active: boolean;
  memberCount: number;
}

export interface OwnerConsoleStats {
  // Nume existente pentru compatibilitate cu componentele vechi
  storesCount: number;
  activeStoresCount: number;
  membersCount: number;
  adminsCount: number;

  // Nume extinse solicitate pentru noul dashboard global
  totalStores: number;
  activeStores: number;
  totalProfiles: number;
  activeProfiles: number;
  totalStoreMembers: number;
  activeStoreMembers: number;
  totalStoreAdmins: number;
  unassignedProfiles: number;
  storesWithoutAdmin: number;
}

export interface OwnerConsoleData {
  stats: OwnerConsoleStats;
  stores: OwnerStore[];
  selectedStoreMembers: OwnerStoreMember[];
  profiles: OwnerProfile[];
  unassignedProfiles: UnassignedProfile[];
  storesWithoutAdmin: StoreWithoutAdmin[];
}

export type OwnerAuditAction =
  | 'store.create'
  | 'store.update'
  | 'member.assign'
  | 'member.role_update'
  | 'member.active_update';

export type OwnerAuditEntityType = 'store' | 'store_member';

export interface OwnerAuditLog {
  id: string;
  storeId: string | null;
  profileId: string | null;
  action: OwnerAuditAction;
  entityType: OwnerAuditEntityType;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface CreateOwnerAuditLogPayload {
  storeId?: string | null;
  profileId?: string | null;
  action: OwnerAuditAction;
  entityType: OwnerAuditEntityType;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export interface OwnerAuditLogView {
  id: string;
  storeName: string;
  actorEmail: string;
  action: OwnerAuditAction;
  entityType: OwnerAuditEntityType;
  createdAt: string;
  summary: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

