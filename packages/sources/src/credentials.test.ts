/**
 * C9 — no writable credential anywhere.
 * Owned by the `sources` lane. Pure assertions plus a read of the committed
 * files; no database connection is required for this file.
 *   - sources.json carries no connection string and no password-shaped field.
 *   - the pool factory appends `default_transaction_read_only=on` to every URL.
 *   - .env.example documents REPOS_SOURCE_<SLUG>_DATABASE_URL.
 * Selected by: npm test -- credentials
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { envVarForSlug, parseSourcesFile, SOURCES_FILE } from './config';
import { withReadOnlyOption } from './pool';

const REPO_ROOT = resolve(__dirname, '../../..');

describe('credential hygiene (C9)', () => {
  it('sources.json contains no connection string', () => {
    const raw = readFileSync(resolve(REPO_ROOT, SOURCES_FILE), 'utf-8');

    expect(raw).not.toMatch(/postgres(ql)?:\/\//i);
    expect(raw).not.toMatch(/password/i);

    // parseSourcesFile itself rejects a credential-shaped field.
    const parsed = parseSourcesFile(JSON.parse(raw));
    expect(parsed.sources.length).toBeGreaterThan(0);
  });

  it('the pool factory appends default_transaction_read_only=on to every connection', () => {
    const decodeQuery = (url: string) => decodeURIComponent(url.replace(/\+/g, ' '));

    const plain = withReadOnlyOption('postgresql://repos_reader:pw@127.0.0.1:5432/db');
    expect(plain).toContain('options=');
    expect(decodeQuery(plain)).toContain('-c default_transaction_read_only=on');

    const withQuery = withReadOnlyOption('postgresql://repos_reader:pw@127.0.0.1:5432/db?sslmode=require');
    expect(decodeQuery(withQuery)).toContain('sslmode=require');
    expect(decodeQuery(withQuery)).toContain('-c default_transaction_read_only=on');
  });

  it('.env.example documents REPOS_SOURCE_<SLUG>_DATABASE_URL for every configured slug', () => {
    const sourcesRaw = readFileSync(resolve(REPO_ROOT, SOURCES_FILE), 'utf-8');
    const parsed = parseSourcesFile(JSON.parse(sourcesRaw));
    const envExample = readFileSync(resolve(REPO_ROOT, '.env.example'), 'utf-8');

    for (const source of parsed.sources) {
      expect(envExample).toContain(envVarForSlug(source.slug));
    }
  });
});
