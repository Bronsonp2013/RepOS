-- =============================================================================
-- Migration 0020 — Field visit-logging: link an interaction to the trip stop it
-- came from, and retire the denormalized visit_logged flag.
--
-- The db-migrate runner wraps each file in a transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. interactions.trip_stop_id — the missing bridge.
--
-- schema.sql has claimed since 0001 that flipping trip_stops.visit_logged "also
-- inserts an interactions row of type='visit'". It never did. This is the column
-- that makes the claim true: a visit logged in the field from a trip stop carries a
-- FK back to the stop it happened at.
--
-- Follows the appointment_id precedent from 0017 (nullable FK, no cascade — a
-- deleted trip must not silently erase the visit that actually happened).
-- ---------------------------------------------------------------------------
ALTER TABLE interactions ADD COLUMN trip_stop_id BIGINT REFERENCES trip_stops(id);

-- Serves "has this stop been logged?" — the derived flag below, hit once per stop
-- on every trip-detail render.
CREATE INDEX idx_interactions_trip_stop
    ON interactions(trip_stop_id) WHERE deleted_at IS NULL AND trip_stop_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. DROP trip_stops.visit_logged.
--
-- Deliberate, and the reasoning matters more than the column.
--
-- Once trip_stop_id exists, "this stop's visit was logged" is DERIVABLE — it is
-- exactly "a live interaction references this stop". Keeping the boolean as well
-- would mean two sources of truth for one fact, which must then be kept in sync
-- forever by every writer: log a visit (set both), undo it (unset both), soft-delete
-- the interaction some other way (flag silently lies).
--
-- This project has already paid for that mistake once. accounts.last_visit_at is
-- denormalized, and keeping it honest required recomputeAccountLastVisit() plus a
-- careful essay about why the incremental writer can't be monotonic — see
-- apps/api/src/services/interactions.ts. That column has to be denormalized (the
-- dashboard sorts 126 accounts on it). This one does not: it is a per-stop boolean
-- read once per render, answerable by an EXISTS against an indexed FK.
--
-- Safe to drop outright rather than expand/contract: NOTHING has ever written it
-- (grep-verified — it is read-only from 0001 to today), so there is no data to
-- preserve and no interim state to keep writable. The shared TripStop DTO keeps its
-- `visitLogged` field; getTripStops now computes it. API surface is unchanged.
-- ---------------------------------------------------------------------------
ALTER TABLE trip_stops DROP COLUMN visit_logged;
