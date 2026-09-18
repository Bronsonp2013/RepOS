task_id: fix-unreachable
project_root: /home/user/RepOS
objective: Resolve a policy conflict the acceptance worker found. Today, a source whose
  schema_migrations cannot be read is classified 'unknown' and assertSchemaUsable treats that as
  fatal at boot. That is correct for a REACHABLE database with no schema_migrations table, but a
  source that is simply DOWN (ECONNREFUSED, timeout, auth failure) also lands there, so the API
  exits 1 instead of serving the other sources. Frozen criterion C7 requires: with the venture
  source pointed at a closed port, GET /api/today returns HTTP 200 with lexington data and the
  venture entry carrying an error state. Implement this policy:
  (1) packages/sources: add status 'unreachable' (connection-level failure, distinct from
  'unknown' = connected but no readable schema_migrations). checkSourceSchema returns
  'unreachable' with a redacted reason on connection errors. assertSchemaUsable / boot: 'behind'
  and 'unknown' remain fatal; 'unreachable' is NOT fatal and is recorded on the source context.
  (2) apps/api: boot proceeds with unreachable sources marked degraded. On each request that
  touches such a source (health, sources, today), re-run the schema check once with the bounded
  connectionTimeoutMillis; if it now reports ok/ahead, promote the source to live; if behind or
  unknown, keep it in error state (never crash a running API). /api/sources reports
  schemaStatus 'unreachable' for it; /api/health reports reachable false; /api/today sets error
  on that entry and returns 200 with the others intact, within a bounded time.
  (3) apps/api/src/degrade.test.ts: rewrite to the literal C7 scenario: build the app with the
  venture source URL pointing at a closed localhost port (pick one, e.g. 1), boot must succeed,
  GET /api/today returns 200 with a non-empty lexington needsVisit and a non-empty error string
  (no credential) on the pathfinder entry, and GET /api/sources shows 'unreachable' for it. Keep
  any existing post-boot pool-death case as a second test if it still passes.
  (4) packages/shared/src/api.ts: widen the schemaStatus union. apps/web: if it switches on
  schemaStatus, handle the new value; otherwise leave it.
  (5) docs/REPOS_V1.md decision 5: add one sentence stating this policy (unreachable at boot is
  degraded, not fatal; behind or unknown is fatal). Spec before code.
  (6) Run the full verification and finish with git add -A && git commit -m "fix(sources):
  unreachable sources degrade instead of failing boot" (author Bronson Prachyl
  <bronsonprachyl@gmail.com>). Do not push.
owns:
  - packages/sources/src/**
  - packages/shared/src/api.ts
  - apps/api/src/**
  - apps/web/src/**
  - docs/REPOS_V1.md
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Anything you could not make pass goes in unresolved with the failing command. Do not weaken any test to pass.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
