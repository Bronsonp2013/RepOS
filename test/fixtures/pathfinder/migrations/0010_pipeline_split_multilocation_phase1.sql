-- =============================================================================
-- Migration 0010 — Pipeline split + multi-location, PHASE 1 (ADD + BACKFILL)
-- Segment 1, Commit 1. Authoritative spec: PATHFINDER_SPEC_PIPELINE_SPLIT.md.
--
-- This is the EXPAND half of an expand/contract refactor. It ONLY adds tables
-- and an accounts.account_stage_id column, then backfills them. It drops
-- NOTHING. The Phase 2 DROP of the legacy accounts address/geo/pipeline_stage
-- columns is a separate, later migration deliberately sequenced AFTER every
-- reader has been repointed onto account_locations (Session 2), so the running
-- app never queries a column that no longer exists.
--
-- The db-migrate runner (scripts/db-migrate.ts) wraps each file in a single
-- transaction and records schema_migrations on success. This file therefore
-- intentionally omits its own BEGIN/COMMIT — an inner COMMIT would close the
-- runner's transaction early and split the DDL from its tracking insert.
--
-- Gate G1 fold (ratified): every new table carries the same nullable, FK-less
-- user_id BIGINT V2 stub as the existing 11 business tables. No FK, no NOT NULL,
-- no data written into it in V1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Stage lookup tables (D1: seeded, read-only UI in V1. No enums, no CHECK on
-- stage — the seed rows ARE the allowed set.)
-- ---------------------------------------------------------------------------
CREATE TABLE account_stages (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                 -- V2 stub (G1); stages may go rep-configurable
    key         TEXT NOT NULL,
    label       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_account_stages_key ON account_stages(key) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_account_stages_updated_at BEFORE UPDATE ON account_stages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE prospect_stages (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                 -- V2 stub (G1)
    key         TEXT NOT NULL,
    label       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_prospect_stages_key ON prospect_stages(key) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_prospect_stages_updated_at BEFORE UPDATE ON prospect_stages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seeds — canon two-pipeline model (PATHFINDER_CANON.md "Two-pipeline model").
INSERT INTO account_stages (key, label, sort_order) VALUES
    ('active',         'Active',          1),
    ('needs_followup', 'Needs Follow-up', 2),
    ('dormant',        'Dormant',         3),
    ('lost',           'Lost',            4);

INSERT INTO prospect_stages (key, label, sort_order) VALUES
    ('researched',  'Researched',  1),
    ('contacted',   'Contacted',   2),
    ('engaged',     'Engaged',     3),
    ('meeting_set', 'Meeting Set', 4),
    ('presented',   'Presented',   5),
    ('won',         'Won',         6),
    ('lost',        'Lost',        7);

-- ---------------------------------------------------------------------------
-- prospects (D2: single address on the prospect row. Graduation to Won creates
-- an account + its primary account_locations row from this address/geo.)
-- Starts EMPTY in V1 — prospects arrive only via seed/graduation this segment
-- (manual entry UI is Segment 7). Column names (geo/postal_code) follow the
-- spec and match account_locations below for new-world consistency.
-- ---------------------------------------------------------------------------
CREATE TABLE prospects (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT,               -- V2 stub (G1)
    company_name      TEXT NOT NULL,
    contact_name      TEXT,
    contact_email     TEXT,
    contact_phone     TEXT,
    address_line1     TEXT,
    address_line2     TEXT,
    city              TEXT,
    state             TEXT,
    postal_code       TEXT,
    geo               GEOGRAPHY(POINT, 4326),          -- nullable until geocode
    prospect_stage_id BIGINT NOT NULL REFERENCES prospect_stages(id),
    notes             TEXT,
    archived_at       TIMESTAMPTZ,          -- set on Lost / post-graduation; row retained
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
-- Default stage (Researched) is resolved in app code at insert time, not as a
-- column DEFAULT — a subquery default isn't allowed and hardcoding id=1 is brittle.
CREATE INDEX idx_prospects_stage  ON prospects(prospect_stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prospects_geo    ON prospects USING GIST(geo)     WHERE deleted_at IS NULL;
-- Serves the map's "active prospects" filter (archived hidden by default, Commit 6).
CREATE INDEX idx_prospects_active ON prospects(archived_at)        WHERE deleted_at IS NULL;
CREATE TRIGGER trg_prospects_updated_at BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- account_locations (D2/D3: one physical location per row; recency ties here in
-- Session 2. geo is NULLABLE — 5 legacy accounts have no geocode, and the Phase 1
-- invariant is COUNT(account_locations)==COUNT(accounts), so a geo-less account
-- still gets its (geo-NULL) primary row.)
-- ---------------------------------------------------------------------------
CREATE TABLE account_locations (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT,                  -- V2 stub (G1)
    account_id     BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    label          TEXT,                    -- nullable; UI falls back to city
    address_line1  TEXT,
    address_line2  TEXT,
    city           TEXT,
    state          TEXT,
    postal_code    TEXT,
    geo            GEOGRAPHY(POINT, 4326),
    is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
-- Exactly one primary per (non-deleted) account — spec's partial unique index.
CREATE UNIQUE INDEX idx_account_locations_one_primary
    ON account_locations(account_id) WHERE is_primary AND deleted_at IS NULL;
CREATE INDEX idx_account_locations_account ON account_locations(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_account_locations_geo     ON account_locations USING GIST(geo) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_account_locations_updated_at BEFORE UPDATE ON account_locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- accounts.account_stage_id — nullable for now (app doesn't write it yet; the
-- old pipeline_stage column stays authoritative until Phase 2 drops it). NOT
-- NULL can be added once writers exist.
-- ---------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN account_stage_id BIGINT REFERENCES account_stages(id);

-- ---------------------------------------------------------------------------
-- BACKFILL 1 — one primary account_locations row per LIVE account, address +
-- geo copied verbatim, label NULL. (All 126 accounts are non-deleted, so this
-- yields the COUNT(account_locations)==COUNT(accounts) invariant exactly.)
-- Legacy accounts.zip maps to account_locations.postal_code.
-- ---------------------------------------------------------------------------
INSERT INTO account_locations
    (account_id, label, address_line1, address_line2, city, state, postal_code, geo, is_primary)
SELECT id, NULL, address_line1, address_line2, city, state, zip, location, TRUE
FROM accounts
WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- BACKFILL 2 — account_stage_id from the legacy (superseded) flat pipeline.
-- Stage is a read-only badge in V1; the dashboard sorts by recency, not stage,
-- so this mapping does not affect ordering. Present in data today:
--   prospect(122), active_account(3), needs_followup(1).
-- Total mapping over all 8 legacy values (defensive against unseen values):
--   needs_followup -> needs_followup
--   not_interested -> lost
--   everything else (prospect / outreach_sent / engaged / appointment_set /
--                    presentation_done / active_account) -> active
-- Backfills ALL rows (incl. any soft-deleted) so no account ever has NULL stage.
-- ---------------------------------------------------------------------------
UPDATE accounts a
SET account_stage_id = s.id
FROM account_stages s
WHERE s.key = CASE a.pipeline_stage
                 WHEN 'needs_followup' THEN 'needs_followup'
                 WHEN 'not_interested' THEN 'lost'
                 ELSE 'active'
             END;
