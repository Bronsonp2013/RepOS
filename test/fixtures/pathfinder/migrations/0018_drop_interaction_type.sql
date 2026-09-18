-- =============================================================================
-- Migration 0018 — Interaction Types, PHASE 2 (CONTRACT: drop legacy type surface)
-- Segment 3, Commit 3. Authoritative spec: PATHFINDER_SPEC_SEGMENT_3_TYPED_INTERACTIONS.md.
--
-- The atomic flip. 0017 (EXPAND) added interaction_type_id and backfilled it from
-- interactions.type. This drops the legacy `type` column, its CHECK, and its index.
-- A grep-completeness gate ran immediately before this migration and proved zero
-- LIVE readers or writers of interactions.type across apps/, packages/, and
-- scripts/ — the only remaining mentions are prose comments.
--
-- The db-migrate runner wraps each file in a transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. REPEAT THE EXPAND BACKFILL, IDEMPOTENTLY.
--
-- Standing rule from the 0015/0016 review (Segment 2 spec §5), and this is its
-- first application. Between 0017 and 0018 an old-code instance may still be
-- INSERTing rows with `type` set and interaction_type_id NULL. In a rolling deploy
-- those rows exist for real; dropping the column without re-backfilling would
-- destroy the only record of their type. 0016 omitted this — harmless at n=1,
-- data-destroying at scale. Never omit it again.
--
-- The WHERE guard makes this a no-op when the backfill already ran (the normal
-- case), so it is safe to re-run.
-- ---------------------------------------------------------------------------
UPDATE interactions i
SET interaction_type_id = it.id
FROM interaction_types it
WHERE it.key = i.type
  AND i.interaction_type_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. ASSERT BEFORE DROPPING.
--
-- If any row still lacks a type link, the backfill was not total and dropping
-- `type` would silently orphan it. Fail the migration loudly instead — the whole
-- file is in one transaction, so this rolls back cleanly and leaves the DB on 0017.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    orphans BIGINT;
BEGIN
    SELECT COUNT(*) INTO orphans FROM interactions WHERE interaction_type_id IS NULL;
    IF orphans > 0 THEN
        RAISE EXCEPTION
            'Refusing to drop interactions.type: % row(s) have no interaction_type_id. '
            'The backfill is not total — investigate before contracting.', orphans;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Now that every row is linked, the FK can carry the NOT NULL the old CHECK
--    used to enforce. 0017 had to leave it nullable (the column did not exist for
--    pre-existing rows until its own backfill ran).
-- ---------------------------------------------------------------------------
ALTER TABLE interactions ALTER COLUMN interaction_type_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Drop the legacy surface. DROP COLUMN would cascade the CHECK and the index
--    away on its own, but drop them explicitly first so the intent is legible in
--    the history.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_interactions_type;
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
ALTER TABLE interactions DROP COLUMN type;
