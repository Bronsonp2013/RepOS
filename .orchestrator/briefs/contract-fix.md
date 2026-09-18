task_id: contract-fix
project_root: /home/user/RepOS
objective: Apply these contract corrections, found by an independent review, before the
  implementation lanes start. Mechanical changes only; do not implement any block, route or
  page. (1) packages/shared/src/api.ts: upcoming-trip anchored appointments expose the meeting
  type as { id, key: string | null, name } (rep-created meeting types have NULL key per
  migration 0015); document meetingTypeKey/meeting type null semantics accordingly. Add a
  totals block contract: TodayTotals stays as is, but add a per-source `totals` field
  { activeAccounts, prospectsInPipeline, tripsThisWeek, staleAccounts } that
  services/today.ts will sum. Document that upcomingTrips uses BlockContext.now, not the wall
  clock. (2) apps/api/src/blocks/totals.ts: a typed stub matching the other block stubs,
  exported through whatever barrel the other blocks use; apps/api/src/blocks/context.ts:
  ensure BlockContext carries `now: Date` and `timezone: string`. (3) packages/sources/src/
  types.ts: add `connectionTimeoutMillis?: number` (and `statementTimeoutMillis?` if cheap) to
  the CreateSourcePools options; do not implement pool.ts. (4) packages/shared/src/
  cyclePeriod.ts: implement and unit-test `cyclePeriodKey(period, anchoredOn, now, custom?)`
  producing the period_key formats documented in
  test/fixtures/pathfinder/migrations/0025_cycles.sql and 0026_cycle_periods.sql (read the
  comments there; monthly, quarterly, semiannual, annual, custom every-N-unit). Export it from
  the shared barrel. (5) playwright.config.ts: the web webServer entry runs the built bundle
  (`npm run preview -w apps/web` with a fixed port) so C8 exercises the build; keep the API
  entry. (6) Move apps/api/src/today.test.ts's ownership note: leave the file where it is but
  update its header comment to say it is the endpoint-level test owned by the routes lane, and
  create apps/api/src/blocks/today-blocks.test.ts as a runnable skipped stub for block-level
  tests (owned by the blocks lane). (7) docs/REPOS_V1.md §7 item 5: migration 0015 seeds five
  meeting types; change the wording to 'the two hand-added meeting types are present among
  the seeded set'. (8) Run the verification and finish with git add -A && git commit -m
  "fix(contracts): review corrections before lanes" (author Bronson Prachyl
  <bronsonprachyl@gmail.com>). Do not push.
owns:
  - packages/shared/src/**
  - packages/sources/src/types.ts
  - apps/api/src/blocks/totals.ts
  - apps/api/src/blocks/context.ts
  - apps/api/src/blocks/index.ts
  - apps/api/src/blocks/today-blocks.test.ts
  - apps/api/src/today.test.ts
  - playwright.config.ts
  - docs/REPOS_V1.md
may_read:
  - the whole project root
verification_cmd: npm run typecheck && npm run lint && npm test -- cyclePeriod
return_schema: build_report
forbidden_returns: Do not return file contents, diffs, code excerpts over five lines, stack traces, test output, command transcripts or build logs. Report file:line pointers and exit codes only. Keep all free text under 1500 characters total.
unresolved: Anything outside your owned paths that you needed goes in unresolved.
isolation: Work only inside project_root. Never read /home/user/reptech-pathfinder.
