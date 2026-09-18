/**
 * C4 — schema coupling is enforced.
 * Owned by the `sources` lane. Uses REPOS_TEST_SUPERUSER_DATABASE_URL to build
 * and drop a throwaway database whose `schema_migrations` is missing
 * 0029_sessions.sql, and another with an unknown extra row.
 * Selected by: npm test -- schema
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client, Pool } from 'pg';
import { KNOWN_MIGRATIONS, checkSourceSchema, assertSchemaUsable } from './schema';
import { createSourcePools } from './pool';
import type { SourceConfig } from './types';

const DB_MISSING = 'repos_test_schema_missing';
const DB_AHEAD = 'repos_test_schema_ahead';
const DB_UNKNOWN = 'repos_test_schema_unknown';
const EXTRA_MIGRATION = '0030_unknown_future.sql';

function superuserUrl(): string {
  const url = process.env.REPOS_TEST_SUPERUSER_DATABASE_URL;
  if (!url) throw new Error('REPOS_TEST_SUPERUSER_DATABASE_URL not set');
  return url;
}

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

async function dropDatabase(admin: Client, dbName: string): Promise<void> {
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
}

async function createFixtureDatabase(admin: Client, dbName: string, filenames: string[]): Promise<void> {
  await dropDatabase(admin, dbName);
  await admin.query(`CREATE DATABASE "${dbName}"`);

  const dbClient = new Client({ connectionString: withDatabase(superuserUrl(), dbName) });
  await dbClient.connect();
  try {
    await dbClient.query(
      'CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
    );
    for (const filename of filenames) {
      await dbClient.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    }
  } finally {
    await dbClient.end();
  }
}

let admin: Client;

beforeAll(async () => {
  admin = new Client({ connectionString: superuserUrl() });
  await admin.connect();

  await createFixtureDatabase(admin, DB_MISSING, KNOWN_MIGRATIONS.slice(0, -1));
  await createFixtureDatabase(admin, DB_AHEAD, [...KNOWN_MIGRATIONS, EXTRA_MIGRATION]);

  // Throwaway database with no schema_migrations table at all.
  await dropDatabase(admin, DB_UNKNOWN);
  await admin.query(`CREATE DATABASE "${DB_UNKNOWN}"`);
});

afterAll(async () => {
  await dropDatabase(admin, DB_MISSING);
  await dropDatabase(admin, DB_AHEAD);
  await dropDatabase(admin, DB_UNKNOWN);
  await admin.end();
});

describe('schema check (C4)', () => {
  it('refuses to boot against a source missing 0029_sessions.sql, naming the gap', async () => {
    const pool = new Pool({ connectionString: withDatabase(superuserUrl(), DB_MISSING) });
    try {
      const result = await checkSourceSchema('missing-migration', pool);
      expect(result.status).toBe('behind');
      expect(result.missingMigrations).toContain('0029_sessions.sql');
      expect(() => assertSchemaUsable(result)).toThrow(/0029_sessions\.sql/);
    } finally {
      await pool.end();
    }
  });

  it('boots with a warning against a source carrying an extra migration, naming it', async () => {
    const pool = new Pool({ connectionString: withDatabase(superuserUrl(), DB_AHEAD) });
    try {
      const result = await checkSourceSchema('extra-migration', pool);
      expect(result.status).toBe('ahead');
      expect(result.extraMigrations).toContain(EXTRA_MIGRATION);
      expect(() => assertSchemaUsable(result)).not.toThrow();
    } finally {
      await pool.end();
    }
  });

  it('reports ok for a source matching KNOWN_MIGRATIONS exactly', async () => {
    const url = process.env.REPOS_SOURCE_LEXINGTON_DATABASE_URL;
    expect(url).toBeTruthy();
    const pool = new Pool({ connectionString: url });
    try {
      const result = await checkSourceSchema('lexington', pool);
      expect(result.status).toBe('ok');
    } finally {
      await pool.end();
    }
  });

  it('refuses to boot against a source with no readable schema_migrations table', async () => {
    const pool = new Pool({ connectionString: withDatabase(superuserUrl(), DB_UNKNOWN) });
    try {
      const result = await checkSourceSchema('unreadable-schema', pool);
      expect(result.status).toBe('unknown');
      expect(() => assertSchemaUsable(result)).toThrow(/schema_migrations/);
    } finally {
      await pool.end();
    }
  });

  it('rejects createSourcePools for a behind database and closes any pools it opened', async () => {
    const okConfig: SourceConfig = {
      slug: 'lexington',
      name: 'Lexington',
      kind: 'venture',
      webUrl: 'https://example.test',
      databaseUrl: process.env.REPOS_SOURCE_LEXINGTON_DATABASE_URL!,
      envVar: 'REPOS_SOURCE_LEXINGTON_DATABASE_URL',
    };
    expect(okConfig.databaseUrl).toBeTruthy();

    const behindConfig: SourceConfig = {
      slug: 'missing-migration',
      name: 'Missing Migration',
      kind: 'venture',
      webUrl: 'https://example.test',
      databaseUrl: withDatabase(superuserUrl(), DB_MISSING),
      envVar: 'REPOS_TEST_SUPERUSER_DATABASE_URL',
    };

    const endSpy = vi.spyOn(Pool.prototype, 'end');

    await expect(createSourcePools([okConfig, behindConfig])).rejects.toThrow(/0029_sessions\.sql/);

    // The one pool opened before the rejection (for okConfig) must have been closed.
    expect(endSpy).toHaveBeenCalledTimes(1);
    endSpy.mockRestore();
  });
});
