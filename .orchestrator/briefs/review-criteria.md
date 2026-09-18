task_id: review-criteria
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is done. You have no prior context on it and should
  not seek any beyond the project root. Default to fail when uncertain. Lens: criteria.
  The frozen acceptance criteria C1-C9 in .orchestrator/state.md, verbatim. Run every verification command yourself and record its exit code. Then try to show a criterion passes for the wrong reason: a test that mocks what it claims to prove, a skipped test, a filter that selects nothing, an e2e assertion that would pass on an empty page.
owns: none - you are write-forbidden; do not edit, create or delete any file
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer plus one line of what is wrong and a one-line fix hint.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
