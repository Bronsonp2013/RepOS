task_id: review2-verify
project_root: /home/user/RepOS
objective: You are the adversarial verifier. You receive the merged findings of five reviewers
  (pasted below the brief in your prompt). For EACH finding, try to refute it in the cheapest
  way that is conclusive: run the block SQL by hand against repos_test_lexington with and
  without the proposed filter and compare row counts (if identical AND no seed row exercises
  the case, downgrade to 'untested' with a fixture-row request rather than 'bug'); start the
  API with the venture on the closed port from .env.test and fire 20 concurrent GET /api/today
  to count rechecks; grep -rn for each claimed dead export and let one non-test consumer refute
  it; for doc claims, quote the line or drop the finding; for deploy claims, read the exact
  config lines. Merge duplicates across reviewers. Then assign every ACCEPTED finding to exactly
  one lane: L1 blocks (apps/api/src/blocks/*.ts + today-blocks.test.ts), L2 services
  (apps/api/src/services/**, routes/**, degrade/today/sources/credentials-api tests), L3 sources
  (packages/sources/src/* except index.ts), L4 web (apps/web/src/**, e2e/today.spec.ts),
  L5 deploy-docs (Dockerfile, docker-compose.yml, Caddyfile.example, docs/*.md, README.md,
  test/fixtures/pathfinder/README.md), or INT (integrator: package.json files, lockfile,
  index.ts barrels, server.ts, apps/api/src/index.ts, root configs, sources.json, .env*).
  A finding whose fix spans lanes is split into per-lane parts. Design decisions already made
  by the owner and to be applied as fixes, not re-litigated: same-origin deploy via Caddy (web
  API base default '' and container bind 0.0.0.0 via compose environment only); 60 s refetch
  with 30 s staleTime and a visible 'as of'; keep the fixed-clock fixture but inject now via
  createServer options instead of a module global; sync REPOS_V1 sections 2.3, 4 and 7 and
  DEPLOY.md to the built API and the nine criteria in .orchestrator/state.md; keep HTTP 200
  per-source degrade but distinguish query_error from unreachable in the error string and log
  query errors at error level; keep tripsThisWeek overlap semantics and document them; keep
  users.id = 1.
owns: none - you are write-forbidden; do not edit, create or delete any file (running the API
  or read-only SQL is fine; stop any process you start)
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: verified_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Keep each string under 220 characters.
unresolved: not applicable
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
