/**
 * C5 — GET /api/sources and GET /api/health.
 * Owned by the `routes` lane. Drives the Express app with supertest against
 * the two fixture databases from .env.test.
 * Selected by: npm test -- sources  (note: this filter also matches the
 * packages/sources/ test files, which is harmless — they belong to the suite.)
 */
import { describe, it } from 'vitest';

describe('GET /api/sources (C5)', () => {
  it('returns lexington and pathfinder, both with schemaStatus ok and no credential', () => {
    throw new Error('not implemented: assert both slugs, schemaStatus ok, no databaseUrl in body');
  });

  it('exposes the venture instance meeting types', () => {
    throw new Error('not implemented: assert meetingTypes on the pathfinder entry');
  });
});

describe('GET /api/health (C5)', () => {
  it('reports per-source connectivity', () => {
    throw new Error('not implemented: assert reachable true and a latencyMs per source');
  });
});
