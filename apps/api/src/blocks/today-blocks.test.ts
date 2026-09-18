/**
 * Block-level tests for apps/api/src/blocks/*. Owned by the `blocks` lane —
 * distinct from apps/api/src/today.test.ts (C6), which is the endpoint-level
 * test owned by the `routes` lane.
 *
 * Runs each block function directly against the `lexington` fixture database
 * (seed-graham.sql: account 48 "Graham Interiors", appointment id 1 at
 * 2026-07-08 19:00Z, trip id 1 with one stop) via a real read-only pool from
 * @repos/sources. `now` is fixed at 2026-07-01T12:00:00Z so the Graham trip
 * (start_date 2026-07-08) counts as upcoming. See seed-graham.sql's header
 * for accounts 51-53, prospect_stages id 8 and cycles 2-3, added to cover
 * previously-untested paths (weekly/custom period_key, a soft-deleted
 * account's trip stop, an unstaged/deprecated-stage prospect, a
 * non-active-stage never-visited account).
 * Selected by: npm test -- today-blocks
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SourcePoolFactory } from '@repos/sources';
import { loadSourceConfigs, createSourcePools } from '@repos/sources';
import type { BlockContext } from './context';
import { needsVisit } from './needsVisit';
import { upcomingTrips } from './upcomingTrips';
import { pipeline } from './pipeline';
import { coverage } from './coverage';
import { totals } from './totals';

const NOW = new Date('2026-07-01T12:00:00Z');
const TIMEZONE = 'America/Chicago';

let factory: SourcePoolFactory;

function ctxFor(slug: string, webUrl: string): BlockContext {
  return { slug, kind: 'territory', webUrl, timezone: TIMEZONE, now: NOW };
}

beforeAll(async () => {
  const configs = await loadSourceConfigs();
  factory = await createSourcePools(configs);
});

afterAll(async () => {
  await factory?.close();
});

describe('Today blocks (unit)', () => {
  it('needsVisit orders worst-first by last_visit_at, NULLS FIRST, top 8', async () => {
    const lexington = factory.get('lexington');
    expect(lexington).toBeDefined();
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await needsVisit(lexington!.pool, ctx);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(8);

    // Seeded fixture's top 5 live accounts, worst-first, NULLS FIRST:
    // 48 (never visited), 52 (never visited, stage 'dormant' — NULLS group
    // orders by name after 48), 49 (visited 2026-01-15), 50 (visited
    // 2026-06-20), 53 (visited 2026-06-25). Account 51 is soft-deleted and
    // never appears (F2's sibling case for this block).
    expect(rows.map((r) => r.accountId)).toEqual([48, 52, 49, 50, 53]);

    const graham = rows.find((r) => r.accountId === 48);
    expect(graham).toMatchObject({
      name: 'Graham Interiors',
      accountType: 'designer',
      city: 'Dallas',
      state: 'TX',
      lastVisitAt: null,
      daysSinceVisit: null,
      href: 'http://pathfinder.local:3000/accounts/48',
    });
  });

  it('needsVisit surfaces a non-active-stage never-visited account like any other (F7)', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await needsVisit(lexington!.pool, ctx);

    // Account 52 is stage 'dormant', not 'active'; needsVisit has no stage
    // filter, so it is ordered purely by last_visit_at like account 48.
    const dormant = rows.find((r) => r.accountId === 52);
    expect(dormant).toMatchObject({
      name: 'TEST — Dormant Never Visited',
      lastVisitAt: null,
      daysSinceVisit: null,
      href: 'http://pathfinder.local:3000/accounts/52',
    });
  });

  it('upcomingTrips uses BlockContext.now, not the wall clock, for start_date >= today', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await upcomingTrips(lexington!.pool, ctx);

    const graham = rows.find((t) => t.tripId === 1);
    expect(graham).toBeDefined();
    expect(graham).toMatchObject({
      name: 'TEST — Graham Interiors trip',
      startDate: '2026-07-08',
      endDate: '2026-07-08',
      href: 'http://pathfinder.local:3000/trips/1',
      stopCount: 1,
    });
    expect(graham!.stops).toHaveLength(1);
    expect(graham!.stops[0]).toMatchObject({
      stopId: 1,
      accountId: 48,
      accountName: 'Graham Interiors',
      stopDate: '2026-07-08',
      sequence: 1,
      startsAt: '2026-07-08T19:00:00.000Z',
      startsAtLocal: '2026-07-08 2:00 PM',
      meetingType: { key: 'presentation', name: 'Presentation' },
    });

    // A trip that starts before `now` would be filtered out by every row here.
    for (const trip of rows) {
      expect(trip.startDate >= '2026-07-01').toBe(true);
    }
  });

  it('upcomingTrips drops a stop whose account is soft-deleted (F2)', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await upcomingTrips(lexington!.pool, ctx);

    // Trip 1 also has a stop (id 2) for account 51, which is soft-deleted.
    // The stops query's accounts JOIN filters that row out entirely, so it
    // must not surface here even though the trip_stops row itself exists.
    const graham = rows.find((t) => t.tripId === 1);
    expect(graham!.stopCount).toBe(1);
    expect(graham!.stops.some((s) => s.accountId === 51)).toBe(false);
  });

  it('upcomingTrips would exclude the Graham trip once `now` moves past its start date', async () => {
    const lexington = factory.get('lexington');
    const ctx: BlockContext = {
      ...ctxFor('lexington', 'http://pathfinder.local:3000'),
      now: new Date('2026-07-09T12:00:00Z'),
    };

    const rows = await upcomingTrips(lexington!.pool, ctx);
    expect(rows.find((t) => t.tripId === 1)).toBeUndefined();
  });

  it('pipeline lists prospect_stages in sort_order with live prospect counts', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await pipeline(lexington!.pool, ctx);

    expect(rows.length).toBeGreaterThan(0);
    const sortOrders = rows.map((r) => r.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));

    const researched = rows.find((r) => r.key === 'researched');
    expect(researched).toMatchObject({
      label: 'Researched',
      href: 'http://pathfinder.local:3000/prospects?stage=researched',
    });
    for (const row of rows) {
      expect(row.prospectCount).toBeGreaterThanOrEqual(0);
    }

    // Prospect id 3 points at prospect_stages id 8, which is soft-deleted.
    // pipeline.ts's WHERE ps.deleted_at IS NULL drops that stage's group
    // entirely, so this prospect contributes to no row here — see the
    // matching totals.ts assertion (F4) for the mismatch this leaves.
    const pipelineTotal = rows.reduce((sum, r) => sum + r.prospectCount, 0);
    expect(pipelineTotal).toBe(2);
  });

  it('coverage computes covered vs eligible per active cycle for the current period', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await coverage(lexington!.pool, ctx);

    // Fixture seeds one active monthly cycle (id 1). `now` (2026-07-01T12:00Z,
    // America/Chicago) falls in period_key '2026-07'. Eligible locations: the
    // three seeded accounts' primary locations (48, 49, 50) minus the one
    // cycle_exclusions row for 49's location, = 2. Covered: cycle_progress
    // covers 48's location for '2026-07', = 1.
    // Fixture also seeds an active weekly cycle (id 2) and an active custom
    // cycle (id 3, every 2 weeks from anchor 2026-06-01), each with exactly
    // one eligible location (account 53's) and zero covered (F1 — the
    // weekly/custom period_key branches were previously untested; only
    // cycle 1's 'monthly' branch was exercised).
    expect(rows.length).toBe(3);
    const cycle = rows.find((r) => r.cycleId === 1);
    expect(cycle).toMatchObject({
      cycleId: 1,
      name: 'TEST — Coverage cycle',
      period: 'monthly',
      periodKey: '2026-07',
      eligibleLocations: 2,
      coveredLocations: 1,
      ratio: 0.5,
      href: 'http://pathfinder.local:3000/cycles/1',
    });

    const weekly = rows.find((r) => r.cycleId === 2);
    expect(weekly).toMatchObject({
      name: 'TEST — Weekly coverage cycle',
      period: 'weekly',
      periodKey: '2026-W27',
      eligibleLocations: 1,
      coveredLocations: 0,
      ratio: 0,
      href: 'http://pathfinder.local:3000/cycles/2',
    });

    const custom = rows.find((r) => r.cycleId === 3);
    expect(custom).toMatchObject({
      name: 'TEST — Custom coverage cycle',
      period: 'custom',
      periodKey: '2026-06-01+2w#2',
      eligibleLocations: 1,
      coveredLocations: 0,
      ratio: 0,
      href: 'http://pathfinder.local:3000/cycles/3',
    });
  });

  it('totals matches the per-source sums services/today.ts adds into TodayTotals', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const result = await totals(lexington!.pool, ctx);

    // Graham Interiors: stage 'active', never visited, trip starts 2026-07-08
    // (next week relative to the fixed `now`, so outside this week).
    expect(result.activeAccounts).toBeGreaterThanOrEqual(1);
    expect(result.staleAccounts).toBeGreaterThanOrEqual(1);
    expect(result.tripsThisWeek).toBe(0);
    expect(result.prospectsInPipeline).toBeGreaterThanOrEqual(0);

    // Fixture seeds 3 live, non-archived prospects (ids 1, 2, 3), the third
    // pointed at a soft-deleted prospect_stages row (id 8). totals.ts has no
    // stage-liveness filter, so it counts all 3 — one more than pipeline.ts's
    // stage-grouped breakdown sums to (F4, previously untested).
    expect(result.prospectsInPipeline).toBe(3);
  });
});
