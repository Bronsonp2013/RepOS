-- =============================================================================
-- Migration 0021 — drop the duplicate route-cache index.
--
-- 0005 declared UNIQUE (origin_lat, origin_lng, dest_lat, dest_lng) — which Postgres
-- backs with an index — and then created idx_route_cache_lookup on the IDENTICAL four
-- columns in the identical order. Two interchangeable btrees over the same key: the
-- planner just splits scans between them (live: 6094 vs 439), and every write to
-- route_distance_cache pays to maintain both. 928 kB and a write tax for nothing.
--
-- schema.sql has said "a future migration should drop it" since the index was created.
-- The note was written; the migration never was. This is it.
--
-- Zero risk: the UNIQUE-backed index serves every query this one serves.
-- =============================================================================

DROP INDEX IF EXISTS idx_route_cache_lookup;
