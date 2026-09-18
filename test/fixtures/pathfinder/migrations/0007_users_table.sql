-- =============================================================================
-- Migration 0007 — users table (V1 seed row + timezone foundation)
-- =============================================================================
-- Creates the users table that V2 multi-tenancy will hang foreign keys off of.
-- V1 has exactly one row (Bronson). The timezone column stores the rep's home
-- timezone (IANA name), used as the reference for trip day-boundaries and
-- appointment display. Default is 'America/Chicago' (Dallas).
--
-- The user_id stub columns on business tables remain nullable / FK-less in V1;
-- V2 will backfill them and add the FK + NOT NULL constraint.
-- =============================================================================

BEGIN;

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       CITEXT NOT NULL UNIQUE,
    timezone    TEXT NOT NULL DEFAULT 'America/Chicago',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- V1 seed: Bronson's single-user row.
INSERT INTO users (email, timezone)
VALUES ('bronsonprachyl@gmail.com', 'America/Chicago');

COMMIT;
