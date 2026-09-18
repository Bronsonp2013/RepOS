task_id: lane-blocks
project_root: /home/user/RepOS
objective: Implement the five Today blocks in apps/api/src/blocks: totals (per-source counts: active accounts, prospects in pipeline, trips this week, stale accounts = 90+ days or never visited), needsVisit (accounts worst-first by last_visit_at NULLS FIRST, name tiebreak, top 8, with the deep-link href the contract expects), upcomingTrips (start_date >= today, soonest first, anchored appointments rendered in the source's rep timezone from users.timezone for user 1), pipeline (prospect_stages by sort_order with counts), coverage (active cycles, covered vs eligible locations this period). All SQL for a block stays in that block's file. Schema notes: address fields moved to account_locations (0014); trip_stops.location_id (0012); meeting_types.key (0015); users.timezone (0007); soft-delete means filter deleted_at IS NULL everywhere. Every block takes BlockContext { now, timezone } and never reads the wall clock. Write block-level tests in apps/api/src/blocks/today-blocks.test.ts (already stubbed) that call each block function directly with a fixed now of 2026-07-01T12:00:00Z so the Graham trip counts as upcoming, using a pool from @repos/sources createSourcePools (the sources lane has landed) against the fixture DBs. Do not edit apps/api/src/today.test.ts; that endpoint test belongs to the routes lane. Use cyclePeriodKey from @repos/shared for coverage. Make today-blocks.test.ts pass (Graham: account 48, appointment id 1 at 2026-07-08 19:00Z, one trip with a stop). Do not touch routes/, services/, server.ts, apps/api/src/today.test.ts, packages/** or apps/web. Criteria served: C1, C6.
owns:
  - apps/api/src/blocks/**
  - apps/api/src/blocks/today-blocks.test.ts
may_read:
  - packages/shared/src/**
  - packages/sources/src/**
  - apps/api/src/server.ts
  - apps/api/src/services/**
  - test/fixtures/pathfinder/migrations/**
  - test/fixtures/pathfinder/seed-graham.sql
  - .env.test
  - docs/REPOS_V1.md
verification_cmd: npm run typecheck && npm run lint && npm test -- blocks/
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
