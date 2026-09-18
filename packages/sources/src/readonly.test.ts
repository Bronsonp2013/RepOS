/**
 * C3 — read-only by construction.
 * Owned by the `sources` lane. Two independent guarantees, both asserted
 * against the local fixture databases named in .env.test:
 *   1. An INSERT through a RepOS pool fails with a read-only-transaction error
 *      (the pool appends `default_transaction_read_only=on`).
 *   2. An INSERT as `repos_reader` fails with `permission denied` — the role
 *      itself has SELECT only, independent of any session setting.
 * Selected by: npm test -- readonly
 */
import { afterAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { loadSourceConfigs } from './config';
import { createSourcePools } from './pool';
import type { SourcePoolFactory } from './types';

let factory: SourcePoolFactory | undefined;

afterAll(async () => {
  await factory?.close();
});

describe('read-only enforcement (C3)', () => {
  it('rejects an INSERT through a RepOS source pool with a read-only transaction error', async () => {
    const configs = await loadSourceConfigs();
    factory = await createSourcePools(configs);
    const source = factory.get('lexington');
    expect(source).toBeDefined();

    await expect(
      source!.pool.query("INSERT INTO accounts (name, account_type) VALUES ('x', 'retail')")
    ).rejects.toMatchObject({ code: '25006' });
  });

  it('rejects an INSERT as repos_reader with permission denied', async () => {
    const url = process.env.REPOS_SOURCE_LEXINGTON_DATABASE_URL;
    expect(url).toBeTruthy();

    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      await expect(
        client.query("INSERT INTO accounts (name, account_type) VALUES ('x', 'retail')")
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });
});
