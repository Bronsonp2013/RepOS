-- =============================================================================
-- Migration 0017 — Interaction Types, PHASE 1 (EXPAND: ADD + SEED + BACKFILL)
-- Segment 3, Commit 2. Authoritative spec: PATHFINDER_SPEC_SEGMENT_3_TYPED_INTERACTIONS.md.
--
-- EXPAND half of an expand/contract refactor. Adds the interaction_types lookup,
-- adds interactions.interaction_type_id + source + appointment_id, and backfills
-- the type link from the legacy interactions.type. Drops NOTHING — the Phase 2
-- CONTRACT (drop CHECK + drop type column + remove dead enums) is migration 0018,
-- sequenced AFTER the surface is proven to have zero live readers of `type`.
--
-- The db-migrate runner (scripts/db-migrate.ts) wraps each file in a single
-- transaction and records schema_migrations on success. This file intentionally
-- omits its own BEGIN/COMMIT.
--
-- Gate G1 fold: the new table carries the nullable, FK-less user_id BIGINT V2
-- stub, like the existing business tables. No FK, no NOT NULL, no data in V1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- interaction_types — seeded, rep-OWNED lookup (the rep freely renames / adds /
-- archives: "Drop-in", "Text", "Market Meeting").
--
-- Unlike meeting_types, this table carries BEHAVIORAL columns, not just a `key`.
-- meeting_types could hide its key because nothing branched on appointments.type;
-- interactions.type IS branched on in two live paths, so each branch becomes a
-- flag here. Without them, a rep-created type would save and display but silently
-- never reset the recency clock:
--   counts_as_visit      -> services/interactions.ts (last_visit_at) +
--                           repositories/accounts.ts (dashboard recency subquery)
--   has_outcome          -> LogInteractionModal (good/neutral/bad radio)
--   is_manually_loggable -> LogInteractionModal (email types come from outreach,
--                           not the manual form)
--
-- `key` remains a stable seed/backfill correspondence ONLY (= the old
-- interactions.type value); rep-created rows have key IS NULL, and it is never
-- shown in the UI.
-- ---------------------------------------------------------------------------
CREATE TABLE interaction_types (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT,                  -- V2 stub (G1)
    key                  TEXT,                    -- seed/backfill correspondence only; NULL for rep-created
    name                 TEXT NOT NULL,
    counts_as_visit      BOOLEAN NOT NULL DEFAULT FALSE,  -- resets the "go see them" recency clock
    has_outcome          BOOLEAN NOT NULL DEFAULT FALSE,  -- offers the good/neutral/bad outcome
    is_manually_loggable BOOLEAN NOT NULL DEFAULT TRUE,   -- appears in the manual log form
    icon                 TEXT,                            -- timeline glyph
    active               BOOLEAN NOT NULL DEFAULT TRUE,   -- archive = FALSE (keeps historical FKs valid)
    sort_order           INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);
-- Unique only among seeded rows; rep-created rows (key NULL) are exempt.
CREATE UNIQUE INDEX idx_interaction_types_key
    ON interaction_types(key) WHERE deleted_at IS NULL AND key IS NOT NULL;
CREATE TRIGGER trg_interaction_types_updated_at BEFORE UPDATE ON interaction_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed. The 5 legacy `type` values are seeded KEYED so the backfill below is a
-- TOTAL function (no existing interaction can orphan) — true by construction, not
-- by luck of the current data. Text + Market Meeting are new rep-facing defaults
-- (build plan, Segment 3.1); they carry no key because no legacy row maps to them.
--
-- D6 (RULED 2026-07-13): only Visit resets the recency clock. A call that makes an
-- unvisited store look tended is the false comfort the triage list exists to strip
-- away; a market meeting is real contact but did not happen at their store. The rep
-- can flip any of these in Settings — the PATCH recomputes last_visit_at, so this is
-- a reversible default, not a one-way door.
--
-- email_sent/email_received have zero rows and zero writers today (Segment 4 builds
-- the outreach ingestion that writes them). They ship is_manually_loggable = FALSE:
-- system-written, rendered on the timeline, never offered in the manual form.
-- Labels + icons preserve the superseded INTERACTION_TYPE_LABELS / TYPE_ICONS
-- constants verbatim, so nothing shifts visually.
-- ---------------------------------------------------------------------------
INSERT INTO interaction_types
    (key, name, counts_as_visit, has_outcome, is_manually_loggable, icon, sort_order) VALUES
    ('visit',          'Visit',          TRUE,  TRUE,  TRUE,  '🏪', 1),
    ('call',           'Call',           FALSE, TRUE,  TRUE,  '📞', 2),
    (NULL,             'Text',           FALSE, FALSE, TRUE,  '💬', 3),
    (NULL,             'Market Meeting', FALSE, TRUE,  TRUE,  '🤝', 4),
    ('note',           'Note',           FALSE, FALSE, TRUE,  '📝', 5),
    ('email_sent',     'Email Sent',     FALSE, FALSE, FALSE, '📤', 6),
    ('email_received', 'Email Received', FALSE, FALSE, FALSE, '📥', 7);

-- ---------------------------------------------------------------------------
-- interactions — new columns.
--
-- interaction_type_id is nullable until 0018 proves the backfill total (it then
-- stays nullable only because the CONTRACT asserts non-NULL rather than relying on
-- a constraint that would block the EXPAND).
--
-- source + appointment_id are cheap now and painful later. `source` gives the
-- deferred Badger import somewhere to land without another migration;
-- appointment_id is what Segment 4's `completed` appointment state links to.
-- ---------------------------------------------------------------------------
ALTER TABLE interactions ADD COLUMN interaction_type_id BIGINT REFERENCES interaction_types(id);
ALTER TABLE interactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'badger_import', 'outreach'));
ALTER TABLE interactions ADD COLUMN appointment_id BIGINT REFERENCES appointments(id);

-- The legacy `type` column must become nullable HERE, in the EXPAND, or the
-- interim state is unwritable.
--
-- The usual expand/contract move is to dual-write both columns until the CONTRACT
-- drops the old one. That is IMPOSSIBLE here: a rep-created type has key IS NULL by
-- design, so there is no legal legacy `type` string to write alongside it — the
-- first "Drop-in" logged between 0017 and 0018 would fail the NOT NULL. So new rows
-- write interaction_type_id ONLY, and `type` goes null-able for the interim.
--
-- The CHECK can stay: in SQL a NULL passes a CHECK (evaluates to unknown, not
-- false), so it keeps constraining the legacy rows it was written for while
-- tolerating the new NULLs. 0018 asserts every row has an interaction_type_id,
-- sets it NOT NULL, and drops `type` + its CHECK together.
ALTER TABLE interactions ALTER COLUMN type DROP NOT NULL;

-- Powers the touchpoint grid (latest interaction per type, per location) without
-- materializing anything, and the recency subquery's counts_as_visit join.
CREATE INDEX idx_interactions_location_type_occurred
    ON interactions(location_id, interaction_type_id, occurred_at DESC)
    WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- BACKFILL — map every interaction's legacy `type` to its seeded interaction_type.
-- Runs over ALL rows (incl. soft-deleted) so none is left with a NULL type link
-- that the old CHECK would have forbidden. Total by construction (every value the
-- old CHECK allowed has a matching seed key above).
-- ---------------------------------------------------------------------------
UPDATE interactions i
SET interaction_type_id = it.id
FROM interaction_types it
WHERE it.key = i.type;

-- ---------------------------------------------------------------------------
-- RIDE-ALONGS — Segment 2 post-review debt, due in "the next migration that
-- touches this area" (PATHFINDER_PUNCHLIST.md). This is it.
-- ---------------------------------------------------------------------------

-- Redundant: the partial unique index (account_id, meeting_type_id) WHERE
-- deleted_at IS NULL has the same leading column and predicate, so it already
-- serves listOverridesForAccount. The 0010 analogue it was copied from was NOT
-- redundant (its unique index is partial on is_primary) — the pattern was copied
-- without its reason. Unused indexes cost writes (CLAUDE.md §6.3).
DROP INDEX IF EXISTS idx_account_mt_overrides_account;

-- Zod (1–480) was the only guard on these; a script or psql writer could store 0 or
-- a negative straight into optimizer dwell math. Precedent for a DB-level guard:
-- appointments_time_valid CHECK (ends_at > starts_at).
ALTER TABLE meeting_types
    ADD CONSTRAINT meeting_types_duration_positive CHECK (default_duration_min > 0);
ALTER TABLE account_meeting_type_overrides
    ADD CONSTRAINT account_mt_overrides_duration_positive CHECK (duration_min > 0);
