/**
 * C7 — one unreachable source degrades only its own section.
 * Owned by the `routes` lane. Boots the factory against real, reachable
 * sources (schema check passes for both, per docs/REPOS_V1.md §7.7), then
 * simulates "stopping the venture's Postgres" (docs/REPOS_V1.md §7.6) by
 * ending the pathfinder pool after boot, and asserts the request still
 * succeeds with lexington data intact.
 * Selected by: npm test -- degrade
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { createSourcePools, loadSourceConfigs } from '@repos/sources';
import { createServer } from './server';

let factory: SourcePoolFactory;
let app: Express;

beforeAll(async () => {
  const configs = await loadSourceConfigs();
  factory = await createSourcePools(configs);
  app = createServer(factory);

  // Simulate the venture's Postgres going down *after* boot succeeded: end
  // its pool so subsequent queries reject, without touching the schema
  // check that already passed.
  const pathfinder = factory.get('pathfinder');
  if (!pathfinder) throw new Error('pathfinder source not configured for this test');
  await pathfinder.pool.end();
});

afterAll(async () => {
  await factory?.close();
});

describe('degradation (C7)', () => {
  it('returns HTTP 200 with lexington data when the venture source is unreachable', async () => {
    const res = await request(app).get('/api/today');
    expect(res.status).toBe(200);

    const lexington = (res.body.sources as Array<Record<string, unknown>>).find((s) => s.slug === 'lexington');
    expect(lexington).toBeDefined();
    expect(lexington!.error).toBeUndefined();
    expect(Array.isArray(lexington!.needsVisit)).toBe(true);
    expect((lexington!.needsVisit as unknown[]).length).toBeGreaterThan(0);
  });

  it('carries an error state on the unreachable venture entry only', async () => {
    const res = await request(app).get('/api/today');
    const sources = res.body.sources as Array<Record<string, unknown>>;
    const pathfinder = sources.find((s) => s.slug === 'pathfinder');
    const lexington = sources.find((s) => s.slug === 'lexington');

    expect(pathfinder).toBeDefined();
    expect(typeof pathfinder!.error).toBe('string');
    expect((pathfinder!.error as string).length).toBeGreaterThan(0);
    // No credential leaked in the error text.
    expect(pathfinder!.error as string).not.toMatch(/:\/\/[^\s"]*@/);

    expect(lexington!.error).toBeUndefined();
  });
});
