-- =============================================================================
-- Migration 0028 — make sync_state uniqueness real in V1 (user_id IS NULL).
--
-- sync_state has UNIQUE (user_id, kind), but Postgres treats NULL != NULL in
-- unique constraints, so the constraint never arbitrates while user_id is NULL —
-- and in V1 user_id is ALWAYS NULL (the V2 multi-tenant stub, CLAUDE.md §6.2).
-- Two 'gmail_history_id' rows could coexist and there is no ON CONFLICT arbiter
-- for an upsert to target. Same trap 0002 closed for tags.
--
-- No code reads or writes sync_state yet (it awaits Segment 4 Gmail/calendar
-- sync), so this lands before the first writer can ever race itself.
--
-- sync_state has no deleted_at column, so unlike 0022 there is no soft-delete
-- predicate — this mirrors 0002's simpler shape.
--
-- LOCKSTEP (per the discipline in packages/db/src/repositories/tags.ts): the
-- Segment-4 sync writer's upsert MUST arbitrate on exactly this index:
--
--   INSERT INTO sync_state (kind, value) VALUES ($1, $2)
--   ON CONFLICT (kind) WHERE user_id IS NULL
--   DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
--
-- V2 note: when user_id becomes NOT NULL, the table-level UNIQUE (user_id, kind)
-- starts arbitrating and this index should be dropped in that migration.
-- =============================================================================

-- Serves the future Segment-4 sync upsert: one live value per kind among
-- unowned (V1) rows, and the ON CONFLICT arbiter for that upsert.
CREATE UNIQUE INDEX idx_sync_state_kind_no_user
    ON sync_state (kind)
    WHERE user_id IS NULL;
