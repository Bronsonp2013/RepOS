-- =============================================================================
-- Migration 0027 — Per-cycle membership: remove/re-add a client's location
--
-- Bronson's ask (2026-07-21): manage who is IN a cycle from the account page.
-- The ratified Segment 6 scope was "every active account_location"; that stays
-- the DEFAULT — membership is subtractive. A cycle_exclusions row means "this
-- location does not participate in this cycle": it leaves the denominator, the
-- detail list, and the account-page panel shows it as removed. Re-adding
-- soft-deletes the exclusion row.
--
-- Subtractive (an exclusions table) rather than additive (a memberships table)
-- because the default must remain "the whole book": a NEW location joins every
-- cycle automatically, which an additive model would silently break the day an
-- account is added after the cycle was created.
--
-- Coverage rows for an excluded location are NOT deleted — exclusion is a lens
-- on the current state, not history surgery. Re-adding a location mid-period
-- restores any coverage it already had this period (the rows never left).
--
-- The db-migrate runner wraps each file in a single transaction; no BEGIN/COMMIT.
-- =============================================================================

CREATE TABLE cycle_exclusions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,               -- V2 stub
    cycle_id    BIGINT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES account_locations(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- One live exclusion per (cycle, location); partial so re-add → re-remove can
-- insert a fresh row beside the dead one (same pattern as idx_cycle_progress_unique).
-- Also serves the "is this location excluded from this cycle" point lookup and the
-- per-cycle excluded-count rollup (leftmost column).
CREATE UNIQUE INDEX idx_cycle_exclusions_unique
    ON cycle_exclusions(cycle_id, location_id) WHERE deleted_at IS NULL;
-- Serves the account-page panel: all exclusions for one account's locations.
CREATE INDEX idx_cycle_exclusions_location
    ON cycle_exclusions(location_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_cycle_exclusions_updated_at BEFORE UPDATE ON cycle_exclusions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
