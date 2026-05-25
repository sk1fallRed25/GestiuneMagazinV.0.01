import { supabase } from '../../../shared/supabase/supabaseClient';
import {
  StoreLifecycleStatusResponse,
  StoreDeletionEligibility,
  StoreLifecycleActionResult,
  StoreLifecycleStatus
} from '../types';

/**
 * Traduce erorile Postgres/Supabase în mesaje de eroare în limba română prietenoase.
 */
function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes('access denied') || msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'Nu ai permisiunea de a accesa sau modifica starea acestui magazin.';
  }
  if (msg.includes('reason is mandatory') || msg.includes('must be at least 3 characters')) {
    return 'Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.';
  }
  if (msg.includes('store not found')) {
    return 'Magazinul specificat nu a fost găsit.';
  }
  if (msg.includes('hard delete is disabled') || msg.includes('hard delete disabled') || msg.includes('delete is disabled')) {
    return 'Ștergerea definitivă este dezactivată în această versiune. Folosește arhivarea pentru clienți reali.';
  }
  if (msg.includes('cannot suspend') || msg.includes('store is in status')) {
    return `Nu se poate schimba starea magazinului în starea solicitată din cauza stării sale curente.`;
  }
  return errorMsg || 'A apărut o eroare neașteptată în timpul procesării.';
}

export const storeLifecycleService = {
  /**
   * Obține starea curentă a ciclului de viață al unui magazin
   */
  async getStoreLifecycleStatus(storeId: string): Promise<StoreLifecycleStatusResponse> {
    if (!storeId) {
      throw new Error('ID-ul magazinului este obligatoriu.');
    }

    const { data, error } = await supabase.rpc('get_store_lifecycle_status', {
      p_store_id: storeId
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    
    // Parse defensive values
    const lifecycleStatus = (raw.lifecycleStatus as StoreLifecycleStatus) || 'active';
    const active = typeof raw.active === 'boolean' ? raw.active : true;

    const eligibility: StoreDeletionEligibility = {
      canDelete: typeof raw.canDelete === 'boolean' ? raw.canDelete : false,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
      recommendedAction: (raw.recommendedAction as 'archive' | 'delete') || 'archive',
      counts: (raw.counts as Record<string, number>) || {}
    };

    return {
      storeId: String(raw.storeId || storeId),
      lifecycleStatus,
      active,
      suspendedAt: typeof raw.suspendedAt === 'string' ? raw.suspendedAt : null,
      suspensionReason: typeof raw.suspensionReason === 'string' ? raw.suspensionReason : null,
      archivedAt: typeof raw.archivedAt === 'string' ? raw.archivedAt : null,
      archiveReason: typeof raw.archiveReason === 'string' ? raw.archiveReason : null,
      deletionRequestedAt: typeof raw.deletionRequestedAt === 'string' ? raw.deletionRequestedAt : null,
      deletionReason: typeof raw.deletionReason === 'string' ? raw.deletionReason : null,
      deletionEligibility: eligibility
    };
  },

  /**
   * Suspendă magazinul
   */
  async suspendStore(storeId: string, reason: string): Promise<StoreLifecycleActionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
    }

    const { data, error } = await supabase.rpc('suspend_store', {
      p_store_id: storeId,
      p_reason: reason.trim()
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      ok: typeof raw.ok === 'boolean' ? raw.ok : false,
      changed: typeof raw.changed === 'boolean' ? raw.changed : false,
      storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
      lifecycleStatus: (raw.lifecycleStatus as StoreLifecycleStatus) || undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      message: typeof raw.message === 'string' ? raw.message : undefined
    };
  },

  /**
   * Reactivează un magazin suspendat sau arhivat
   */
  async reactivateStore(storeId: string, reason: string): Promise<StoreLifecycleActionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
    }

    const { data, error } = await supabase.rpc('reactivate_store', {
      p_store_id: storeId,
      p_reason: reason.trim()
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      ok: typeof raw.ok === 'boolean' ? raw.ok : false,
      changed: typeof raw.changed === 'boolean' ? raw.changed : false,
      storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
      lifecycleStatus: (raw.lifecycleStatus as StoreLifecycleStatus) || undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      message: typeof raw.message === 'string' ? raw.message : undefined
    };
  },

  /**
   * Arhivează magazinul
   */
  async archiveStore(storeId: string, reason: string): Promise<StoreLifecycleActionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
    }

    const { data, error } = await supabase.rpc('archive_store', {
      p_store_id: storeId,
      p_reason: reason.trim()
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      ok: typeof raw.ok === 'boolean' ? raw.ok : false,
      changed: typeof raw.changed === 'boolean' ? raw.changed : false,
      storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
      lifecycleStatus: (raw.lifecycleStatus as StoreLifecycleStatus) || undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      message: typeof raw.message === 'string' ? raw.message : undefined
    };
  },

  /**
   * Obține eligibilitatea de ștergere a magazinului
   */
  async getStoreDeletionEligibility(storeId: string): Promise<StoreDeletionEligibility> {
    if (!storeId) {
      throw new Error('ID-ul magazinului este obligatoriu.');
    }

    const { data, error } = await supabase.rpc('get_store_deletion_eligibility', {
      p_store_id: storeId
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      canDelete: typeof raw.canDelete === 'boolean' ? raw.canDelete : false,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
      recommendedAction: (raw.recommendedAction as 'archive' | 'delete') || 'archive',
      counts: (raw.counts as Record<string, number>) || {}
    };
  },

  /**
   * Solicită ștergerea magazinului
   */
  async requestStoreDeletion(storeId: string, reason: string): Promise<StoreLifecycleActionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
    }

    const { data, error } = await supabase.rpc('request_store_deletion', {
      p_store_id: storeId,
      p_reason: reason.trim()
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      ok: typeof raw.ok === 'boolean' ? raw.ok : false,
      changed: typeof raw.changed === 'boolean' ? raw.changed : false,
      storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
      lifecycleStatus: (raw.lifecycleStatus as StoreLifecycleStatus) || undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      message: typeof raw.message === 'string' ? raw.message : undefined
    };
  },

  /**
   * Anulează cererea de ștergere a magazinului
   */
  async cancelStoreDeletionRequest(storeId: string, reason: string): Promise<StoreLifecycleActionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Motivul acțiunii este obligatoriu și trebuie să aibă cel puțin 3 caractere.');
    }

    const { data, error } = await supabase.rpc('cancel_store_deletion_request', {
      p_store_id: storeId,
      p_reason: reason.trim()
    });

    if (error) {
      throw new Error(translateError(error.message));
    }

    const raw = data as Record<string, unknown>;
    return {
      ok: typeof raw.ok === 'boolean' ? raw.ok : false,
      changed: typeof raw.changed === 'boolean' ? raw.changed : false,
      storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
      lifecycleStatus: (raw.lifecycleStatus as StoreLifecycleStatus) || undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      message: typeof raw.message === 'string' ? raw.message : undefined
    };
  }
};
