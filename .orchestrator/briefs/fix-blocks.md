task_id: fix-blocks
project_root: /home/user/RepOS
objective: Fix these reviewer findings.
  - apps/api/src/blocks/upcomingTrips.ts:71: the accounts join omits a.deleted_at IS NULL so a soft-deleted account still renders as a trip stop. Add it.
  - apps/api/src/blocks/upcomingTrips.ts:49: neither the trips nor the stops query caps rows. Add an UPCOMING_TRIPS_LIMIT constant in blocks/context.ts beside NEEDS_VISIT_LIMIT (use 10) and apply it to trips.
  - apps/api/src/blocks/pipeline.ts:46: stage key is interpolated into the href without encodeURIComponent. Encode it.
  - apps/api/src/blocks/totals.ts:43: the account_stages join ignores deleted_at. Add AND s.deleted_at IS NULL.
  Do not edit today-blocks.test.ts (another fixer owns it); your existing block tests must still pass.
owns:
  - apps/api/src/blocks/upcomingTrips.ts
  - apps/api/src/blocks/pipeline.ts
  - apps/api/src/blocks/totals.ts
  - apps/api/src/blocks/context.ts
may_read:
  - apps/api/src/blocks/**
  - packages/shared/src/**
  - test/fixtures/pathfinder/migrations/**
verification_cmd: npm run typecheck && npm run lint && npm test -- blocks/
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
