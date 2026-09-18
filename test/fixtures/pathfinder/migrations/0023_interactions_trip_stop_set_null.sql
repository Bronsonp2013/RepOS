-- =============================================================================
-- Migration 0023 — interactions.trip_stop_id: ON DELETE SET NULL.
--
-- FIXES A HARD 500 SHIPPED IN 0020.
--
-- 0020 added `trip_stop_id BIGINT REFERENCES trip_stops(id)` with no ON DELETE
-- clause, which means Postgres NO ACTION. Its comment justified that ("a deleted trip
-- must not silently erase the visit that actually happened") and is right about
-- deleteTrip — which is a SOFT delete and never touches trip_stops.
--
-- But it missed reoptimizeTrip, which HARD-deletes every stop and reinserts them
-- (services/trips.ts). So:
--
--   rep logs a visit at a stop  →  edits a duration / moves a pin  →  reoptimize
--   →  DELETE FROM trip_stops  →  FK violation  →  500.
--
-- Once ANY visit was logged on a trip, that trip could never be reoptimized again —
-- breaking the exact field workflow 0020 was built to enable. Undo didn't rescue it
-- either: un-logging SOFT-deletes the interaction, so trip_stop_id stayed populated
-- and the FK still blocked.
--
-- SET NULL is the right rule here, and the direction matters: the INTERACTION is the
-- durable record (the visit really happened; it is on the account's timeline and in the
-- recency clock), while the trip STOP is a plan that gets rebuilt. Losing the plan must
-- never delete the fact. NO ACTION had that backwards — it let a stale plan row veto a
-- reoptimize.
--
-- The FK is not the only thing keeping the link honest: reoptimizeTrip RE-LINKS each
-- surviving interaction to the newly-created stop for the same account, so a visit the
-- rep already logged still reads as logged after a reoptimize. Without that, SET NULL
-- alone would silently un-log every visit on the trip and invite duplicates.
-- =============================================================================

ALTER TABLE interactions DROP CONSTRAINT interactions_trip_stop_id_fkey;

ALTER TABLE interactions
    ADD CONSTRAINT interactions_trip_stop_id_fkey
    FOREIGN KEY (trip_stop_id) REFERENCES trip_stops(id) ON DELETE SET NULL;
