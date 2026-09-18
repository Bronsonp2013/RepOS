-- =============================================================================
-- Migration 0003 — add geocode_failed flag to accounts
-- =============================================================================
-- Marks accounts where geocoding was attempted but failed (bad address, no
-- result, API error). These accounts won't be retried automatically unless
-- the flag is cleared. Distinct from location IS NULL (not yet attempted).
-- =============================================================================

ALTER TABLE accounts ADD COLUMN geocode_failed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_accounts_geocode_failed
    ON accounts(id) WHERE geocode_failed = TRUE AND deleted_at IS NULL;
