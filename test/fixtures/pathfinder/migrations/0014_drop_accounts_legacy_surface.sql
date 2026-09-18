-- =============================================================================
-- Migration 0014 — Stage B/B4: drop the legacy accounts editable-surface columns
-- The account editing surface migrated across Stage B: address (line1/2, city,
-- state, zip) → account_locations (B1 reads, B2 writes, B3.5 scripts); stage →
-- account_stage_id / account_stages (B3). A fresh reader/writer grep shows zero
-- live references to these columns (only explanatory comments remain), and the
-- B2 stage dual-write collapsed to account_stage_id-only in B3.
--
-- country is NOT migrated to a column — it was invariant 'US' across all rows and
-- V1 is US-territory-only, so toDetail now returns the 'US' constant (a display
-- fallback, not rep-variable data). See PATHFINDER_PUNCHLIST.md for the recorded
-- exit if international ever enters scope.
--
-- The pipeline_stage CHECK constraint drops automatically with its column.
-- The db-migrate runner wraps each file in one transaction; no BEGIN/COMMIT here.
-- =============================================================================

DROP INDEX IF EXISTS idx_accounts_stage;

ALTER TABLE accounts
  DROP COLUMN pipeline_stage,
  DROP COLUMN address_line1,
  DROP COLUMN address_line2,
  DROP COLUMN city,
  DROP COLUMN state,
  DROP COLUMN zip,
  DROP COLUMN country;
