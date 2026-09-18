-- =============================================================================
-- Migration 0012 — Segment 1, Commit 4: trip_stops.location_id
-- A trip stop is a visit to a physical location. Add a nullable FK into
-- account_locations and backfill every existing stop to its account's primary
-- location. getTripStops is repointed in the same commit to source stop
-- coordinates from the location's geo (identical values in V1, since the primary
-- location's geo was copied verbatim from the account row in 0010).
--
-- The db-migrate runner wraps each file in one transaction; no BEGIN/COMMIT here.
-- =============================================================================

ALTER TABLE trip_stops
    ADD COLUMN location_id BIGINT REFERENCES account_locations(id);

CREATE INDEX idx_trip_stops_location
    ON trip_stops(location_id);

-- Backfill: every existing stop points to its account's primary location.
-- Safe — all stop accounts have exactly one primary location (0 orphans).
UPDATE trip_stops ts
SET location_id = al.id
FROM account_locations al
WHERE al.account_id = ts.account_id
  AND al.is_primary
  AND al.deleted_at IS NULL;
