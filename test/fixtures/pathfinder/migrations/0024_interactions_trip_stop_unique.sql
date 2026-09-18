-- =============================================================================
-- Migration 0024 — Make "one live visit per trip stop" a DATABASE guarantee.
--
-- The application-level guard in logStopVisit was a SELECT ... FOR UPDATE on the
-- stop's interactions — but FOR UPDATE on a query that matches ZERO rows locks
-- nothing (Postgres has no predicate locking at READ COMMITTED). Two taps racing
-- from a flaky mobile connection each see no rows, each insert, both commit:
-- one stop, two live visits, and the undo path soft-deletes both. The index from
-- 0020 was deliberately shaped for this invariant (partial on live rows) but was
-- created as a plain INDEX, so it documented the invariant without enforcing it.
--
-- The db-migrate runner wraps each file in a transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Dedupe any double-logged visits the race already produced. Keep the FIRST
--    interaction per stop (lowest id — the tap that "won") and soft-delete the
--    rest; soft rather than hard so nothing is unrecoverable if this ruling is
--    ever wrong. Without this, the unique index below could fail to build.
-- ---------------------------------------------------------------------------
WITH dupes AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY trip_stop_id ORDER BY id) AS rn
    FROM interactions
    WHERE trip_stop_id IS NOT NULL AND deleted_at IS NULL
)
UPDATE interactions SET deleted_at = NOW()
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Soft-deleting an interaction can strand accounts.last_visit_at on the removed
-- row's timestamp. Recompute from live rows — same semantics as
-- recomputeAccountLastVisit() in packages/db (kept in sync by hand; the migration
-- cannot call app code). Cheap at V1 scale (~126 accounts), so recompute all.
UPDATE accounts a SET last_visit_at = (
    SELECT MAX(i.occurred_at) FROM interactions i
    JOIN interaction_types it ON it.id = i.interaction_type_id
    WHERE i.account_id = a.id AND it.counts_as_visit AND i.deleted_at IS NULL
)
WHERE a.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Replace the plain index with a UNIQUE one. Same name, same shape, same
--    query it serves (the derived visit_logged EXISTS per stop) — it now also
--    closes the race: the second racing INSERT fails with 23505, which
--    logStopVisit maps to the same friendly "already logged" 400.
-- ---------------------------------------------------------------------------
DROP INDEX idx_interactions_trip_stop;
CREATE UNIQUE INDEX idx_interactions_trip_stop
    ON interactions(trip_stop_id) WHERE deleted_at IS NULL AND trip_stop_id IS NOT NULL;
