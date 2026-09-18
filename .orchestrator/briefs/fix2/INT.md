task_id: fix2-INT
project_root: /home/user/RepOS
objective: Fix these independently verified review findings. You are the sole writer for this phase and run last. First apply your own findings below, then apply every unresolved request the five lanes left (read .orchestrator/fix2-handoffs.json), then make the full verification green, fixing fallout from concurrent lane edits minimally. Set README Status to "V1 reviewed and remediated; awaiting acceptance". Finish with git add -A && git commit -m "fix: apply verified review findings across all lanes" (author Bronson Prachyl <bronsonprachyl@gmail.com>). Do not push.
  Findings:
  - F16 [major] apps/api/src/index.ts:30-31: Number(env) yields NaN for a non-numeric value, and pg then drops BOTH bounds: the connect timeout falls back to 0 (disabled) and statement_timeout is never sent. FIX: Validate both env numbers at boot with Number.isFinite(n) && n > 0 and refuse to start otherwise.
  - F19,F33 [minor] apps/api/src/index.ts:57-65: app.listen has no 'error' listener so EADDRINUSE becomes an uncaught exception, there is no SIGTERM/SIGINT handler, and the boot-failure catch sets exitCode without closing pools already opened. FIX: Attach server.on('error'), add a SIGTERM/SIGINT handler that closes the server then factory.close(), and hoist the factory so the catch can close it.
  - F24b,F49b [minor] .env.example:26, apps/web/package.json:14-15: The env template still ships VITE_API_BASE_URL=http://127.0.0.1:3200, which reintroduces the cross-origin base after the same-origin fix, and apps/web declares date-fns and date-fns-tz although only apps/api imports them. FIX: Drop VITE_API_BASE_URL from .env.example (or document it as dev-only) and remove both date-fns packages from apps/web/package.json.
  - F59,F60 [major] playwright.config.ts:29, 41: The Chromium executablePath defaults to a sandbox-only path with no fallback to Playwright's own resolution, and reuseExistingServer: !CI lets e2e reuse a dev API started from .env with real source credentials. FIX: Fall back to Playwright's default resolution when REPOS_E2E_CHROMIUM_PATH is unset (documenting the override), and set reuseExistingServer: false for the API server or give e2e its own port.
  - F62b [minor] apps/api/src/index.ts:19-59: The whole API bootstrap is uncovered: no test imports index.ts, and REPOS_API_HOST is never exercised with a non-default value. FIX: Extract host/port/timeout resolution into a small exported helper and unit-test it, including a non-default REPOS_API_HOST and a non-numeric timeout.
owns:
  - everything except .orchestrator/** and test/fixtures/pathfinder/migrations/**
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix, and do not weaken or delete a test to pass. A change you need outside your owned paths goes in unresolved as a precise one-line request. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder. The local fixture databases (see .env.test) are available.
