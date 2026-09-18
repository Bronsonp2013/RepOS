task_id: fix-web
project_root: /home/user/RepOS
objective: Fix this reviewer finding.
  - apps/web/src/pages/TodayPage.tsx:17: the isPending || !data guard precedes the error check; in TanStack Query v5 an errored query has data undefined, so an API failure renders Loading forever. Check isError first, drop !data from the pending guard, and add a case to apps/web/src/pages/TodayPage.test.ts (or the existing component test) that renders the error state.
owns:
  - apps/web/src/pages/**
may_read:
  - apps/web/src/**
  - packages/shared/src/**
verification_cmd: npm run typecheck && npm run lint && npm test -- apps/web && npm run build -w apps/web
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Fix exactly the findings listed. Touch only your owned files. Do not refactor anything you were not asked to fix. Anything else goes in unresolved. Do not run git commit.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
