-- =============================================================================
-- Migration 0011 — Segment 1, Commit 3: interactions.location_id
-- Visits/check-ins tie to a physical location. Add a nullable FK into
-- account_locations and backfill every existing interaction to its account's
-- primary location. The writer (packages/db interactions repo) is repointed in
-- the same commit to stamp location_id on new rows.
--
-- The db-migrate runner wraps each file in one transaction; no BEGIN/COMMIT here.
-- =============================================================================

ALTER TABLE interactions
    ADD COLUMN location_id BIGINT REFERENCES account_locations(id);

-- Serves per-location recency (Commit 7) and location-scoped history reads.
CREATE INDEX idx_interactions_location
    ON interactions(location_id) WHERE deleted_at IS NULL;

-- Backfill: every existing interaction points to its account's primary location.
-- Safe — all interaction accounts have exactly one primary location (0 orphans).
UPDATE interactions i
SET location_id = al.id
FROM account_locations al
WHERE al.account_id = i.account_id
  AND al.is_primary
  AND al.deleted_at IS NULL;
