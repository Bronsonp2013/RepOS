task_id: lane-routes
project_root: /home/user/RepOS
objective: Implement apps/api/src/services/{health,today,sourceContext}.ts, the three routers under apps/api/src/routes, and the boot sequence in apps/api/src/index.ts: load configs, open one read-only pool per source, refuse to start when a source's schema is behind (log a warning when ahead), listen on REPOS_API_PORT. /api/today degrades per source: HTTP 200 with error set on the failed entry and every other source intact; a source whose connection is refused must not delay the response beyond a short bounded timeout. No credential may appear in any response body or log line. Make apps/api/src/sources.test.ts and apps/api/src/degrade.test.ts pass. Call the blocks through their exported functions; the blocks lane is implementing them concurrently, so if a block still throws 'not implemented' when you test, stub the call in your test via the block's exported function signature rather than editing the block. Do not edit apps/api/src/blocks/**, apps/api/src/server.ts, packages/** or apps/web. Criteria served: C1, C5, C7.
owns:
  - apps/api/src/routes/**
  - apps/api/src/services/**
  - apps/api/src/index.ts
  - apps/api/src/sources.test.ts
  - apps/api/src/degrade.test.ts
may_read:
  - packages/shared/src/**
  - packages/sources/src/**
  - apps/api/src/blocks/**
  - apps/api/src/server.ts
  - .env.test.example
  - .env.test
  - sources.json
  - docs/REPOS_V1.md
verification_cmd: npm run typecheck && npm run lint && npm test -- degrade && npm test -- sources
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
