/**
 * C5 — GET /api/sources and GET /api/health.
 * Owned by the `routes` lane. Drives the Express app with supertest against
 * the two fixture databases from .env.test.
 * Selected by: npm test -- sources  (note: this filter also matches the
 * packages/sources/ test files, which is harmless — they belong to the suite.)
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
});

afterAll(async () => {
  await factory?.close();
});

describe('GET /api/sources (C5)', () => {
  it('returns lexington and pathfinder, both with schemaStatus ok and no credential', async () => {
    const res = await request(app).get('/api/sources');
    expect(res.status).toBe(200);

    const slugs = (res.body as Array<{ slug: string }>).map((s) => s.slug).sort();
    expect(slugs).toEqual(['lexington', 'pathfinder']);

    for (const entry of res.body as Array<Record<string, unknown>>) {
      expect(entry.schemaStatus).toBe('ok');
      expect(entry).not.toHaveProperty('databaseUrl');
    }

    // No credential anywhere in the serialized body.
    expect(JSON.stringify(res.body)).not.toMatch(/:\/\/[^"]*@/);
  });

  it('exposes the venture instance meeting types, each with a name', async () => {
    const res = await request(app).get('/api/sources');
    const pathfinder = (res.body as Array<Record<string, unknown>>).find((s) => s.slug === 'pathfinder');
    expect(pathfinder).toBeDefined();

    const meetingTypes = pathfinder!.meetingTypes as Array<{
      id: number;
      key: string | null;
      name: string;
    }>;

    // All five seeded types (migration 0015) are present, each with a name.
    const seededKeys = ['checkin', 'presentation', 'prospecting', 'training', 'updating_sales_aids'];
    expect(meetingTypes).toEqual(
      expect.arrayContaining(
        seededKeys.map((key) => expect.objectContaining({ key, name: expect.any(String) }))
      )
    );

    for (const meetingType of meetingTypes) {
      expect(typeof meetingType.name).toBe('string');
      expect(meetingType.name.length).toBeGreaterThan(0);
    }
  });
});

describe('GET /api/health (C5)', () => {
  it('reports per-source connectivity', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.sources.length).toBe(2);
    for (const entry of res.body.sources as Array<Record<string, unknown>>) {
      expect(entry.reachable).toBe(true);
      expect(typeof entry.latencyMs).toBe('number');
    }
  });
});
