task_id: review-security
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is done. You have no prior context on it and should
  not seek any beyond the project root. Default to fail when uncertain. Lens: security.
  Security and data loss: any code path that could write to a source database (grep every pg call, every pool creation, every connection string construction); a credential reaching a log line, an error response, the web bundle or a committed file; sources.json or .env* leaks; the API listening on all interfaces by default; CORS or headers that would expose the tailnet-only assumption; anything that reads outside the declared sources.
owns: none - you are write-forbidden; do not edit, create or delete any file
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer plus one line of what is wrong and a one-line fix hint.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
