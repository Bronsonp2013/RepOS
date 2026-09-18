/**
 * C9 — no writable credential anywhere.
 * Owned by the `sources` lane. Pure assertions plus a read of the committed
 * files; no database connection is required for this file.
 *   - sources.json carries no connection string and no password-shaped field.
 *   - the pool factory appends `default_transaction_read_only=on` to every URL.
 *   - .env.example documents REPOS_SOURCE_<SLUG>_DATABASE_URL.
 * Selected by: npm test -- credentials
 */
import { describe, it } from 'vitest';

describe('credential hygiene (C9)', () => {
  it('sources.json contains no connection string', () => {
    throw new Error('not implemented: assert no postgres:// or password field in sources.json');
  });

  it('the pool factory appends default_transaction_read_only=on to every connection', () => {
    throw new Error('not implemented: assert withReadOnlyOption for plain and query-bearing URLs');
  });

  it('.env.example documents REPOS_SOURCE_<SLUG>_DATABASE_URL for every configured slug', () => {
    throw new Error('not implemented: assert .env.example names every slug from sources.json');
  });
});
