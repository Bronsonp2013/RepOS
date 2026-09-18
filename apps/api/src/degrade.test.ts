/**
 * C7 — a source that is DOWN (not merely schema-mismatched) degrades
 * instead of failing boot.
 * Owned by the `routes` lane. Points the venture (`pathfinder`) source's
 * credential at REPOS_TEST_CLOSED_DATABASE_URL — a port nothing listens on
 * (.env.test) — so `checkSourceSchema` classifies it `unreachable` at boot
 * (packages/sources/src/schema.ts). Per docs/REPOS_V1.md decision 5,
 * `unreachable` is not fatal: boot must still succeed, with lexington intact
 * and pathfinder marked degraded.
 * Selected by: npm test -- degrade
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { SourceConfig, SourcePoolFactory } from '@repos/sources';
import { createSourcePools, loadSourceConfigs } from '@repos/sources';
import { createServer } from './server';

function closedDatabaseUrl(): string {
  const url = process.env.REPOS_TEST_CLOSED_DATABASE_URL;
  if (!url) throw new Error('REPOS_TEST_CLOSED_DATABASE_URL not set');
  return url;
}

describe('degradation (C7): venture source down at boot', () => {
  let factory: SourcePoolFactory;
  let app: Express;

  beforeAll(async () => {
    const configs = await loadSourceConfigs();
    const downConfigs: SourceConfig[] = configs.map((config) =>
      config.slug === 'pathfinder' ? { ...config, databaseUrl: closedDatabaseUrl() } : config
    );
    // Boot itself must not throw: this is the C7 assertion. A short
    // connectionTimeoutMillis keeps the closed-port connection attempt from
    // dragging out the test.
    factory = await createSourcePools(downConfigs, { connectionTimeoutMillis: 1000 });
    app = createServer(factory);
  });

  afterAll(async () => {
    await factory?.close();
  });

  it('returns HTTP 200 from /api/today with lexington intact and pathfinder in error', async () => {
    const res = await request(app).get('/api/today');
    expect(res.status).toBe(200);

    const sources = res.body.sources as Array<Record<string, unknown>>;
    const lexington = sources.find((s) => s.slug === 'lexington');
    const pathfinder = sources.find((s) => s.slug === 'pathfinder');

    expect(lexington).toBeDefined();
    expect(lexington!.error).toBeUndefined();
    expect(Array.isArray(lexington!.needsVisit)).toBe(true);
    expect((lexington!.needsVisit as unknown[]).length).toBeGreaterThan(0);

    expect(pathfinder).toBeDefined();
    expect(typeof pathfinder!.error).toBe('string');
    expect((pathfinder!.error as string).length).toBeGreaterThan(0);
    // No credential leaked in the error text.
    expect(pathfinder!.error as string).not.toMatch(/:\/\/[^\s"]*@/);
  });

  it('reports schemaStatus unreachable for the down source on /api/sources', async () => {
    const res = await request(app).get('/api/sources');
    expect(res.status).toBe(200);

    const pathfinder = (res.body as Array<Record<string, unknown>>).find((s) => s.slug === 'pathfinder');
    expect(pathfinder).toBeDefined();
    expect(pathfinder!.schemaStatus).toBe('unreachable');
    expect(JSON.stringify(res.body)).not.toMatch(/:\/\/[^"]*@/);
  });
});

describe('degradation (C7): venture source dies after boot', () => {
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
