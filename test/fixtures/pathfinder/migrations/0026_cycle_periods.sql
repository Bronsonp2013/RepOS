-- =============================================================================
-- Migration 0026 — More cycle cadences: twice-a-year + custom intervals
--
-- Bronson's ask (2026-07-21): the four calendar periods have no "twice a year",
-- and no way to say "every 6 weeks". Two additions:
--
--   'semiannual' — calendar half-years (Jan–Jun / Jul–Dec), key 'yyyy-H1|H2',
--                  same rep-tz boundary rule as the existing periods.
--   'custom'     — every N weeks or months, anchored to the date the cycle was
--                  created (rep-local). Not calendar-aligned: "every 6 weeks"
--                  rolls over 42 days after the anchor, then every 42 days.
--                  The period_key embeds anchor+interval (e.g.
--                  '2026-07-21+6w#3'), so changing the interval or period
--                  yields fresh keys and coverage naturally resets — old rows
--                  simply never match again (same reset-by-key design as 0025).
--
-- The three custom columns move together: all NULL unless period='custom'
-- (enforced by cycles_custom_consistency below) — a custom cycle can never be
-- missing its interval, and a calendar cycle can never carry a stale one.
--
-- The db-migrate runner wraps each file in a single transaction; no BEGIN/COMMIT.
-- =============================================================================

ALTER TABLE cycles DROP CONSTRAINT cycles_period_check;
ALTER TABLE cycles ADD CONSTRAINT cycles_period_check
    CHECK (period IN ('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom'));

-- Interval size. 99 is an arbitrary sanity ceiling, not a product limit.
ALTER TABLE cycles ADD COLUMN custom_every INT
    CHECK (custom_every >= 1 AND custom_every <= 99);
ALTER TABLE cycles ADD COLUMN custom_unit TEXT
    CHECK (custom_unit IN ('weeks', 'months'));
-- The rep-local date the interval counts from. Set server-side at creation (or
-- when a PATCH switches a cycle to custom); never supplied by the client.
ALTER TABLE cycles ADD COLUMN anchored_on DATE;

ALTER TABLE cycles ADD CONSTRAINT cycles_custom_consistency
    CHECK ((period = 'custom') =
           (custom_every IS NOT NULL AND custom_unit IS NOT NULL AND anchored_on IS NOT NULL));
