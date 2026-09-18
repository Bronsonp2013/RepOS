task_id: integrate-2
project_root: /home/user/RepOS
objective: Six fixers have just landed remediation for review findings. You are the sole writer for this phase and own every file. Make the whole build green again: run `npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e`, and fix any fallout from the fixers' concurrent edits (most likely: the CORS origin vs the new Playwright preview port; the widened meetingTypes type vs any consumer; the reseeded fixture vs test expectations; lint on newly linted config files). Keep every fix minimal. Confirm the fixture DB repos_test_lexington reflects the current seed-graham.sql (re-apply with psql via REPOS_TEST_SUPERUSER_DATABASE_URL in .env.test if not). Update README '## Status' to 'V1 built; remediation applied; awaiting acceptance'. Finish with git add -A && git commit -m "fix: remediate review findings, suite green" (author Bronson Prachyl <bronsonprachyl@gmail.com>). Do not push.
owns:
  - everything except .orchestrator/** and test/fixtures/pathfinder/migrations/**
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test && npm run build -w apps/web && npm run e2e
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Anything you could not make pass goes in unresolved with the failing command.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
