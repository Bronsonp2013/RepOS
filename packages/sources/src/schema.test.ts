/**
 * C4 — schema coupling is enforced.
 * Owned by the `sources` lane. Uses REPOS_TEST_SUPERUSER_DATABASE_URL to build
 * and drop a throwaway database whose `schema_migrations` is missing
 * 0029_sessions.sql, and another with an unknown extra row.
 * Selected by: npm test -- schema
 */
import { describe, it } from 'vitest';

describe('schema check (C4)', () => {
  it('refuses to boot against a source missing 0029_sessions.sql, naming the gap', () => {
    throw new Error('not implemented: assert assertSchemaUsable throws naming 0029_sessions.sql');
  });

  it('boots with a warning against a source carrying an extra migration, naming it', () => {
    throw new Error("not implemented: assert status 'ahead' and the extra filename is named");
  });

  it('reports ok for a source matching KNOWN_MIGRATIONS exactly', () => {
    throw new Error("not implemented: assert checkSourceSchema returns status 'ok'");
  });
});
