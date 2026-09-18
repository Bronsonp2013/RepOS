# REPOS_V1

**Status:** Spec — commit before any code
**Owner:** Bronson
**Decided:** 2026-09-16, replacing WORKSPACES_V1 (see `parked/`)

---

## 1. Purpose

RepOS is the rep's operating system: one screen that shows the state of every
venture Bronson runs, read from each venture's own Pathfinder instance.

RepOS **never writes**. It reads Lexington's Pathfinder and the Pathfinder
venture's Pathfinder, and shows one picture. Any action (log a visit, move a
prospect, build a trip) happens in the Pathfinder instance that owns the data.
RepOS deep-links there.

This replaces the multi-tenant WORKSPACES_V1 plan. Pathfinder stays
single-tenant and unchanged. Separation between ventures is physical (separate
databases), not logical (a `workspace_id` column).

---

## 2. Decisions (locked)

1. **One Pathfinder instance per venture.** Lexington is the existing instance.
   The Pathfinder venture (reps as prospects, discovery calls, trials, paying
   seats) is a second instance of the same code with its own database and its
   own port. No Pathfinder code changes.
2. **Read-only is enforced by the database, not by discipline.** Each source
   database gets a `repos_reader` role with `SELECT` only. RepOS holds no other
   credential. Belt and braces: every RepOS connection also sets
   `default_transaction_read_only = on`.
3. **Sources are configuration.** A venture is an entry in `sources.json`:
   slug, name, kind (`territory` | `venture`), read-only `DATABASE_URL`, and
   the instance's web URL for deep links. Adding a venture adds an entry.
4. **Same stack as Pathfinder.** Node 22, TypeScript, Express, React + Vite,
   Tailwind, `pg`, TanStack Query. One toolchain, one set of conventions, and
   Pathfinder's `packages/shared` types can be reused where they match.
5. **Schema coupling is explicit.** RepOS reads Pathfinder tables directly. It
   records the Pathfinder migration it was built against
   (`0029_sessions.sql`) and, on boot, reads each source's
   `schema_migrations`. A source that is ahead logs a warning naming the newer
   migrations; a source that is behind refuses to start. Queries live in one
   file per source table group so a Pathfinder schema change has one place to
   land.
6. **Private network only in V1.** RepOS shows the same customer data
   Pathfinder does. It binds to the tailnet, never a public URL. Login is V2.

---

## 3. V1 surface: the Today page

One route, `/`. A header row across ventures, then one section per source.

**Header (all ventures):** total active accounts, prospects in pipeline,
trips this week, stale accounts (90+ days or never visited).

**Per venture section:**

| Block | Source query | Deep link |
| --- | --- | --- |
| Needs a visit | Accounts worst-first by `last_visit_at`, NULLS FIRST, top 8. Same ordering as Pathfinder's dashboard. | `{web}/accounts/{id}` |
| Upcoming trips | Trips with `start_date >= today`, soonest first, with anchored appointments (account, rep-local time). | `{web}/trips/{id}` |
| Pipeline | Prospect count per `prospect_stages` row, in `sort_order`. | `{web}/prospects?stage={key}` |
| Coverage | Per active cycle: covered / eligible locations this period, as a bar. | `{web}/cycles/{id}` |

A `kind: venture` section renders the same blocks. No kind-based gating in V1;
the Pathfinder venture simply has few trips.

Out of scope for V1: calendar, email, tasks, any write, any RepOS-native data.

---

## 4. API

Express on its own port (`REPOS_API_PORT`, default 3200).

- `GET /api/sources` → `[{ slug, name, kind, webUrl, schemaStatus }]`
- `GET /api/today` → `{ generatedAt, totals, sources: [{ slug, needsVisit, upcomingTrips, pipeline, coverage }] }`
- `GET /api/health` → per-source connectivity and migration check

The exact field list for all three payloads lives in
`packages/shared/src/api.ts` (`SourceSummary`, `HealthReport`, `TodayPayload`).
That file is the contract: apps/web and apps/api share it and nothing else. A
source that cannot be read still appears in `/api/today` with `error` set and
its four block arrays empty, so one dead venture never fails the page.

One `pg.Pool` per source, `max: 5`, created from `sources.json` at boot. The
pool factory is the only place a connection string is read, and it appends
`options=-c default_transaction_read_only=on`. A write attempted through any
RepOS pool fails at the database with `cannot execute ... in a read-only
transaction`, which is the desired failure.

Timezone: read `users.timezone` for user id 1 from each source, the same way
Pathfinder does, so trip times render rep-local.

---

## 5. Second Pathfinder instance (the venture)

Nothing in the Pathfinder repo changes. On the NAS:

1. Copy `docker-compose.prod.yml` to a second compose project
   (`-p pathfinder-venture`) with `POSTGRES_DB=pathfinder_venture`, a different
   host port for the API and web, and its own `.env.production`.
2. Run `db:migrate`. Do not run `db:seed`; the venture starts empty.
3. In the venture instance's Settings, add meeting types **Discovery call
   (15)** and **Demo (30)** by hand. Meeting types are rep CRUD; no seed needed.
4. Pipeline stages stay Pathfinder's standard seven for prospects and four for
   accounts. Venture-specific stage names ("Trial", "Paying") are a
   Pathfinder-side change to the seeded taxonomy and are **parked**; V1 maps
   them by convention (Trial = Meeting Set, Paying = Won).

Caddy gains a second site block for the venture's hostname on the tailnet.

---

## 6. Read-only role setup

Run once per source database, as the owner:

```sql
CREATE ROLE repos_reader LOGIN PASSWORD '<generate>';
GRANT CONNECT ON DATABASE pathfinder TO repos_reader;
GRANT USAGE ON SCHEMA public TO repos_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO repos_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO repos_reader;
```

The `ALTER DEFAULT PRIVILEGES` line means tables Pathfinder adds later are
readable without a follow-up grant. Verification: `INSERT` as `repos_reader`
must fail with `permission denied`.

Credentials go in `.env` as `REPOS_SOURCE_<SLUG>_DATABASE_URL`, never in
`sources.json`, which is committed.

---

## 7. Acceptance

1. `sources.json` lists `lexington` and `pathfinder`; `GET /api/sources`
   returns both with `schemaStatus: ok`.
2. As `repos_reader`, `INSERT INTO accounts (name, account_type) VALUES ('x','retail')`
   fails with `permission denied`. Shown with real output.
3. A RepOS pool executing the same statement fails with the read-only
   transaction error. Shown with real output.
4. Today page renders both ventures. Lexington shows the Graham fixture
   (account 48, appointment 2026-07-08 2 PM–3 PM Central) under Upcoming
   trips when a trip anchors it, at 2:00 PM Central.
5. The venture section shows zero accounts, zero prospects, and the two
   meeting types are visible via `GET /api/sources` detail.
6. Stopping the venture's Postgres degrades only that section, with an
   error state; Lexington keeps rendering.
7. Boot against a source whose `schema_migrations` is missing `0029_sessions.sql`
   refuses to start with a message naming the gap.
8. Every "Open in Pathfinder" link lands on the right record in the right
   instance.

---

## 8. Build order

| Commit | Files | Verify |
| --- | --- | --- |
| A | Monorepo skeleton: `apps/api`, `apps/web`, `packages/sources`, root scripts, `sources.example.json` | `npm run typecheck`, `npm run lint` clean |
| B | `packages/sources`: pool factory, read-only enforcement, schema check | Acceptance 2, 3, 7 |
| C | `GET /api/sources`, `GET /api/health` | Acceptance 1 |
| D | `GET /api/today` queries, one module per block | Unit tests on ordering, fixtures from Pathfinder's test helpers |
| E | Today page | Acceptance 4, 5, 6, 8 |
| F | Deploy: `Dockerfile`, compose service, Caddy block, README | Reachable on the tailnet |

---

## 9. What the WORKSPACES_V1 recon found (for the record)

Recorded so the multi-tenant option can be re-costed later without redoing
the recon. Pathfinder at commit `028af48`:

- 30 tables; 23 carry the nullable `user_id` stub, never written or filtered.
- No query helper: ~110 raw SQL sites across 17 repositories, 12 hardcoded to
  the pool, one function opening its own connection.
- Seven globally scoped unique indexes would collide on a second tenant
  (stage keys, meeting and interaction type keys and names, tags, sync_state).
- Migration numbering had reached 0029; repo policy is forward-only.
- `recomputeAccountLastVisit` is an unscoped UPDATE across all accounts.
- Frontend has a single HTTP chokepoint but two fetch sites, no state
  library, and no workspace segment in any query key.
- Worker: one job type, payload has no tenant field, two enqueue sites.

Reentry cost estimate: a full week of careful work touching every table and
route, with row-level security the safer enforcement mechanism.

---

## 10. Reentry points (parked)

- **Writes from RepOS:** through each Pathfinder instance's API with a
  service token, never through the database. Needs Pathfinder auth work.
- **Login:** reuse Pathfinder's Google OAuth pattern.
- **Venture-specific stage names:** Pathfinder seed change, one migration.
- **RepOS-native data** (pricing vault, briefs): separate spec.
- **Multi-tenant Pathfinder:** `parked/WORKSPACES_V1.md`, when a second rep
  is real.
