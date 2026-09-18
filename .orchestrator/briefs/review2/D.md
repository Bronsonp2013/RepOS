task_id: review2-D
project_root: /home/user/RepOS
objective: Try to REFUTE that this build is correct through one lens. Default to fail when
  uncertain. You have no prior context on this build beyond the pointers below, which came from
  an earlier read-only survey: treat them as hypotheses to confirm or refute, not as findings,
  and look beyond them. Lens: web UX, accessibility and client state.
  Read: apps/web/src/** (all files), packages/shared/src/api.ts, e2e/today.spec.ts, apps/web/package.json, apps/web/vite.config.ts.
  Must answer: What renders when /api/today returns sources: [] (hypothesis: empty header, no message)? Is API JSON validated at runtime anywhere (hypothesis: lib/api.ts:34 casts to T)? Is there an error boundary; what happens on a render throw? Heading structure (hypothesis: no h1), progress bars without ARIA, error and loading regions without role/aria-busy. Is the 'Open in Pathfinder' literal (NeedsVisitBlock.tsx:35) used as the e2e selector, and is it wrong for a non-Pathfinder source? Does a trailing slash in sources.json webUrl produce a double slash in hrefs (built server-side; say where the fix belongs)? Query client policy: staleTime, refetchInterval, and whether a dashboard that never refetches is acceptable. Dead code: fetchSources/fetchHealth, queryKeys.sources/health, date-fns and date-fns-tz deps, the @web alias, the catch-all route. Phone width behaviour from the responsive classes.
owns: none - you are write-forbidden; do not edit, create or delete any file
verification_cmd: npm run typecheck && npm run lint && npm test
return_schema: review_findings
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces or test output. Every finding is a file:line pointer, one line of what is wrong, a one-line fix hint, and the cheapest way to refute it. Keep each string under 200 characters.
unresolved: not applicable - report everything as findings
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder. Shared toolchains and the local fixture databases (connection details in .env.test) are available; you may run read-only SQL against repos_test_lexington and repos_test_venture.
