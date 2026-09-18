task_id: lane-web
project_root: /home/user/RepOS
objective: Build the Today page: TodayPage.tsx, the section and block components, and lib/api.ts as the only fetch site. TanStack Query for server state, useState for local, no other state library. Render the cross-venture header (totals), one section per source in sources order, an error state for any source carrying error, the needsVisit rows with an 'Open in Pathfinder' link per row using the server-precomputed href, upcoming trips with rep-local times as provided by the API, pipeline counts, and coverage bars. Tailwind for styling; must work at phone width. Make e2e/today.spec.ts pass: both venture sections present, the 'Graham Interiors' row, and a link whose href is {webUrl}/accounts/48. The e2e run starts the API and web via playwright.config.ts webServer entries; if the API's /api/today is not yet implemented when you test, say so in unresolved rather than editing apps/api. Never import @repos/sources, pg or express (the eslint boundary rejects it). Do not touch apps/api/**, packages/**, root configs or .env*. Criteria served: C1, C8.
owns:
  - apps/web/src/**
  - apps/web/index.html
  - apps/web/vite.config.ts
  - apps/web/tailwind.config.js
  - apps/web/postcss.config.js
  - e2e/**
may_read:
  - packages/shared/src/**
  - playwright.config.ts
  - .env.test.example
  - .env.test
  - sources.json
  - docs/REPOS_V1.md
verification_cmd: npm run typecheck && npm run lint && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Create or modify only your owned paths. If you need a change outside them (a new dependency, an index.ts export, a server.ts route, a config change), do not make it. Return it in unresolved and the integration worker will apply it.
isolation: Work only inside project_root. Shared toolchains (npm registry, global SDKs, published documentation) are available and exempt. Never read or touch /home/user/reptech-pathfinder. Do not run git commit.
