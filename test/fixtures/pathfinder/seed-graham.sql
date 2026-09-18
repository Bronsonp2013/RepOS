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

COMMIT;
