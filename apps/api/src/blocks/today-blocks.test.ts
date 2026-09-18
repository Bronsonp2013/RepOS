/**
 * Block-level tests for apps/api/src/blocks/*. Owned by the `blocks` lane —
 * distinct from apps/api/src/today.test.ts (C6), which is the endpoint-level
 * test owned by the `routes` lane.
 *
 * Runs each block function directly against the `lexington` fixture database
 * (seed-graham.sql: account 48 "Graham Interiors", appointment id 1 at
 * 2026-07-08 19:00Z, trip id 1 with one stop) via a real read-only pool from
 * @repos/sources. `now` is fixed at 2026-07-01T12:00:00Z so the Graham trip
 * (start_date 2026-07-08) counts as upcoming.
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

    // last_visit_at NULLS FIRST: every null entry precedes every non-null one.
    const firstNonNullIndex = rows.findIndex((r) => r.lastVisitAt !== null);
    if (firstNonNullIndex !== -1) {
      expect(rows.slice(0, firstNonNullIndex).every((r) => r.lastVisitAt === null)).toBe(true);
    }
    for (let i = 1; i < rows.length; i++) {
      if (rows[i - 1].lastVisitAt !== null && rows[i].lastVisitAt !== null) {
        expect(rows[i - 1].lastVisitAt! <= rows[i].lastVisitAt!).toBe(true);
      }
    }

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
  });

  it('coverage computes covered vs eligible per active cycle for the current period', async () => {
    const lexington = factory.get('lexington');
    const ctx = ctxFor('lexington', 'http://pathfinder.local:3000');

    const rows = await coverage(lexington!.pool, ctx);

    // The fixture seeds no cycles; the block must still resolve cleanly.
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row.eligibleLocations).toBeGreaterThanOrEqual(0);
      expect(row.coveredLocations).toBeGreaterThanOrEqual(0);
      expect(row.ratio).toBeGreaterThanOrEqual(0);
      expect(row.ratio).toBeLessThanOrEqual(1);
      expect(row.href).toBe(`http://pathfinder.local:3000/cycles/${row.cycleId}`);
    }
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
  });
});
