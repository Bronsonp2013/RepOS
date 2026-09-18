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
import { describe, it } from 'vitest';

describe('read-only enforcement (C3)', () => {
  it('rejects an INSERT through a RepOS source pool with a read-only transaction error', () => {
    throw new Error(
      'not implemented: assert 25006 read_only_sql_transaction from a pool built by createSourcePools'
    );
  });

  it('rejects an INSERT as repos_reader with permission denied', () => {
    throw new Error('not implemented: assert 42501 insufficient_privilege for role repos_reader');
  });
});
