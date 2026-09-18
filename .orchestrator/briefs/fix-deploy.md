task_id: fix-deploy
project_root: /home/user/RepOS
objective: Fix these reviewer findings.
  - Dockerfile:18: ENV NODE_ENV=production precedes npm ci so dev deps (tsx, vite, typescript) are omitted. Set NODE_ENV only in the runtime stage or use npm ci --include=dev in the build stage.
  - Dockerfile:31,39 and repo root: no .dockerignore, so COPY . . bakes .env, .env.test, LOCAL_DB.md, node_modules, .git and .orchestrator into the image. Add .dockerignore covering .env*, node_modules, .git, .orchestrator, test-results, playwright-report, dist, test/fixtures/pathfinder/LOCAL_DB.md.
  - Dockerfile:36: runtime stage runs as root. Add USER node after the COPY steps and make ownership work.
  - docker-compose.yml:25: publishes the API on every host interface. Publish loopback-only: '127.0.0.1:${REPOS_API_PORT:-3200}:3200'.
  - Caddyfile.example:8: the site serving the web bundle sets no security headers. Add a header block (a reasonable CSP for a same-origin SPA, X-Frame-Options DENY, Referrer-Policy no-referrer).
  - playwright.config.ts:42: reuseExistingServer silently reused a leftover dev server on :5173, so 'built bundle' is not guaranteed. Use a preview port not shared with npm run dev and set reuseExistingServer false for the web entry (keep it for CI-friendliness on the API if you must, but the web must be the built preview).
  - eslint.config.mjs:15: lint ignores **/*.config.ts. Drop that ignore, lint those files with the node/tooling rule set, and fix any lint errors that surface in vitest.config.ts, playwright.config.ts and apps/web/vite.config.ts.
  No Docker daemon exists here; verify the Dockerfile by careful read-through and say so in handoff_note.
owns:
  - Dockerfile
  - .dockerignore
  - docker-compose.yml
  - Caddyfile.example
  - playwright.config.ts
  - eslint.config.mjs
  - vitest.config.ts
  - apps/web/vite.config.ts
  - docs/DEPLOY.md
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
