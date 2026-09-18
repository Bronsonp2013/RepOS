task_id: fix2-round2
project_root: /home/user/RepOS
objective: Close the two items acceptance left open.
  (1) C8 / F59-F60: playwright.config.ts now relies on Playwright's own Chromium resolution,
  which points at a browser revision this image does not carry, so `npm run e2e` cannot launch
  a browser unless REPOS_E2E_CHROMIUM_PATH is set, and nothing sets or documents it. Make the
  frozen command `npm run build -w apps/web && npm run e2e` pass unmodified with NO env
  override: resolution order must be REPOS_E2E_CHROMIUM_PATH if set, else Playwright's default
  if its browser is installed (check existence at config-evaluation time or catch the launch
  failure), else the repo-known fallback under /opt/pw-browsers (glob chromium-*/chrome-linux/
  chrome and pick the newest that exists). Document REPOS_E2E_CHROMIUM_PATH in .env.example
  and in the README running section in one line each. Keep reuseExistingServer false.
  (2) F43: one empty-state string in apps/web/src/components still uses text-slate-400 on
  white; find it (grep slate-400 in apps/web/src) and change to slate-600 or darker, matching
  the other three components.
  Run the verification and finish with git add -A && git commit -m "fix(e2e): Chromium fallback
  resolution; close last contrast finding" (author Bronson Prachyl <bronsonprachyl@gmail.com>).
  Do not push.
owns:
  - playwright.config.ts
  - .env.example
  - README.md
  - apps/web/src/components/**
  - apps/web/src/pages/TodayPage.test.ts
may_read:
  - the whole project root
verification_cmd: env -u REPOS_E2E_CHROMIUM_PATH bash -c 'npm run typecheck && npm run lint && npm test -- apps/web && npm run build -w apps/web && npm run e2e'
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Touch only your owned files; anything else goes in unresolved.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
