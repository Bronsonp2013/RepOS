task_id: review2-A
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is correct through one lens. Default to fail when
  uncertain. You have no prior context on this build beyond the pointers below, which came from
  an earlier read-only survey: treat them as hypotheses to confirm or refute, not as findings,
  and look beyond them. Lens: data correctness against the Pathfinder schema.
  Read: apps/api/src/blocks/*.ts, apps/api/src/services/sourceContext.ts, packages/shared/src/cyclePeriod.ts, the vendored migrations under test/fixtures/pathfinder/migrations/ (soft delete via deleted_at, address on account_locations after 0014, trips/trip_stops shapes after 0006/0008/0012, meeting_types.key nullable per 0015, cycles period_key formats per 0025/0026), and test/fixtures/pathfinder/seed-graham.sql.
  Must answer: For EVERY SQL statement: does each joined table filter deleted_at IS NULL where the migration defines that column (hypothesis: upcomingTrips.ts:72-77 misses trip_stops.deleted_at; check whether trip_stops has that column at all). Does coverage.ts:48's period fallback (anchored_on ?? nowLocal) produce a key that real cycle_progress rows can match for each period kind? Do totals.ts (week-overlap) and upcomingTrips.ts (start_date >= today) define 'trip' consistently enough for the header to be honest? Are bigint ids converted without precision risk? Is users.id = 1 the right rep identity for a Pathfinder V1 database? Run each block query by hand against repos_test_lexington to confirm any claimed row difference. Return a per-query verdict.
owns: none - you are write-forbidden; do not edit, create or delete any file
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer, one line of what is wrong, a one-line fix hint, and the cheapest way to refute it. Keep each string under 200 characters.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder. Shared toolchains and the local fixture databases (connection details in .env.test) are available; you may run read-only SQL against repos_test_lexington and repos_test_venture.
