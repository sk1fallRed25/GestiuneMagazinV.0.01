-- ======================================================================================
-- ADD last_seen_at TO devices (FAZA 6.1 FIX)
-- ======================================================================================

ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();
