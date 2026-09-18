task_id: review2-E
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is correct through one lens. Default to fail when
  uncertain. You have no prior context on this build beyond the pointers below, which came from
  an earlier read-only survey: treat them as hypotheses to confirm or refute, not as findings,
  and look beyond them. Lens: deploy truth, documentation truth, and test adequacy.
  Read: Dockerfile, docker-compose.yml, Caddyfile.example, .dockerignore, docs/REPOS_V1.md, docs/DEPLOY.md, README.md, CLAUDE.md, playwright.config.ts, vitest.config.ts, test/setup/*, apps/api/src/index.ts, apps/web/src/lib/api.ts, packages/shared/src/api.ts, and the names and describe blocks of every *.test.ts file.
  Must answer: Confirm or refute: apps/api/src/index.ts binds 127.0.0.1 by default so compose's published port cannot reach the container; apps/web/src/lib/api.ts defaults to an absolute http://127.0.0.1:3200 base that the Caddyfile CSP (connect-src 'self') would block; compose hardcodes container port 3200 while the app reads REPOS_API_PORT. Produce a doc-drift table for docs/REPOS_V1.md sections 2 to 8 and docs/DEPLOY.md and README.md against the code (hypotheses: section 2.3 claims DATABASE_URL lives in sources.json; section 4 field lists are stale; section 7 lists eight criteria while README cites nine; sources.example.json never existed; DEPLOY.md points at the wrong place for fixture setup). List behaviours with zero test coverage (hypotheses: coverage arithmetic beyond isArray, trip_stops.deleted_at, redaction at pool.ts:52, the empty-sources UI, REPOS_API_HOST honoured). Flag e2e flakiness sources (hardcoded Chromium path, hardcoded origin string, reuseExistingServer off-CI).
owns: none - you are write-forbidden; do not edit, create or delete any file
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer, one line of what is wrong, a one-line fix hint, and the cheapest way to refute it. Keep each string under 200 characters.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder. Shared toolchains and the local fixture databases (connection details in .env.test) are available; you may run read-only SQL against repos_test_lexington and repos_test_venture.
