# Orchestration state — RepOS V1

**Rewrite this file at every phase boundary. Never append.**

## Run

| | |
|---|---|
| Project root | `/home/user/RepOS` |
| Size | `L` |
| Agent budget | none set |
| Git | repo on `claude/starting-project-k5ji80` |
| Attempt | 1 |
| Concurrency | 4 CPUs → 2 workers at a time |
| Local DB | PostgreSQL 16 + PostGIS on localhost:5432; fixture DBs `repos_test_lexington` (Graham seeded) and `repos_test_venture` (empty); role `repos_reader` SELECT-only; connection details in `test/fixtures/pathfinder/LOCAL_DB.md` (gitignored) |

## Frozen acceptance criteria

Copied verbatim at the phase-1 gate. Not edited again by anyone but Bronson. This exact text is
the sole input to the phase-7 acceptance worker. All commands run from `/home/user/RepOS`.

| id | Criterion | Verification command |
|---|---|---|
| C1 | Toolchain is clean: TypeScript strict typecheck and ESLint pass across all workspaces. | `npm run typecheck && npm run lint` |
| C2 | The full test suite passes, including integration tests against the two local fixture databases. | `npm test` |
| C3 | Read-only by construction: an INSERT through a RepOS source pool fails with a read-only-transaction error, and an INSERT as `repos_reader` fails with permission denied. | `npm test -- readonly` |
| C4 | Schema coupling is enforced: boot against a source missing `0029_sessions.sql` refuses to start naming the gap; a source with an extra migration row boots with a warning naming it; a matching source reports `ok`. | `npm test -- schema` |
| C5 | `GET /api/sources` returns `lexington` and `pathfinder` with `schemaStatus: ok`, and `GET /api/health` reports per-source connectivity. | `npm test -- sources` |
| C6 | `GET /api/today`: lexington `needsVisit` lists account 48 first (never visited); lexington `upcomingTrips` contains the trip anchored on appointment 1 rendered as 2026-07-08 2:00 PM America/Chicago; the venture source shows zero accounts and zero prospects; `pipeline` lists `prospect_stages` in `sort_order`; `coverage` is present. | `npm test -- today` |
| C7 | Degradation: with the venture source pointed at a closed port, `GET /api/today` still returns HTTP 200 with lexington data and the venture entry carries an error state. | `npm test -- degrade` |
| C8 | The web app builds, and a Playwright test against the running API and web renders the Today page with both venture sections, the "Graham Interiors" row, and an "Open in Pathfinder" link whose href is `{webUrl}/accounts/48`. | `npm run build -w apps/web && npm run e2e` |
| C9 | No writable credential: `sources.json` contains no connection string; the pool factory appends `default_transaction_read_only=on` to every connection; `.env.example` documents `REPOS_SOURCE_<SLUG>_DATABASE_URL`. | `npm test -- credentials` |

## Current phase

`6 — Remediation (round 1 of max 2), then integrate-2, then 7 — Acceptance`

## Lane map

Phase-2 output (commit 4cae02f). Shared files belong to no lane: package.json files,
package-lock.json, index.ts barrels, apps/api/src/server.ts, root configs, sources.json, .env*,
test/setup/**.

| id | owns | may_read | status |
|---|---|---|---|
| sources | `packages/sources/src/{types,config,pool,schema}.ts`, `packages/sources/src/{readonly,schema,credentials}.test.ts` | shared, sources index, fixtures, sources.json | done |
| blocks | `apps/api/src/blocks/**` incl. `today-blocks.test.ts` | shared, sources, server.ts, services, fixtures | done |
| routes | `apps/api/src/routes/**`, `apps/api/src/services/**`, `apps/api/src/index.ts`, `apps/api/src/{sources,degrade,today}.test.ts` | shared, sources, blocks, server.ts | done |
| web | `apps/web/src/**`, `apps/web/{index.html,vite.config.ts,tailwind.config.js,postcss.config.js}`, `e2e/**` | shared, playwright.config.ts | done |
| deploy-docs | `Dockerfile`, `docker-compose.yml`, `Caddyfile.example`, `docs/DEPLOY.md`, `README.md` | spec, package.json, .env.example | done |

## Tasks

| task_id | label | model | attempt | verdict |
|---|---|---|---|---|
| scout-env | `recon:scout-env` | sonnet | 1 | pass (3 verifications exit 0) |
| arch | `arch:arch` | opus | 1 | pass (typecheck 0, lint 0, web build 0; tests fail 'not implemented' by design) |
| review-contracts | `review:contracts` | opus | 1 | fail: 3 blockers, 5 majors, 2 minors (all triaged into contract-fix and lane briefs) |
| contract-fix | `fix:contracts` | sonnet | 1 | pass (3 exits 0, commit 4a7252b) |
| lane-sources | `lane:sources` | sonnet | 1 | pass (5 exits 0) |
| lane-blocks | `lane:blocks` | sonnet | 1 | pass (3 exits 0) |
| lane-routes | `lane:routes` | sonnet | 1 | pass (3 exits 0; full suite 35 tests) |
| lane-web | `lane:web` | sonnet | 1 | partial: all green except e2e, which ran before routes existed; integrator re-runs |
| lane-deploy-docs | `lane:deploy-docs` | sonnet | 1 | pass (2 exits 0; image not built, no Docker) |
| integrate | `integrate` | sonnet | 1 | pass (6 exits 0, commit 15eb575) |
| review-correctness | `review:correctness` | opus | 1 | fail: 2 blockers (web error state unreachable; no pool error listener), 5 majors, 3 minors |
| review-criteria | `review:criteria` | opus | 1 | pass_with_fixes: all C1-C9 commands exit 0; 5 majors on vacuous tests and an unredacted 500, 5 minors |
| review-security | `review:security` | opus | 2 (attempt 1 died on schema length) | fail: 2 blockers (CORS *, no .dockerignore), 3 majors (500 handler, listen 0.0.0.0, compose ports), 4 minors |
| fix-sources / fix-blocks / fix-api / fix-tests / fix-web / fix-deploy | `fix:*` | sonnet | 1 | running (all 28 findings in scope, grouped file-disjoint) |
| integrate-2 | `integrate-2` | sonnet | 1 | queued |
| accept | `accept` | opus | 1 | queued |

## Open decisions

| id | Question | Options | Status |
|---|---|---|---|
| D1 | Architect asks: Node 22 vs Pathfinder's 20; placeholder webUrls; API runs under tsx in prod; no Docker to verify image. | Resolved by orchestrator: 22, placeholders stay config, tsx matches Pathfinder, image unverified is a recorded degradation. | resolved |
| D2 | Review blockers: fixture trip date past; totals block missing; test filter collision. | Fixed clock via BlockContext in tests; totals block added to blocks lane; lane verification commands made path-exact; criteria unchanged. | resolved |
| D3 | Finding triage (decision 3): all 28 findings from three reviewers are in scope; none deferred. | Six file-disjoint fix groups. | resolved |
| D0 | Bronson said "proceed"; treated as run-unattended. Phase 1 and 2 gates become notifications. | — | assumed |

## Degradations

- Declared isolation exception (phase 1 only, closed): the scout read `/home/user/reptech-pathfinder`
  (commit 028af48) to vendor migrations and lint configs into `test/fixtures/pathfinder/`. No later
  worker reads the sibling repo.
- No Docker in the sandbox. Local PostgreSQL 16 is used instead; PostGIS installed via apt.
- Lanes are staged, not one fan-out, because blocks and routes depend on sources and web's e2e depends on routes.
- Gate commits are run by the orchestrator (a stop hook requires committed state each turn).
