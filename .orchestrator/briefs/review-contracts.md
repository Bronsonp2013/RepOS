task_id: review-contracts
project_root: /home/user/RepOS
objective: Try to REFUTE that five implementation lanes can independently satisfy the frozen
  criteria C1-C9 (in .orchestrator/state.md) against the contracts now on disk. You have no
  prior context on this build and should not seek any. Read packages/shared/src/api.ts,
  packages/sources/src/{types,index}.ts, apps/api/src/server.ts, every *.test.ts and
  e2e/today.spec.ts, the block stubs, the web stubs, playwright.config.ts, vitest.config.ts,
  sources.json, .env.test.example, and the lane briefs in .orchestrator/briefs/lane-*.md.
  Look for: a test that asserts a field or shape the contract types do not carry (for example
  the needsVisit deep-link href, the rendered rep-local time string, the per-source error
  field, schemaStatus values); two lanes that both need to edit the same file to pass; a
  criterion no lane can meet without a shared-file change the integrator would have to make
  (list those as majors, not blockers, if the change is mechanical); a test filter in the
  criteria (npm test -- X) that selects the wrong file; a stub whose signature the tests call
  differently; an eslint boundary that would block a lane's legitimate import; anything in the
  vendored migrations that contradicts a column the stubs or tests name. Default to fail when
  uncertain. A blocker is something that would make a lane's work unusable; a major is a
  mismatch the integrator can fix mechanically.
owns: none - you are write-forbidden; do not edit, create or delete any file
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack
  traces or test output. Every finding is a file:line pointer plus one line of what is wrong.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
