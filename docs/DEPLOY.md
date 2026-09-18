# Deploying RepOS

RepOS binds to the tailnet only, never a public URL (`docs/REPOS_V1.md` §2
decision 6). This covers standing up a second Pathfinder instance for the
Pathfinder venture, creating the `repos_reader` role on each source
database, and first-run for RepOS itself.

## 1. Second Pathfinder instance (the venture)

Full detail: `docs/REPOS_V1.md` §5. Nothing in the Pathfinder repo changes;
this is a second deployment of the existing code, on the NAS:

1. Copy `docker-compose.prod.yml` from the Pathfinder repo to a second
   compose project, `-p pathfinder-venture`, with `POSTGRES_DB=pathfinder_venture`,
   different host ports for its API and web, and its own `.env.production`.
2. Run `db:migrate`. Do **not** run `db:seed` — the venture starts empty.
3. In the venture's Settings, hand-add meeting types **Discovery call (15)**
   and **Demo (30)**.
4. Leave pipeline stages as Pathfinder's standard seven (prospects) and four
   (accounts). V1 maps venture-specific names by convention: Trial = Meeting
   Set, Paying = Won. Renaming the seeded stages is a parked Pathfinder-side
   change (§10).
5. Add a Caddy site block for the venture's hostname — see
   `Caddyfile.example`.

## 2. `repos_reader` role, per source database

Full detail: `docs/REPOS_V1.md` §6. Run once per source database (Lexington's
existing one, and the new venture one), as the database owner:

```sql
CREATE ROLE repos_reader LOGIN PASSWORD '<generate>';
GRANT CONNECT ON DATABASE pathfinder TO repos_reader;
GRANT USAGE ON SCHEMA public TO repos_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO repos_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO repos_reader;
REVOKE TEMP ON DATABASE pathfinder FROM PUBLIC, repos_reader;
```

Substitute the venture database's name (`pathfinder_venture`) in the
`GRANT CONNECT` and `REVOKE TEMP ON DATABASE` lines for its own run. The
`ALTER DEFAULT PRIVILEGES` line means tables Pathfinder migrates in later are
readable without a follow-up grant; gate it on the same commit that bumps the
schema coupling in `packages/sources` if a future table might hold data that
should not be blanket-readable. The `REVOKE TEMP` line matters because the
default grant to `PUBLIC` on every database lets any role, including
`repos_reader`, run `CREATE TEMP TABLE` — revoking it closes that even though
RepOS itself never issues writes.

Verify before moving on: connect as `repos_reader` and confirm
`INSERT INTO accounts (name, account_type) VALUES ('x','retail')` fails with
`permission denied`. This is acceptance criterion 2 in `docs/REPOS_V1.md` §7.

Generate a strong password per role; this is the *only* credential RepOS
ever holds for a source (CLAUDE.md hard rules — no writable credential,
ever).

## 3. First run

1. Confirm both source databases have a `repos_reader` role (step 2) and
   that `sources.json` at the repo root lists both ventures — it already
   does for `lexington` and `pathfinder`; a new venture is a new entry plus
   a new role.
2. Copy `.env.example` to `.env` and fill in:
   - `REPOS_SOURCE_LEXINGTON_DATABASE_URL` and
     `REPOS_SOURCE_PATHFINDER_DATABASE_URL` with the `repos_reader`
     connection strings from step 2 (never the owner role).
   - `REPOS_WEB_ORIGIN=https://repos.<tailnet>.ts.net` — the tailnet
     hostname Caddy will front. The API image runs with `NODE_ENV=production`
     and refuses to boot without this set (no default in production, since an
     open CORS origin would let any page a tailnet browser visits read
     customer data).
   - `REPOS_API_PORT` / `REPOS_WEB_PORT` if the defaults (3200 / 5173)
     collide with something else on the NAS.
   `.env` is gitignored and must never be committed; `sources.json` holds
   only slugs, names, kinds and web URLs and is committed (CLAUDE.md).
3. Build and start the API:

   ```sh
   docker compose build
   docker compose up -d
   ```

   This builds the web bundle into the image (`apps/web/dist`) and starts
   the API service from `docker-compose.yml`. On first start, the `web-dist`
   named volume mounted over that path is populated from the image's copy,
   so the built bundle also lands on the host (see `Caddyfile.example` for
   how to find its path). There is no `db` service — RepOS has no database
   of its own, only read-only connections to the sources configured above.
4. Point Caddy at the built web bundle (the `web-dist` volume's host path —
   see the header comment in `Caddyfile.example`) and the API, per
   `Caddyfile.example`, and reload Caddy.
5. Check `GET /api/health` (through Caddy, or directly at
   `127.0.0.1:${REPOS_API_PORT}/api/health`) for per-source connectivity and
   migration status. A source behind the migration RepOS was built against
   (`packages/sources`, checked on boot) refuses to start rather than
   serving stale queries — see `docs/REPOS_V1.md` §2 decision 5.
6. Open the tailnet hostname from `Caddyfile.example` and confirm the Today
   page renders both ventures (acceptance criterion 4 in
   `docs/REPOS_V1.md` §7).

## Fixture / test databases

RepOS's own test suite (`npm test`) runs against two local Postgres
databases loaded with a Pathfinder-shaped schema, not the real sources
above. Setup lives in `test/fixtures/pathfinder/`:

- `test/fixtures/pathfinder/README.md` — what each fixture file is
  (migrations, seed data, the `load.sh` loader).
- `test/fixtures/pathfinder/LOCAL_DB.example.md` — a template for the
  connection strings `load.sh` and the tests expect. Copy it to
  `LOCAL_DB.md` (gitignored) in the same directory and fill in your local
  cluster's real values; never commit `LOCAL_DB.md`.

This is separate from the production `repos_reader` role setup above: the
fixtures are for running RepOS's own tests, not for a real deploy.

## Notes

- RepOS is never modified from data problems in Pathfinder, and Pathfinder
  is never modified from this repo (CLAUDE.md). A schema mismatch found at
  boot is fixed by bumping the recorded migration in `packages/sources` in
  the same commit that adapts the affected queries, not by patching
  Pathfinder.
- Redeploying after a RepOS change: `docker compose build && docker compose up -d`.
  There is no database migration step for RepOS itself.
- `default_transaction_read_only=on` (appended to every RepOS connection by
  the pool factory) is defense in depth, not the enforcement mechanism
  itself: it is a session-level option a role with `SET` privilege could in
  principle override for its own session, so the real guarantee is the
  `repos_reader` grant above (`SELECT` only, no `INSERT`/`UPDATE`/`DELETE`
  privilege exists to fall back to even if the session option were unset).
- The header's "Trips this week" total and the Today page's "Upcoming
  trips" list use different, intentionally different definitions: the total
  counts any trip whose date range overlaps the current Mon–Sun week
  regardless of status (`totals.ts`), while the list shows trips with
  `start_date >= today` (`upcomingTrips.ts`), so a trip already in progress
  can count toward the weekly total without appearing in the list.
