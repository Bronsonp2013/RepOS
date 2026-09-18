-- =============================================================================
-- Migration 0013 — Segment 1, Commit 8.5 Stage A: drop accounts.location
-- The GEOMETRY column is fully superseded — all geometry moved to
-- account_locations.geo in Commits 4-7 (map, trips, optimizer, recency) and the
-- geocode writer + batch script are repointed (Commit 6 / 8.5). A fresh reader
-- grep shows zero live readers of accounts.location (only explanatory comments).
--
-- NOT dropped here: the address-text columns (address_line1/2, city, state, zip,
-- country) and pipeline_stage. Those still back the editable account surface +
-- geocode input and are dropped in Stage B (the account editing-surface
-- migration, first task after segment close). See PATHFINDER_SPEC_PIPELINE_SPLIT.md.
--
-- The db-migrate runner wraps each file in one transaction; no BEGIN/COMMIT here.
-- =============================================================================

DROP INDEX IF EXISTS idx_accounts_location;
ALTER TABLE accounts DROP COLUMN location;
