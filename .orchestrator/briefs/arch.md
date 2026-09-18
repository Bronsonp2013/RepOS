task_id: arch
project_root: /home/user/RepOS
objective: Design RepOS V1 and put the skeleton, contracts and test scaffolding on disk so
  that implementation lanes can build in parallel without touching each other's files. Read
  docs/REPOS_V1.md, CLAUDE.md, .orchestrator/state.md (the frozen criteria C1-C9 are your
  target), test/fixtures/pathfinder/README.md, LOCAL_DB.md, load.sh, seed-graham.sql, and the
  vendored migrations (for exact table and column names; 0014 moved address fields to
  account_locations; trips changed in 0006/0008/0012; stages are account_stages and
  prospect_stages with key and sort_order; meeting_types have key; users has timezone).
  Deliver:
  (1) npm-workspaces monorepo: apps/api (Express), apps/web (React + Vite + Tailwind +
  TanStack Query), packages/sources (pool factory, read-only enforcement, schema check, source
  config loading), packages/shared (types for the /api/sources, /api/health and /api/today
  payloads). Adopt eslint.config.mjs, .prettierrc, tsconfig.base.json and .nvmrc from
  test/fixtures/pathfinder/config/ at the root, adjusted for RepOS paths. Root scripts:
  typecheck, lint, test (vitest run), e2e (playwright test), build, dev.
  (2) Install EVERY dependency any lane will need now, producing package-lock.json once:
  express, pg, @types/pg, cors, helmet, react, react-dom, react-router-dom, @tanstack/react-query,
  vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, typescript, tsx, vitest,
  supertest, @types/supertest, @playwright/test, eslint + typescript-eslint, prettier, dotenv,
  zod, date-fns, date-fns-tz. Lanes may not add dependencies.
  (3) Contracts on disk: packages/shared/src/api.ts with the exact TypeScript types for
  SourceSummary, HealthReport, TodayPayload (totals, sources[] each with needsVisit[],
  upcomingTrips[], pipeline[], coverage[], error?: string). packages/sources/src/types.ts with
  SourceConfig and the pool factory interface. apps/api/src/blocks/{needsVisit,upcomingTrips,
  pipeline,coverage}.ts as typed stubs each exporting one async function (pool, ctx) =>
  Promise<...> that currently throws 'not implemented'. Route table apps/api/src/server.ts
  wired to those stubs. Web: apps/web/src with App.tsx, a lib/api.ts fetch client, pages/
  TodayPage.tsx stub, feature components stubbed.
  (4) Config: sources.json committed with the two ventures (slug, name, kind, webUrl only);
  .env.example documenting REPOS_API_PORT and REPOS_SOURCE_<SLUG>_DATABASE_URL; a
  gitignored .env.test that the test setup loads, pointing both sources at the local fixture
  DBs as repos_reader (values from test/fixtures/pathfinder/LOCAL_DB.md). Also commit
  .env.test.example with placeholder values.
  (5) Test scaffolding: vitest.config.ts at root with a globalSetup that loads .env.test;
  test files that exist and are runnable but currently skipped or failing with a clear
  'not implemented' assertion, named exactly: packages/sources/src/readonly.test.ts,
  packages/sources/src/schema.test.ts, apps/api/src/sources.test.ts,
  apps/api/src/today.test.ts, apps/api/src/degrade.test.ts, packages/sources/src/
  credentials.test.ts. playwright.config.ts at root with webServer entries that start the API
  and the web dev server against .env.test, and e2e/today.spec.ts stubbed. The `npm test -- X`
  filter form in the criteria must select the matching file.
  (6) The build and test commands must RUN (they may fail on 'not implemented', but
  `npm run typecheck` and `npm run lint` must exit 0 on the skeleton).
  (7) Return a lane map of at most 5 lanes with provably disjoint `owns` globs. Shared files
  belong to no lane: package.json files, package-lock.json, any index.ts barrel,
  apps/api/src/server.ts, root configs, sources.json, .env*. Every criterion C1-C9 must map
  to at least one lane. Each lane gets a `brief` paragraph (max 600 chars) naming its
  deliverable, its test file(s), and what it must not touch. Suggested split: sources
  (packages/sources/src/** except index.ts + its 3 tests), blocks (apps/api/src/blocks/** +
  today.test.ts), routes (apps/api/src/routes/**, apps/api/src/services/**, sources.test.ts,
  degrade.test.ts), web (apps/web/src/** + e2e/**), deploy-docs (Dockerfile, docker-compose.yml,
  Caddyfile.example, docs/DEPLOY.md, README status line). Adjust if you see a better disjoint
  partition.
  (8) Finish with: git add -A && git commit -m "feat(skeleton): monorepo, contracts, test
  scaffolding" (author Bronson Prachyl <bronsonprachyl@gmail.com>). Do not push.
  Do NOT read /home/user/reptech-pathfinder; everything you need from Pathfinder is vendored.
  Do not implement the blocks, the pool factory logic, or the Today page; stubs only.
owns:
  - everything under /home/user/RepOS except .orchestrator/** and test/fixtures/**
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test -- credentials; echo exit $?
  (typecheck and lint must be exit 0; report the vitest exit code separately and honestly)
return_schema: arch_report (build_report plus lanes and test_cmd)
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack
  traces, test output, command transcripts or build logs. Report file:line pointers and exit
  codes only. Keep all free text under 1500 characters total, excluding lane briefs.
unresolved: Anything you could not settle goes in unresolved as a one-line request.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs,
  published documentation) are available and exempt. Never touch /home/user/reptech-pathfinder.
