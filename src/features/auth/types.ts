import { Session, User } from '@supabase/supabase-js';

export type UserRole = 
  | 'platform_owner'
  | 'admin'
  | 'manager'
  | 'gestionar'
  | 'casier';

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  fiscal_code: string | null;
  settings?: Record<string, unknown> | null;
  active: boolean;
}

export interface StoreMembership {
  store_id: string;
  profile_id: string;
  role: Exclude<UserRole, 'platform_owner'>;
  active: boolean;
  store?: Store;
  storeName?: string;
  fiscalCode?: string;
  workpointNumber?: number;
  displayCode?: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  currentStoreId: string | null;
  currentStore: Store | null;
  currentStoreName?: string | null;
  storeRole: UserRole | null;
  currentStoreRole?: UserRole | null;
  availableStores: StoreMembership[];
  loading: boolean;
  error: string | null;
}

