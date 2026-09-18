task_id: lane-routes
project_root: /home/user/RepOS
objective: Implement apps/api/src/services/{health,today,sourceContext}.ts, the three routers under apps/api/src/routes, and the boot sequence in apps/api/src/index.ts: load configs, open one read-only pool per source, refuse to start when a source's schema is behind (log a warning when ahead), listen on REPOS_API_PORT. /api/today degrades per source: HTTP 200 with error set on the failed entry and every other source intact; a source whose connection is refused must not delay the response beyond a short bounded timeout. No credential may appear in any response body or log line. The blocks lane has landed; call the five blocks through their exported functions with a BlockContext whose now is the wall clock and whose timezone comes from the source (users.timezone for user 1, via a block or sourceContext). Sum per-source totals into the payload totals. Use the connectionTimeoutMillis option when creating pools. Make apps/api/src/sources.test.ts, apps/api/src/degrade.test.ts and apps/api/src/today.test.ts pass; today.test.ts may override BlockContext.now through whatever seam services/today.ts exposes for tests (a fixed 2026-07-01T12:00:00Z makes the Graham trip upcoming). Do not edit apps/api/src/blocks/**, apps/api/src/server.ts, packages/** or apps/web. Criteria served: C1, C5, C6, C7.
owns:
  - apps/api/src/routes/**
  - apps/api/src/services/**
  - apps/api/src/index.ts
  - apps/api/src/sources.test.ts
  - apps/api/src/degrade.test.ts
  - apps/api/src/today.test.ts
may_read:
  - packages/shared/src/**
  - packages/sources/src/**
  - apps/api/src/blocks/**
  - apps/api/src/server.ts
  - .env.test.example
  - .env.test
  - sources.json
  - docs/REPOS_V1.md
verification_cmd: npm run typecheck && npm run lint && npm test -- apps/api/src/sources.test.ts apps/api/src/degrade.test.ts apps/api/src/today.test.ts
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
