import { Session, User } from '@supabase/supabase-js';

export type UserRole = 
  | 'platform_owner'
  | 'tenant_admin'
  | 'admin'
  | 'manager'
  | 'gestionar'
  | 'casier';

export interface AuthProfile {
  id: string;
  tenant_id: string | null;
  store_id?: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  tenantId: string | null;
  storeId: string | null;
  loading: boolean;
  error: string | null;
}
