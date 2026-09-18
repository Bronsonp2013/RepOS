task_id: fix-sources
project_root: /home/user/RepOS
objective: Fix these reviewer findings.
  - packages/sources/src/pool.ts:41: no pool.on('error') listener; pg emits 'error' on the Pool when an idle client dies and an unhandled emitter error kills the API. Attach a listener at construction that logs a redacted message (no connection string) and never throws.
  - packages/sources/src/schema.ts:112: assertSchemaUsable ignores status 'unknown' (no readable schema_migrations), so such a source boots despite possibly missing 0029. Treat 'unknown' as refuse-to-start with a message naming the table, and test it with a throwaway DB that has no schema_migrations table.
  - packages/sources/src/schema.test.ts:70: add a case asserting createSourcePools rejects for the 'behind' database and closes any pools it opened.
  - packages/sources/src/schema.ts:8: delete the stale 'STUB' sentence in the header comment.
owns:
  - packages/sources/src/pool.ts
  - packages/sources/src/schema.ts
  - packages/sources/src/schema.test.ts
may_read:
  - packages/sources/src/**
  - packages/shared/src/**
  - .env.test
verification_cmd: npm run typecheck && npm run lint && npm test -- packages/sources
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
