/**
 * C6 — GET /api/today against the fixture databases.
 * Endpoint-level test, owned by the `routes` lane (block-level tests live in
 * apps/api/src/blocks/today-blocks.test.ts, owned by the `blocks` lane).
 * Asserts the four block outputs as seen through the assembled response:
 *   - lexington needsVisit lists account 48 first (never visited);
 *   - lexington upcomingTrips contains the trip anchored on appointment 1,
 *     rendered as 2026-07-08 2:00 PM America/Chicago;
 *   - the venture source shows zero accounts and zero prospects;
 *   - pipeline lists prospect_stages in sort_order; coverage is present.
 * Selected by: npm test -- today
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { createSourcePools, loadSourceConfigs } from '@repos/sources';
import { createServer } from './server';

// Fixed so the Graham trip (start_date 2026-07-08) reads as upcoming,
// regardless of when the suite actually runs. Injected via createServer's
// `now` option (F21) rather than a module-global override.
const FIXED_NOW = new Date('2026-07-01T12:00:00Z');

let factory: SourcePoolFactory;
let app: Express;

beforeAll(async () => {
  const configs = await loadSourceConfigs();
  factory = await createSourcePools(configs);
  app = createServer(factory, { now: () => FIXED_NOW });
});

afterAll(async () => {
  await factory?.close();
});

describe('GET /api/today (C6)', () => {
  it('lists account 48 first under lexington needsVisit (never visited)', async () => {
    const res = await request(app).get('/api/today');
    expect(res.status).toBe(200);

    const lexington = (res.body.sources as Array<Record<string, unknown>>).find((s) => s.slug === 'lexington');
    expect(lexington).toBeDefined();
    const needsVisit = lexington!.needsVisit as Array<Record<string, unknown>>;
    expect(needsVisit[0]).toMatchObject({ accountId: 48, name: 'Graham Interiors', lastVisitAt: null });
  });

  it('renders the trip anchored on appointment 1 as 2026-07-08 2:00 PM America/Chicago', async () => {
    const res = await request(app).get('/api/today');
    const lexington = (res.body.sources as Array<Record<string, unknown>>).find((s) => s.slug === 'lexington');
    const trips = lexington!.upcomingTrips as Array<Record<string, unknown>>;
    const graham = trips.find((t) => t.tripId === 1);

    expect(graham).toBeDefined();
    expect(lexington!.timezone).toBe('America/Chicago');
    const stops = graham!.stops as Array<Record<string, unknown>>;
    expect(stops[0]).toMatchObject({
      accountId: 48,
      startsAt: '2026-07-08T19:00:00.000Z',
      startsAtLocal: '2026-07-08 2:00 PM',
    });
  });

  it('shows zero accounts and zero prospects for the venture source', async () => {
    const res = await request(app).get('/api/today');
    const sources = res.body.sources as Array<Record<string, unknown>>;
    const pathfinder = sources.find((s) => s.slug === 'pathfinder');
    const lexington = sources.find((s) => s.slug === 'lexington');

    expect(pathfinder).toBeDefined();
    expect(pathfinder!.error).toBeUndefined();
    expect(pathfinder!.needsVisit).toEqual([]);
    const totals = pathfinder!.totals as Record<string, number>;
    expect(totals.activeAccounts).toBe(0);
    expect(totals.prospectsInPipeline).toBe(0);

    // Positive control: lexington seeds two live prospects (seed-graham.sql),
    // the venture DB seeds none, so this isn't a query that returns zero rows
    // no matter what it's given.
    const lexingtonPipeline = lexington!.pipeline as Array<Record<string, number>>;
    const lexingtonProspectSum = lexingtonPipeline.reduce((sum, row) => sum + row.prospectCount, 0);
    expect(lexingtonProspectSum).toBe(2);

    const pathfinderPipeline = pathfinder!.pipeline as Array<Record<string, number>>;
    const pathfinderProspectSum = pathfinderPipeline.reduce((sum, row) => sum + row.prospectCount, 0);
    expect(pathfinderProspectSum).toBe(0);
  });

  it('lists prospect_stages in sort_order and returns a coverage block', async () => {
    const res = await request(app).get('/api/today');
    const lexington = (res.body.sources as Array<Record<string, unknown>>).find((s) => s.slug === 'lexington');

    const pipeline = lexington!.pipeline as Array<Record<string, number>>;
    expect(pipeline.length).toBeGreaterThan(0);
    const sortOrders = pipeline.map((p) => p.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));

    expect(Array.isArray(lexington!.coverage)).toBe(true);
  });
});
