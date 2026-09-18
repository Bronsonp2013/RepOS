/**
 * Block-level tests for apps/api/src/blocks/*. Owned by the `blocks` lane —
 * distinct from apps/api/src/today.test.ts (C6), which is the endpoint-level
 * test owned by the `routes` lane. Runnable skipped stub: fill in per block
 * (needsVisit, upcomingTrips, pipeline, coverage, totals) as they land.
 * Selected by: npm test -- today-blocks
 */
import { describe, it } from 'vitest';

describe.skip('Today blocks (unit)', () => {
  it.todo('needsVisit orders worst-first by last_visit_at, NULLS FIRST');
  it.todo('upcomingTrips uses BlockContext.now, not the wall clock, for start_date >= today');
  it.todo('pipeline lists prospect_stages in sort_order with live prospect counts');
  it.todo('coverage computes covered vs eligible per active cycle for the current period');
  it.todo('totals matches the per-source sums services/today.ts adds into TodayTotals');
});
