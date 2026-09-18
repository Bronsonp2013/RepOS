task_id: fix-api
project_root: /home/user/RepOS
objective: Fix these reviewer findings.
  - apps/api/src/server.ts:25: app.use(cors()) sends Access-Control-Allow-Origin: *; with no auth, any website a tailnet browser visits can read customer data. Use cors({ origin: REPOS_WEB_ORIGIN from env, methods: ['GET'] }) and fail closed (refuse to boot, or deny all origins) when it is unset in production; in non-production default it to the web dev/preview origin the e2e uses. Document REPOS_WEB_ORIGIN in .env.example and set it in .env.test and .env.test.example so npm run e2e still passes.
  - apps/api/src/server.ts:39: the 500 handler serializes raw err.message, bypassing errorMessage()/redactCredentials(). Use errorMessage(err), and add apps/api/src/credentials-api.test.ts: a supertest case that forces a 500 (e.g. a source pool whose query rejects with an error message containing postgres://user:secret@host/db) and asserts no credential-shaped string reaches the body.
  - apps/api/src/index.ts:46: app.listen(PORT) binds 0.0.0.0, contradicting the tailnet-only decision. Listen on process.env.REPOS_API_HOST ?? '127.0.0.1'; document it in .env.example.
  - apps/api/src/services/redact.ts:8: the credential regex misses passwords containing '/'. Broaden it to match scheme://anything-up-to-the-last-@ before the host, and add a unit case.
  - apps/api/src/services/sourceContext.ts:32: filtering key IS NOT NULL hides rep-created meeting types (NULL key per migration 0015), so the venture's hand-added Discovery call and Demo never surface. Return { id, key, name } rows without that predicate; widen SourceSummary.meetingTypes in packages/shared/src/api.ts accordingly; update apps/api/src/sources.test.ts to assert name is present and all five seeded types appear; update apps/web only if it compiles against the old shape (it should not reference meetingTypes; if it does, say so in unresolved rather than editing apps/web).
  - apps/api/src/services/today.ts:24: the module-global nowOverride setter ships unguarded. Guard it so it throws when NODE_ENV === 'production'.
owns:
  - apps/api/src/server.ts
  - apps/api/src/index.ts
  - apps/api/src/services/**
  - apps/api/src/sources.test.ts
  - apps/api/src/credentials-api.test.ts
  - packages/shared/src/api.ts
  - .env.example
  - .env.test
  - .env.test.example
may_read:
  - apps/api/src/**
  - packages/**
  - apps/web/src/lib/api.ts
  - playwright.config.ts
  - e2e/**
verification_cmd: npm run typecheck && npm run lint && npm test -- apps/api/src/ && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
