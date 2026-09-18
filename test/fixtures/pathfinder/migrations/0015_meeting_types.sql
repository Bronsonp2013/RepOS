-- =============================================================================
-- Migration 0015 — Meeting Types, PHASE 1 (EXPAND: ADD + SEED + BACKFILL)
-- Segment 2, Commit 2. Authoritative spec: PATHFINDER_SPEC_SEGMENT_2_MEETING_TYPES.md.
--
-- EXPAND half of an expand/contract refactor. Adds the meeting_types lookup +
-- per-account overrides, adds appointments.meeting_type_id, and backfills it
-- from the legacy appointments.type. Drops NOTHING — the Phase 2 CONTRACT
-- (drop CHECK + drop type column + remove dead enums) is migration 0016,
-- sequenced AFTER the surface is proven to have zero live readers of `type`.
--
-- The db-migrate runner (scripts/db-migrate.ts) wraps each file in a single
-- transaction and records schema_migrations on success. This file intentionally
-- omits its own BEGIN/COMMIT.
--
-- Gate G1 fold: every new table carries the nullable, FK-less user_id BIGINT
-- V2 stub, like the existing business tables. No FK, no NOT NULL, no data in V1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- meeting_types — seeded, rep-OWNED lookup (unlike account_stages which is
-- read-only in V1, the rep freely renames / re-durations / archives / adds).
-- `key` is a stable seed/backfill correspondence ONLY (= the old
-- appointments.type value); rep-created rows have key IS NULL and it is never
-- shown in the UI. Durations here are DEFAULTS/proposals — a confirmed
-- appointment's dwell is its explicit window (ends_at - starts_at), never this.
-- ---------------------------------------------------------------------------
CREATE TABLE meeting_types (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT,                  -- V2 stub (G1)
    key                  TEXT,                    -- seed/backfill correspondence only; NULL for rep-created
    name                 TEXT NOT NULL,
    default_duration_min INTEGER NOT NULL,
    email_template       TEXT,                    -- inline (D5); one template per type
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order           INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);
-- Unique only among seeded rows; rep-created rows (key NULL) are exempt.
CREATE UNIQUE INDEX idx_meeting_types_key
    ON meeting_types(key) WHERE deleted_at IS NULL AND key IS NOT NULL;
CREATE TRIGGER trg_meeting_types_updated_at BEFORE UPDATE ON meeting_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- account_meeting_type_overrides — per-account duration override for a type.
-- ---------------------------------------------------------------------------
CREATE TABLE account_meeting_type_overrides (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                       -- V2 stub (G1)
    account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meeting_type_id BIGINT NOT NULL REFERENCES meeting_types(id),
    duration_min    INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
-- One live override per (account, type).
CREATE UNIQUE INDEX idx_account_mt_overrides_unique
    ON account_meeting_type_overrides(account_id, meeting_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_account_mt_overrides_account
    ON account_meeting_type_overrides(account_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_account_mt_overrides_updated_at BEFORE UPDATE ON account_meeting_type_overrides
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed — the 5 existing appointment-type values, keyed by the old `type` string
-- so the backfill below is a TOTAL function (no existing appointment can orphan).
-- Labels/durations preserve the superseded enums.ts constants verbatim, so no
-- existing semantics shift. These are rep-editable defaults; the rep adds
-- e.g. "Catalog drop" / "Service call" from Settings.
-- ---------------------------------------------------------------------------
INSERT INTO meeting_types (key, name, default_duration_min, sort_order) VALUES
    ('prospecting',         'New Prospecting',     30, 1),
    ('presentation',        'Presentation',        90, 2),
    ('checkin',             'Check-in',            20, 3),
    ('training',            'Training',            60, 4),
    ('updating_sales_aids', 'Updating Sales Aids', 30, 5);

-- ---------------------------------------------------------------------------
-- appointments.meeting_type_id — nullable for now (no in-app appointment
-- creation until Segment 4, so nothing guarantees a value on new rows yet).
-- Segment 4 may tighten to NOT NULL once the creation flow can supply one.
-- ---------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN meeting_type_id BIGINT REFERENCES meeting_types(id);

-- ---------------------------------------------------------------------------
-- BACKFILL — map every appointment's legacy `type` to its seeded meeting_type.
-- Runs over ALL rows (incl. soft-deleted) so none is left with a NULL type link
-- that the old CHECK would have forbidden. Total by construction (every allowed
-- `type` value has a matching seed key above).
-- ---------------------------------------------------------------------------
UPDATE appointments a
SET meeting_type_id = mt.id
FROM meeting_types mt
WHERE mt.key = a.type;
