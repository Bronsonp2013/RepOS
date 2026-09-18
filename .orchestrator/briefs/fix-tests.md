task_id: fix-tests
project_root: /home/user/RepOS
objective: Fix these reviewer findings, which all say the tests pass vacuously on a thin fixture.
  - test/fixtures/pathfinder/seed-graham.sql: seed (idempotently, explicit ids + setval like the existing rows) one active cycle plus one cycle_progress row for the current period and one cycle_exclusions row; two extra accounts with non-null last_visit_at at different ages (so account 48, never visited, stays first and the NULLS FIRST order is testable); two prospects in the lexington DB only. Keep 'Graham Interiors' and appointment 1 exactly as they are. Re-apply the seed to repos_test_lexington with psql using the superuser URL in .env.test (REPOS_TEST_SUPERUSER_DATABASE_URL) so the fixture DB reflects it; the venture DB stays empty.
  - apps/api/src/blocks/today-blocks.test.ts:146: coverage test asserts only Array.isArray then loops an empty array. Assert rows.length > 0 and check covered/eligible/periodKey against the seeded cycle; note cyclePeriodKey uses the block's fixed now (2026-07-01T12:00:00Z), so seed cycle_progress with the period_key for that date.
  - apps/api/src/blocks/today-blocks.test.ts:53: NULLS FIRST guard is a tautology. Assert the exact returned accountId order for the three seeded accounts.
  - apps/api/src/today.test.ts:88: 'venture shows zero prospects' has no positive control. Assert lexington's pipeline counts sum to the seeded prospect count and the venture's sum to zero.
  Another fixer is editing the block source files concurrently; test only behaviour that exists now.
owns:
  - test/fixtures/pathfinder/seed-graham.sql
  - apps/api/src/blocks/today-blocks.test.ts
  - apps/api/src/today.test.ts
may_read:
  - apps/api/src/**
  - packages/**
  - test/fixtures/pathfinder/**
  - .env.test
verification_cmd: npm run typecheck && npm run lint && npm test -- today
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
