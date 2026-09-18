-- =============================================================================
-- seed-graham.sql — RepOS test fixture: one account with an upcoming trip.
-- Vendored fixture data, not a Pathfinder migration. Apply after load.sh has
-- run all migrations. Idempotent: safe to re-run against a freshly loaded DB.
--
-- Fixture shape (see docs/REPOS_V1.md §7 acceptance criteria):
--   - users id 1: bronsonprachyl@gmail.com, America/Chicago (0007 already
--     seeds this row; the insert below is a no-op guard in case it doesn't).
--   - accounts id 48: "Graham Interiors", designer, stage 'active'.
--   - account_locations: its primary location, Dallas TX, geo NULL (no
--     geocoder in this fixture).
--   - appointments id 1: account 48, 2026-07-08 19:00-20:00 UTC
--     (= 2:00-3:00 PM America/Chicago, CDT), meeting_type 'presentation'.
--   - trips id 1: starts 2026-07-08.
--   - trip_stops id 1: trip 1, account 48, stop_date 2026-07-08, anchored to
--     appointment 1, at account 48's primary location.
--   - accounts id 49, 50: "TEST — ..." retail accounts, each with a primary
--     account_locations row, for the needsVisit NULLS FIRST ordering test.
--     49 was visited earlier (2026-01-15) than 50 (2026-06-20), so the
--     worst-first order for the top three is 48 (never visited), 49, 50.
--   - cycles id 1: one active monthly cycle. Its period_key for the fixed
--     test `now` (2026-07-01T12:00:00Z, America/Chicago) is '2026-07'.
--   - cycle_progress id 1: cycle 1 covers account 48's primary location for
--     period_key '2026-07'.
--   - cycle_exclusions id 1: cycle 1 excludes account 49's primary location,
--     so it counts toward neither eligible nor covered.
--   - prospects id 1, 2: two live prospects, lexington DB only (the venture
--     DB is never seeded — it stays the empty-instance fixture).
--   - account 51: soft-deleted, with a trip_stop on trip 1 (sequence 2) —
--     proves upcomingTrips' accounts JOIN drops a soft-deleted account's stop
--     entirely rather than surfacing it with stale data (F2).
--   - account 52: live, stage 'dormant' (not 'active'), never visited, no
--     location — proves needsVisit surfaces a non-active-stage account the
--     same as an active one (F7); it sorts second (NULLS FIRST, then by name,
--     "Graham Interiors" < "TEST — ...").
--   - account 53: live, one primary location, excluded from cycle 1 so its
--     existing eligible/covered counts are unaffected; it is the sole
--     eligible location for cycles 2 and 3 below (F1).
--   - prospect_stages id 8: soft-deleted, with prospect id 3 pointed at it —
--     proves totals.prospectsInPipeline (no stage-liveness filter) counts a
--     prospect that pipeline.ts's stage-grouped breakdown silently drops (F4).
--   - cycles id 2 (weekly), id 3 (custom, anchored 2026-06-01, every 2 weeks):
--     both exclude every location except account 53's, so eligible=1,
--     covered=0 for each — proves the weekly/custom period_key branches
--     (untested previously; only cycle 1's 'monthly' branch was) (F1).
-- =============================================================================

BEGIN;

-- users (0007 already inserts id 1; this is a defensive no-op if it didn't).
INSERT INTO users (id, email, timezone)
OVERRIDING SYSTEM VALUE
VALUES (1, 'bronsonprachyl@gmail.com', 'America/Chicago')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));

-- accounts id 48
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at)
OVERRIDING SYSTEM VALUE
VALUES (
    48,
    'Graham Interiors',
    'designer',
    (SELECT id FROM account_stages WHERE key = 'active'),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT MAX(id) FROM accounts));

-- account_locations: primary location for account 48
INSERT INTO account_locations (account_id, label, city, state, geo, is_primary)
SELECT 48, NULL, 'Dallas', 'TX', NULL, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM account_locations WHERE account_id = 48 AND is_primary
);

-- appointments id 1
INSERT INTO appointments (
    id, account_id, title, starts_at, ends_at, meeting_type_id
)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    48,
    'TEST — Graham Interiors line presentation',
    '2026-07-08T19:00:00Z',
    '2026-07-08T20:00:00Z',
    (SELECT id FROM meeting_types WHERE key = 'presentation')
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('appointments', 'id'), (SELECT MAX(id) FROM appointments));

-- trips id 1, starting 2026-07-08
INSERT INTO trips (id, name, start_date, end_date)
OVERRIDING SYSTEM VALUE
VALUES (1, 'TEST — Graham Interiors trip', '2026-07-08', '2026-07-08')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('trips', 'id'), (SELECT MAX(id) FROM trips));

-- trip_stops id 1: account 48 on 2026-07-08, anchored to appointment 1
INSERT INTO trip_stops (
    id, trip_id, account_id, appointment_id, stop_date, sequence, location_id
)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    1,
    48,
    1,
    '2026-07-08',
    1,
    (SELECT id FROM account_locations WHERE account_id = 48 AND is_primary)
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('trip_stops', 'id'), (SELECT MAX(id) FROM trip_stops));

-- accounts id 49, 50: visited at different ages, for the needsVisit
-- NULLS FIRST ordering test (account 48 stays first, never visited).
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at, last_visit_at)
OVERRIDING SYSTEM VALUE
VALUES (
    49,
    'TEST — Needs Visit Older',
    'retail',
    (SELECT id FROM account_stages WHERE key = 'active'),
    NOW(),
    '2026-01-15T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at, last_visit_at)
OVERRIDING SYSTEM VALUE
VALUES (
    50,
    'TEST — Needs Visit Newer',
    'retail',
    (SELECT id FROM account_stages WHERE key = 'active'),
    NOW(),
    '2026-06-20T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT MAX(id) FROM accounts));

-- account_locations: primary locations for accounts 49, 50
INSERT INTO account_locations (account_id, label, city, state, geo, is_primary)
SELECT 49, NULL, 'Austin', 'TX', NULL, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM account_locations WHERE account_id = 49 AND is_primary
);
INSERT INTO account_locations (account_id, label, city, state, geo, is_primary)
SELECT 50, NULL, 'Houston', 'TX', NULL, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM account_locations WHERE account_id = 50 AND is_primary
);

-- cycles id 1: one active monthly cycle
INSERT INTO cycles (id, name, period, active)
OVERRIDING SYSTEM VALUE
VALUES (1, 'TEST — Coverage cycle', 'monthly', TRUE)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('cycles', 'id'), (SELECT MAX(id) FROM cycles));

-- cycle_progress id 1: cycle 1 covers account 48's primary location for the
-- current period ('2026-07', per cyclePeriodKey at the fixed test `now`).
INSERT INTO cycle_progress (id, cycle_id, location_id, period_key)
OVERRIDING SYSTEM VALUE
SELECT 1, 1, al.id, '2026-07'
FROM account_locations al
WHERE al.account_id = 48 AND al.is_primary
ON CONFLICT (cycle_id, location_id, period_key) WHERE deleted_at IS NULL DO NOTHING;
SELECT setval(pg_get_serial_sequence('cycle_progress', 'id'), (SELECT MAX(id) FROM cycle_progress));

-- cycle_exclusions id 1: cycle 1 excludes account 49's primary location
INSERT INTO cycle_exclusions (id, cycle_id, location_id)
OVERRIDING SYSTEM VALUE
SELECT 1, 1, al.id
FROM account_locations al
WHERE al.account_id = 49 AND al.is_primary
ON CONFLICT (cycle_id, location_id) WHERE deleted_at IS NULL DO NOTHING;
SELECT setval(pg_get_serial_sequence('cycle_exclusions', 'id'), (SELECT MAX(id) FROM cycle_exclusions));

-- prospects id 1, 2: lexington DB only (the venture DB is never seeded)
INSERT INTO prospects (id, company_name, city, state, prospect_stage_id)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    'TEST — Prospect One',
    'Dallas',
    'TX',
    (SELECT id FROM prospect_stages WHERE key = 'researched')
)
ON CONFLICT (id) DO NOTHING;
INSERT INTO prospects (id, company_name, city, state, prospect_stage_id)
OVERRIDING SYSTEM VALUE
VALUES (
    2,
    'TEST — Prospect Two',
    'Fort Worth',
    'TX',
    (SELECT id FROM prospect_stages WHERE key = 'contacted')
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('prospects', 'id'), (SELECT MAX(id) FROM prospects));

-- account 51: soft-deleted, with a trip_stop on trip 1 (F2 — soft-deleted
-- account stops must not appear in upcomingTrips).
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at, deleted_at)
OVERRIDING SYSTEM VALUE
VALUES (
    51,
    'TEST — Soft-deleted Account',
    'retail',
    (SELECT id FROM account_stages WHERE key = 'active'),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO account_locations (account_id, label, city, state, geo, is_primary)
SELECT 51, NULL, 'Plano', 'TX', NULL, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM account_locations WHERE account_id = 51 AND is_primary
);

INSERT INTO trip_stops (
    id, trip_id, account_id, appointment_id, stop_date, sequence, location_id
)
OVERRIDING SYSTEM VALUE
VALUES (
    2,
    1,
    51,
    NULL,
    '2026-07-08',
    2,
    (SELECT id FROM account_locations WHERE account_id = 51 AND is_primary)
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('trip_stops', 'id'), (SELECT MAX(id) FROM trip_stops));

-- account 52: live, stage 'dormant', never visited, no location (F7 —
-- needsVisit does not filter by stage; a non-active-stage account sorts
-- exactly where its last_visit_at puts it).
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at)
OVERRIDING SYSTEM VALUE
VALUES (
    52,
    'TEST — Dormant Never Visited',
    'retail',
    (SELECT id FROM account_stages WHERE key = 'dormant'),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT MAX(id) FROM accounts));

-- account 53: live, one primary location, dedicated to the weekly/custom
-- coverage cycles below; explicitly excluded from cycle 1 so cycle 1's
-- existing eligible/covered counts stay unchanged.
-- last_visit_at is set (newer than account 50's) so this account does not
-- also land in the needsVisit NULLS-FIRST group — it exists here only for
-- the coverage cycles, not to affect needsVisit ordering.
INSERT INTO accounts (id, name, account_type, account_stage_id, first_seen_at, last_visit_at)
OVERRIDING SYSTEM VALUE
VALUES (
    53,
    'TEST — Weekly/Custom Coverage Account',
    'retail',
    (SELECT id FROM account_stages WHERE key = 'active'),
    NOW(),
    '2026-06-25T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT MAX(id) FROM accounts));

INSERT INTO account_locations (account_id, label, city, state, geo, is_primary)
SELECT 53, NULL, 'Frisco', 'TX', NULL, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM account_locations WHERE account_id = 53 AND is_primary
);

-- prospect_stages id 8: soft-deleted, with prospect id 3 pointed at it (F4).
INSERT INTO prospect_stages (id, key, label, sort_order, deleted_at)
OVERRIDING SYSTEM VALUE
VALUES (8, 'test_deprecated', 'TEST — Deprecated Stage', 99, NOW())
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('prospect_stages', 'id'), (SELECT MAX(id) FROM prospect_stages));

INSERT INTO prospects (id, company_name, city, state, prospect_stage_id)
OVERRIDING SYSTEM VALUE
VALUES (
    3,
    'TEST — Unstaged Prospect',
    'Dallas',
    'TX',
    8
)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('prospects', 'id'), (SELECT MAX(id) FROM prospects));

-- cycles id 2 (weekly), id 3 (custom, anchored 2026-06-01, every 2 weeks).
-- For the fixed test `now` (2026-07-01T12:00:00Z, America/Chicago):
--   weekly  periodKey = '2026-W27'
--   custom  periodKey = '2026-06-01+2w#2'
INSERT INTO cycles (id, name, period, active)
OVERRIDING SYSTEM VALUE
VALUES (2, 'TEST — Weekly coverage cycle', 'weekly', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cycles (id, name, period, active, custom_every, custom_unit, anchored_on)
OVERRIDING SYSTEM VALUE
VALUES (3, 'TEST — Custom coverage cycle', 'custom', TRUE, 2, 'weeks', '2026-06-01')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('cycles', 'id'), (SELECT MAX(id) FROM cycles));

-- Exclude account 53's location from cycle 1, so cycle 1's eligible/covered
-- counts (asserted elsewhere) are unaffected by its addition.
INSERT INTO cycle_exclusions (cycle_id, location_id)
SELECT 1, al.id FROM account_locations al
WHERE al.account_id = 53 AND al.is_primary
ON CONFLICT (cycle_id, location_id) WHERE deleted_at IS NULL DO NOTHING;

-- Exclude every location except account 53's from cycles 2 and 3, so each
-- has exactly one eligible location and zero covered (no cycle_progress
-- rows reference them). Computed dynamically over whatever locations exist
-- at this point in the file, so it stays correct as the fixture grows.
INSERT INTO cycle_exclusions (cycle_id, location_id)
SELECT 2, al.id FROM account_locations al
WHERE al.id NOT IN (SELECT id FROM account_locations WHERE account_id = 53 AND is_primary)
ON CONFLICT (cycle_id, location_id) WHERE deleted_at IS NULL DO NOTHING;
INSERT INTO cycle_exclusions (cycle_id, location_id)
SELECT 3, al.id FROM account_locations al
WHERE al.id NOT IN (SELECT id FROM account_locations WHERE account_id = 53 AND is_primary)
ON CONFLICT (cycle_id, location_id) WHERE deleted_at IS NULL DO NOTHING;
SELECT setval(pg_get_serial_sequence('cycle_exclusions', 'id'), (SELECT MAX(id) FROM cycle_exclusions));

COMMIT;
