-- =============================================================================
-- Migration 0002 — fix tag uniqueness for V1 (user_id IS NULL)
-- =============================================================================
-- The tags table has UNIQUE (user_id, name), but Postgres treats NULL != NULL
-- in unique constraints, so two tags named "High Point" with user_id=NULL are
-- allowed. This partial index closes that gap for V1.
-- V2 will add a users table + FK + NOT NULL on user_id, at which point the
-- original constraint does the right thing and this index can be dropped.
-- =============================================================================

CREATE UNIQUE INDEX idx_tags_name_no_user
    ON tags (name)
    WHERE user_id IS NULL;
