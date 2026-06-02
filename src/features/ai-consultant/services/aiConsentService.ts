import { supabase } from '../../../shared/supabase/supabaseClient';
import { StoreAiConsent, StoreAiConsentPatch } from '../types';


// ─── Helpers (snake_case <-> camelCase) ─────────────────────────

const parseStoreAiConsent = (raw: any): StoreAiConsent => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Datele de consimțământ AI sunt invalide.');
  }
  return {
    storeId: raw.store_id || '',
    aiConsultantEnabled: !!raw.ai_consultant_enabled,
    aiDataPreparationEnabled: !!raw.ai_data_preparation_enabled,
    allowModelImprovement: !!raw.allow_model_improvement,
    allowAnonymizedBenchmarking: !!raw.allow_anonymized_benchmarking,
    allowCrossStoreTraining: !!raw.allow_cross_store_training,
    allowExternalAiProcessing: !!raw.allow_external_ai_processing,
    consentVersion: raw.consent_version || 'v1',
    acceptedByProfileId: raw.accepted_by_profile_id || null,
    acceptedAt: raw.accepted_at || null,
    revokedAt: raw.revoked_at || null,
    updatedAt: raw.updated_at || null,
  };
};

const serializeConsentPatch = (patch: Partial<StoreAiConsentPatch>): Record<string, any> => {
  const result: Record<string, any> = {};
  if (patch.aiConsultantEnabled !== undefined) result.ai_consultant_enabled = patch.aiConsultantEnabled;
  if (patch.aiDataPreparationEnabled !== undefined) result.ai_data_preparation_enabled = patch.aiDataPreparationEnabled;
  if (patch.allowModelImprovement !== undefined) result.allow_model_improvement = patch.allowModelImprovement;
  if (patch.allowAnonymizedBenchmarking !== undefined) result.allow_anonymized_benchmarking = patch.allowAnonymizedBenchmarking;
  if (patch.allowCrossStoreTraining !== undefined) result.allow_cross_store_training = patch.allowCrossStoreTraining;
  if (patch.allowExternalAiProcessing !== undefined) result.allow_external_ai_processing = patch.allowExternalAiProcessing;
  if (patch.consentVersion !== undefined) result.consent_version = patch.consentVersion;
  return result;
};

// ─── Service ───────────────────────────────────────────────────

export const aiConsentService = {
  /**
   * Obtine setarile de consimtamant AI pentru magazin.
   * Apeleaza RPC public.get_store_ai_consent(p_store_id uuid)
   */
  async getStoreAiConsent(storeId: string): Promise<StoreAiConsent> {
    if (!storeId) {
      throw new Error('ID-ul magazinului este obligatoriu.');
    }

    const { data, error } = await supabase.rpc('get_store_ai_consent', {
      p_store_id: storeId,
    });

    if (error) {
      console.error('[aiConsentService] getStoreAiConsent error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('neautorizat') || error.message?.includes('membru')) {
        throw new Error('Nu ai permisiunea necesară pentru a vizualiza setările de consimțământ AI.');
      }
      throw new Error('Nu s-au putut încărca setările de consimțământ AI.');
    }

    return parseStoreAiConsent(data);
  },

  /**
   * Actualizeaza setarile de consimtamant AI pentru magazin.
   * Apeleaza RPC public.update_store_ai_consent(p_store_id uuid, p_patch jsonb)
   */
  async updateStoreAiConsent(storeId: string, patch: Partial<StoreAiConsentPatch>): Promise<StoreAiConsent> {
    if (!storeId) {
      throw new Error('ID-ul magazinului este obligatoriu pentru actualizare.');
    }

    const serializedPatch = serializeConsentPatch(patch);

    const { data, error } = await supabase.rpc('update_store_ai_consent', {
      p_store_id: storeId,
      p_patch: serializedPatch,
    });

    if (error) {
      console.error('[aiConsentService] updateStoreAiConsent error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('administratorul') || error.message?.includes('admin')) {
        throw new Error('Doar administratorul magazinului poate modifica aceste setări.');
      }
      if (error.message?.includes('signature') || error.message?.includes('chk_consent_signature')) {
        throw new Error('Activarea opțiunilor sensibile necesită un acord și o semnătură validă.');
      }
      throw new Error('Nu s-au putut salva setările de consimțământ AI.');
    }

    return parseStoreAiConsent(data);
  },
};
