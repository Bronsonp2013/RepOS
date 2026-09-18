task_id: fix2-accept
project_root: /home/user/RepOS
objective: You are the acceptance worker for review run 2, write-forbidden, with no prior
  context. Inputs: (1) the nine frozen criteria in /home/user/RepOS/.orchestrator/state.md,
  run each command exactly as written and record the real exit code; (2) the accepted
  findings list in /home/user/RepOS/.orchestrator/fix2-verified.json: for each, check by
  reading and, where cheap, by executing (start the API against .env.test; fire 20 concurrent
  GET /api/today with the venture on the closed port from REPOS_TEST_CLOSED_DATABASE_URL and
  confirm a single recheck; hold 5 pooled connections with pg_sleep and confirm the response
  is not a false outage; curl the built preview and confirm API calls are relative /api;
  render nothing in a browser, but grep for h1, role=progressbar, role=alert, role=status)
  whether it is closed, and if not, why. Stop every process you start. Accept only if every
  criterion is met AND every blocker and major finding is closed or explicitly deferred with a
  reason you agree with.
owns: none - you are write-forbidden
may_read:
  - the whole project root
verification_cmd: the nine commands in the frozen criteria table, each run individually
return_schema: acceptance2
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Keep every string under 220 characters.
unresolved: not applicable - report in blocking
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
