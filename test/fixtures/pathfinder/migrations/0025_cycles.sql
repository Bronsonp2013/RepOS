-- =============================================================================
-- Migration 0025 — Cycles (Segment 6; renumbered from 0024 at merge)
--
-- Recurring per-location coverage goals ("Catalog refresh, every quarter"). A cycle
-- is rep-created (no seed); a cycle_progress row is a single location marked covered
-- for one period. The denominator (all active locations) is computed live from
-- account_locations — cycle_progress is NOT pre-populated per period, so nothing has
-- to backfill when a period rolls over: a new period simply has no progress rows yet.
--
-- Decisions (ratified with Bronson, 2026-07-16):
--   D9 completion  -> MANUAL one-tap (a visit is not proof the cycle task happened).
--   scope          -> every active account_location ("cover my whole book").
--   period         -> calendar periods, reset on the boundary in the rep's timezone.
--
-- The db-migrate runner wraps each file in a single transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- cycles — the recurring goal itself. `period` is a CHECK-enum (not a Postgres
-- ENUM — easier to alter, §6.2). user_id is the FK-less V2 multi-tenant stub.
-- ---------------------------------------------------------------------------
CREATE TABLE cycles (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                  -- V2 stub
    name        TEXT NOT NULL,
    period      TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    active      BOOLEAN NOT NULL DEFAULT TRUE,  -- archive = FALSE (keeps historical progress FKs valid)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- cycle_progress — one row = one location marked covered for one period.
--   period_key is an OPAQUE bucket id computed in the rep's home timezone
--     (e.g. '2026-Q3', '2026-07', '2026-W29', '2026'); its only contract is that
--     it is stable and distinct per period. Computed by cyclePeriodKey() in
--     packages/shared, never in SQL, so the tz rule lives in one place.
--   interaction_id is optional provenance (the visit that prompted the tap); a
--     deleted interaction must NOT delete the coverage record, hence SET NULL
--     (same choice as 0023 for interactions.trip_stop_id).
-- ---------------------------------------------------------------------------
CREATE TABLE cycle_progress (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT,               -- V2 stub
    cycle_id       BIGINT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    location_id    BIGINT NOT NULL REFERENCES account_locations(id) ON DELETE CASCADE,
    period_key     TEXT NOT NULL,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interaction_id BIGINT REFERENCES interactions(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
-- One live completion per (cycle, location, period) — a second tap in the same period
-- is a no-op, not a duplicate. Partial on deleted_at so an un-marked-then-re-marked
-- location can insert a fresh row.
CREATE UNIQUE INDEX idx_cycle_progress_unique
    ON cycle_progress(cycle_id, location_id, period_key) WHERE deleted_at IS NULL;
-- Serves the per-period rollup (count covered for cycle X in period P).
CREATE INDEX idx_cycle_progress_period
    ON cycle_progress(cycle_id, period_key) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_cycle_progress_updated_at BEFORE UPDATE ON cycle_progress
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
