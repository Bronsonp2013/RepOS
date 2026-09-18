# Orchestration state — RepOS V1

**Run 2 opened 2026-09-18: full review and remediation** (plan: /root/.claude/plans/use-engineering-skills-to-giggly-pearl.md). Run 1 accepted at f706da7.

## Run

| | |
|---|---|
| Project root | `/home/user/RepOS` |
| Size | `L` |
| Agent budget | none set |
| Git | branch `claude/starting-project-k5ji80` |
| Attempt | 1 |
| Workers dispatched | 24 (1 scout, 1 architect, 1 contract reviewer, 1 contract fix, 5 lanes, 2 integrators, 4 reviewers incl. one retry, 7 fixers, 2 acceptance runs) |

## Frozen acceptance criteria

All commands run from `/home/user/RepOS`. Final acceptance (attempt 2): every criterion met, exit 0.

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

`Run 2, R1 — five Opus review lenses (A data, B concurrency, C security, D web, E deploy/docs/tests), then R2 verifier`

## Lane map

All lanes done. Shared files were integrator-only.

| id | owns | status |
|---|---|---|
| sources | `packages/sources/src/**` (except index.ts) | done |
| blocks | `apps/api/src/blocks/**` | done |
| routes | `apps/api/src/{routes,services}/**`, `index.ts`, api tests | done |
| web | `apps/web/src/**`, web configs, `e2e/**` | done |
| deploy-docs | `Dockerfile`, `docker-compose.yml`, `Caddyfile.example`, `docs/DEPLOY.md`, `README.md` | done |

## Tasks (final verdicts)

| task_id | model | attempt | verdict |
|---|---|---|---|
| scout-env | sonnet | 1 | pass |
| arch | opus | 1 | pass |
| review-contracts | opus | 1 | fail → 3 blockers + 5 majors triaged into contract-fix and staged lanes |
| contract-fix | sonnet | 1 | pass |
| lane-sources, lane-blocks, lane-routes, lane-deploy-docs | sonnet | 1 | pass |
| lane-web | sonnet | 1 | partial (e2e pre-routes), resolved at integration |
| integrate | sonnet | 1 | pass |
| review-correctness, review-criteria | opus | 1 | fail / pass_with_fixes |
| review-security | opus | 2 | fail (attempt 1 died on schema length) |
| fix-sources, fix-blocks, fix-api, fix-tests, fix-web, fix-deploy | sonnet | 1 | pass |
| integrate-2 | sonnet | 1 | pass on exit codes; re-scoped C7 test, caught at acceptance |
| accept | opus | 1 | rejected on C7 |
| fix-unreachable | sonnet | 1 | pass |
| accept | opus | 2 | **accepted** |

## Decisions

| id | Decision |
|---|---|
| D0 | "Proceed" treated as run-unattended; gates were notifications. |
| D1 | Node 22; placeholder webUrls stay config; API runs under tsx; Docker image unverified. |
| D2 | Fixed clock via BlockContext in tests; totals block added; lane commands path-exact; criteria unchanged. |
| D3 | All 28 review findings in scope, six file-disjoint groups. |
| D4 | Unreachable-at-boot sources degrade; behind/unknown are fatal. Spec decision 5 amended. |
| D5 | Accepted on attempt 2 with all nine criteria met. |

## Residual risk (stated for the hand-off)

- The orchestrator never read the source. Quality rests on named verification commands, three adversarial reviewers, and a fresh acceptance worker that ran every command and hand-curled the API.
- The Graham fixture is dated 2026-07-08; under the live clock its trip is past. C6 is proven under a fixed clock (real HTTP, real DB). Fixtures drift with time.
- Docker image never built (no daemon in the sandbox). Dockerfile verified by read-through only.
- Playwright reuses an existing API server off-CI.
- `sources.json` webUrls are placeholders; real tailnet hostnames needed before deploy.
- Not done here: creating `repos_reader` on the real Lexington database, standing up the second Pathfinder instance, NAS deploy.

## Degradations

- Phase 1 scout read the sibling Pathfinder checkout (read-only) to vendor migrations; no later worker did.
- No Docker; local PostgreSQL 16 + PostGIS used.
- Lanes staged in three dependency-ordered waves rather than one fan-out.
- Gate commits run by the orchestrator (stop hook requirement).
