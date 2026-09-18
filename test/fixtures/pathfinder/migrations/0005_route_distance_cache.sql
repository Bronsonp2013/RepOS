-- =============================================================================
-- Migration 0005 — route_distance_cache
-- =============================================================================
-- Caches Google Distance Matrix API results keyed by rounded lat/lng pairs
-- (5 decimal places ≈ 1 m precision) to avoid redundant API calls across
-- trip builds that share common stop pairs.
-- Entries expire after 30 days (filtered at query time, not via cron).
-- =============================================================================

CREATE TABLE route_distance_cache (
  id               BIGSERIAL PRIMARY KEY,
  origin_lat       NUMERIC(8,5) NOT NULL,
  origin_lng       NUMERIC(8,5) NOT NULL,
  dest_lat         NUMERIC(8,5) NOT NULL,
  dest_lng         NUMERIC(8,5) NOT NULL,
  duration_seconds INT NOT NULL,
  distance_meters  INT NOT NULL,
  cached_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (origin_lat, origin_lng, dest_lat, dest_lng)
);

-- Serves the bulk cache-hit lookup in the trip service.
CREATE INDEX idx_route_cache_lookup
  ON route_distance_cache (origin_lat, origin_lng, dest_lat, dest_lng);
