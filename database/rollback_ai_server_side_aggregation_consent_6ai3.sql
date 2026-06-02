-- =###########################################################################
-- BLUEPRINT ROLLBACK - ETAPA 6AI.3: AI SERVER-SIDE AGGREGATION & CONSENT
-- WARNING: RULAREA ACESTUI SCRIPT ȘTERGE TOATE DATELE DE CONSIMȚĂMÂNT,
-- CACHE SNAPSHOTS ȘI EXPORTURILE DE TRAINING ML DIN BAZA DE DATE!
-- =###########################################################################

-- ==========================================
-- 1. DROP TRIGGERS PE TABELE
-- ==========================================
DROP TRIGGER IF EXISTS tr_audit_store_ai_consent ON public.store_ai_consent;
DROP TRIGGER IF EXISTS update_store_ai_consent_updated_at ON public.store_ai_consent;

-- ==========================================
-- 2. DROP FUNCTIONS & TRIGGERS PROCEDURES
-- ==========================================
DROP FUNCTION IF EXISTS public.fn_audit_store_ai_consent_changes() CASCADE;
DROP FUNCTION IF EXISTS public.get_store_ai_consent(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_store_ai_consent(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_store_ai_snapshot(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_latest_store_ai_snapshot(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.create_training_snapshot_if_consented(UUID, DATE, DATE) CASCADE;

-- ==========================================
-- 3. DROP RLS POLICIES DEDICATE
-- ==========================================
DROP POLICY IF EXISTS "store_ai_consent_select" ON public.store_ai_consent;
DROP POLICY IF EXISTS "store_ai_consent_update" ON public.store_ai_consent;
DROP POLICY IF EXISTS "store_ai_snapshots_select" ON public.store_ai_snapshots;
DROP POLICY IF EXISTS "store_ai_training_snapshots_select" ON public.store_ai_training_snapshots;

-- ==========================================
-- 4. DROP INDEXES
-- ==========================================
DROP INDEX IF EXISTS public.idx_store_ai_snapshots_lookup;
DROP INDEX IF EXISTS public.idx_store_ai_training_store;

-- ==========================================
-- 5. DROP TABLES IN ORDINE CORECTĂ A DEPENDENȚELOR
-- ==========================================
DROP TABLE IF EXISTS public.store_ai_training_snapshots CASCADE;
DROP TABLE IF EXISTS public.store_ai_snapshots CASCADE;
DROP TABLE IF EXISTS public.store_ai_consent CASCADE;

-- ==========================================
-- NOTE PRIVIND TRATAREA DATELOR DE AUDIT
-- ==========================================
-- Jurnalele din tabela public.audit_logs generate de acțiunile:
-- 'ai_consent_updated', 'ai_consent_revoked', 'ai_training_snapshot_created',
-- 'ai_snapshot_refreshed' vor rămâne intacte în scop de trasabilitate istorică.
