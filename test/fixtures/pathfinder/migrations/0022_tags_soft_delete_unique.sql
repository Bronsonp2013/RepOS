-- =============================================================================
-- Migration 0022 — close the tag soft-delete resurrection trap.
--
-- 0002 added idx_tags_name_no_user UNIQUE (name) WHERE user_id IS NULL to make
-- tag names unique in V1 (the table's UNIQUE (user_id, name) never fires while
-- user_id is NULL, because NULL != NULL). But that index does not filter
-- deleted_at, so it also arbitrates over SOFT-DELETED rows. The result:
--
--   INSERT INTO tags (name) VALUES ('X');            -- id 13
--   UPDATE tags SET deleted_at = NOW() WHERE id = 13; -- user deletes the tag
--   -- user re-adds a tag named 'X'. findOrCreateTag's live-row SELECT correctly
--   -- finds nothing, so it falls through to its upsert, which conflicts against
--   -- the TOMBSTONE and hands back a row that is still deleted:
--   INSERT INTO tags (name) VALUES ('X')
--     ON CONFLICT (name) WHERE user_id IS NULL DO UPDATE SET name = EXCLUDED.name
--     RETURNING *;                                   -- id 13, deleted_at SET
--
-- The caller (apps/api routes/accounts.ts) then attaches the account to tag 13,
-- which every read path hides (listTags/getAccountTags filter deleted_at IS NULL).
-- The tag silently never appears: a 200 response and no tag. A deleted name is
-- also permanently unusable — nothing can ever re-create it.
--
-- Fix: scope the uniqueness to LIVE rows only. Tombstones no longer arbitrate,
-- so re-adding a deleted name inserts a fresh live tag. Deleting a tag and
-- re-creating it by the same name yields a NEW tag with no stale account links
-- (deliberately not a resurrect-in-place: silently re-attaching a tag to every
-- account it was on before it was deleted is a data surprise, not a feature).
--
-- The schema.sql comment said "fix the index before building tag delete". No tag
-- delete UI exists yet, so this is preventative — the trap can no longer be sprung.
--
-- Widening only: the new predicate is a strict subset of the old one, so any row
-- set legal before is still legal. Cannot fail on existing data.
--
-- V2 note: when user_id becomes NOT NULL, the table-level UNIQUE (user_id, name)
-- constraint starts arbitrating and carries this SAME bug (it does not filter
-- deleted_at). V2 must replace it with a partial index that does.
-- =============================================================================

DROP INDEX IF EXISTS idx_tags_name_no_user;

-- Serves findOrCreateTag: uniqueness of a tag name among LIVE, unowned (V1) tags,
-- and the ON CONFLICT arbiter for its upsert.
CREATE UNIQUE INDEX idx_tags_name_no_user_live
    ON tags (name)
    WHERE user_id IS NULL AND deleted_at IS NULL;
