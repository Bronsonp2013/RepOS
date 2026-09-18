task_id: integrate
project_root: /home/user/RepOS
objective: You are the sole writer for this phase and own every file. Five lanes have landed
  (see .orchestrator/state.md lane map). Make the whole build green: run
  `npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e`
  and fix whatever fails, preferring changes to shared files (index.ts barrels, server.ts,
  root configs, package.json, playwright.config.ts) over rewriting lane code. Known open
  items: the web lane's e2e run failed only because the API was not implemented at the time;
  it should pass now, verify. The web lane asked for @testing-library/react + jsdom but worked
  around it with renderToStaticMarkup; do not add the dependency. Also: confirm `npm run dev`
  starts both API and web against .env (document the command in README if missing); confirm
  .env.example lists every variable the code reads (grep process.env across apps and
  packages); confirm no file outside .env.test and test/fixtures/pathfinder/LOCAL_DB.md
  contains a real connection string or password (grep for 'postgres://' and 'repos_reader');
  confirm sources.json holds only slug, name, kind, webUrl. Update README '## Status' to say
  V1 built and under review. Finish with git add -A && git commit -m "feat: integrate lanes,
  full suite green" (author Bronson Prachyl <bronsonprachyl@gmail.com>). Do not push.
owns:
  - everything except .orchestrator/** and test/fixtures/pathfinder/migrations/**
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Anything you could not make pass goes in unresolved with the failing command.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
