-- =============================================================================
-- Migration 0019 — Interaction Types: post-review guards
-- Segment 3, post-review remediation. Both items came out of the 5-agent review of
-- the Segment 3 diff.
--
-- The db-migrate runner wraps each file in a transaction; no BEGIN/COMMIT here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop idx_interactions_location — now redundant.
--
-- 0011 created `idx_interactions_location ON interactions(location_id) WHERE
-- deleted_at IS NULL`. 0017 then created
-- `idx_interactions_location_type_occurred ON interactions(location_id,
-- interaction_type_id, occurred_at DESC) WHERE deleted_at IS NULL` — same leading
-- column, same partial predicate. A composite b-tree serves every plan its own
-- prefix can, so the single-column index is now dead weight on the app's hottest
-- write path (every visit, call, note, and — from Segment 4 — every outreach send
-- and reply pays to maintain it).
--
-- Noted with some embarrassment: 0017 dropped idx_account_mt_overrides_account for
-- exactly this reason, quoting §6.3, and created this redundancy in the same file.
-- Adding an index is not free; check what its prefix already covers.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_interactions_location;

-- ---------------------------------------------------------------------------
-- 2. Unique interaction-type names (case-insensitive).
--
-- The retired enum guaranteed a closed set of distinct types. The lookup replaced
-- that guarantee with nothing, and the gap has teeth: the rep archives the seeded
-- "Visit" (or simply doesn't see it — archived rows are hidden unless "Show
-- archived" is ticked), creates a new type also called "Visit", and leaves
-- "Counts as a visit" unchecked, because the create form defaults it to FALSE.
-- Every visit logged from then on writes against the non-counting "Visit":
-- last_visit_at never advances, and the dashboard keeps sending the rep back to
-- stores he just walked out of. Silent, and it corrupts the one number the triage
-- list is built on.
--
-- Scoped to `deleted_at IS NULL`, NOT to `active` — an archived type still shows in
-- history and in the archived list, so its name is still taken. Lowercased so
-- "visit" cannot shadow "Visit".
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX idx_interaction_types_name_unique
    ON interaction_types (LOWER(name)) WHERE deleted_at IS NULL;
