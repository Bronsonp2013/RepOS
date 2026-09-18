task_id: scout-env
project_root: /home/user/RepOS
objective: Establish whether RepOS can be tested in this sandbox against a real
  Pathfinder-shaped PostgreSQL database, and vendor what those tests need. Concretely:
  (1) Read /home/user/RepOS/docs/REPOS_V1.md and CLAUDE.md so you know what RepOS is.
  (2) Copy /home/user/reptech-pathfinder/packages/db/migrations/*.sql (all 29 files, in
  order) into /home/user/RepOS/test/fixtures/pathfinder/migrations/ unchanged. Also copy
  /home/user/reptech-pathfinder/eslint.config.mjs, .prettierrc, tsconfig.base.json and .nvmrc
  into /home/user/RepOS/test/fixtures/pathfinder/config/ (the architect will adopt them later;
  do not place them at the RepOS root yourself). Write
  test/fixtures/pathfinder/README.md stating the source repo, commit 028af48, and that these
  are read-only vendored copies.
  (3) Get a local PostgreSQL 16 running: a cluster exists at /var/lib/postgresql/16/main
  (down) and you are root. PostGIS is required by migration 0001. Try
  `apt-get install -y postgresql-16-postgis-3` (network goes through a proxy; it may be
  blocked). If PostGIS cannot be installed, say so precisely; do NOT edit the vendored
  migrations to remove PostGIS.
  (4) Write test/fixtures/pathfinder/load.sh: given DATABASE_URL-style args (db name, owner
  role), creates the database, applies every migration in lexicographic order each in its own
  transaction, and inserts each filename into schema_migrations exactly as Pathfinder's runner
  would (CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at
  TIMESTAMPTZ NOT NULL DEFAULT NOW())). Migrations 0006-0009 contain their own BEGIN/COMMIT;
  handle that (psql --single-transaction will not work for them; run them plainly).
  Also write test/fixtures/pathfinder/seed-graham.sql that inserts: one users row (id 1,
  email bronsonprachyl@gmail.com, timezone America/Chicago) if the users table needs it, one
  account id 48 named "Graham Interiors" (account_type designer, stage active via subquery on
  account_stages key 'active'), its primary account_locations row (Dallas, TX, geo may be
  NULL), one appointment id 1 for account 48 from 2026-07-08T19:00:00Z to 20:00:00Z titled
  "TEST — Graham Interiors line presentation" with meeting_type_id resolved from meeting_types
  key 'presentation', and one trip starting 2026-07-08 with a trip_stops row for account 48
  on that date. Inspect the vendored migrations to get column names right; the trips and
  trip_stops shapes changed in 0006, 0008 and 0012.
  (5) If Postgres works: create roles and DBs `repos_test_lexington` and
  `repos_test_venture`, load the fixture into both, seed Graham into lexington only, and
  create a SELECT-only role `repos_reader` on both per docs/REPOS_V1.md §6. Prove read-only:
  as repos_reader run `INSERT INTO accounts (name, account_type) VALUES ('x','retail')` and
  confirm it fails with permission denied. Record the exact connection strings (host, port,
  db, user, password) in test/fixtures/pathfinder/LOCAL_DB.md.
  Do not write any RepOS application code. Do not modify anything under
  /home/user/reptech-pathfinder.
owns:
  - test/fixtures/pathfinder/**
may_read:
  - docs/**
  - CLAUDE.md
  - /home/user/reptech-pathfinder/** (READ ONLY, declared exception)
verification_cmd: bash test/fixtures/pathfinder/load.sh --check
  (write load.sh so that `--check` connects to repos_test_lexington, verifies
  schema_migrations has 29 rows and accounts has id 48, and exits 0; exits non-zero otherwise)
return_schema: recon_env
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack
  traces, test output, command transcripts or build logs. Report file:line pointers and exit
  codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. Anything else you needed goes in
  unresolved.
isolation: Work only inside project_root except the single declared read-only exception
  above. Shared toolchains (apt packages, global SDKs, package registries, published
  documentation) are available and exempt.
