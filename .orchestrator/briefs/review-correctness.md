task_id: review-correctness
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is done. You have no prior context on it and should
  not seek any beyond the project root. Default to fail when uncertain. Lens: correctness.
  Correctness and edge cases: wrong SQL against the Pathfinder schema (vendored under test/fixtures/pathfinder/migrations; soft delete via deleted_at, address on account_locations, trips/trip_stops shapes after 0006/0008/0012, meeting_types.key nullable, cycles period_key formats in 0025/0026), timezone rendering, NULLS FIRST ordering, the fixed-clock seam leaking into production, degradation timeouts, a source ahead/behind the known migration list, empty venture DB, pagination caps, deep-link hrefs.
owns: none - you are write-forbidden; do not edit, create or delete any file
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer plus one line of what is wrong and a one-line fix hint.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
