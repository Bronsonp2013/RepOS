-- Star / key-account flag on accounts (M4 dashboard).
-- A per-account manual boolean the rep sets to mark a key account. It is a
-- BADGE only: it renders a star on dashboard recency rows but does NOT affect
-- recency sort order (sort stays pure last_visit_at). Default off; rep-set.

BEGIN;

ALTER TABLE accounts ADD COLUMN is_key_account BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
