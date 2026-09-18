-- =============================================================================
-- Migration 0016 — Meeting Types, PHASE 2 (CONTRACT: drop legacy type surface)
-- Segment 2, Commit 6. Authoritative spec: PATHFINDER_SPEC_SEGMENT_2_MEETING_TYPES.md.
--
-- The atomic flip. 0015 (EXPAND) added meeting_type_id and backfilled it from
-- appointments.type. This drops the legacy `type` column + its CHECK constraint.
-- A grep-completeness gate ran immediately before this migration and proved zero
-- LIVE readers of appointments.type across apps/, packages/, and scripts/; the
-- one writer (scripts/seed-anchor-fixture.ts) is repointed to meeting_type_id in
-- this same commit, and the dead APPOINTMENT_TYPE* enums are removed from
-- packages/shared/src/enums.ts here too.
--
-- The db-migrate runner wraps each file in a transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- DROP COLUMN alone would cascade the CHECK away, but drop it explicitly first so
-- intent is legible in the history.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE appointments DROP COLUMN type;
