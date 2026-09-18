/**
 * Unit coverage for the boot-config resolution index.ts delegates to
 * (F62b) — index.ts itself is never imported here, since importing it runs
 * `main()` as a side effect.
 */
import { describe, expect, it } from 'vitest';
import { resolveBootConfig } from './bootConfig';

describe('resolveBootConfig', () => {
  it('applies documented defaults when nothing is set', () => {
    expect(resolveBootConfig({})).toEqual({
      port: 3200,
      host: '127.0.0.1',
      connectionTimeoutMs: 3000,
      statementTimeoutMs: 10_000,
    });
  });

  it('honors a non-default REPOS_API_HOST', () => {
    const config = resolveBootConfig({ REPOS_API_HOST: '0.0.0.0' });
    expect(config.host).toBe('0.0.0.0');
  });

  it('honors non-default numeric overrides', () => {
    const config = resolveBootConfig({
      REPOS_API_PORT: '4000',
      REPOS_DB_CONNECT_TIMEOUT_MS: '1500',
      REPOS_DB_STATEMENT_TIMEOUT_MS: '5000',
    });
    expect(config).toEqual({
      port: 4000,
      host: '127.0.0.1',
      connectionTimeoutMs: 1500,
      statementTimeoutMs: 5000,
    });
  });

  // F16: a non-numeric timeout must refuse to start, not silently disable
  // the timeout (which is what pg does with connectionTimeoutMillis: NaN).
  it('refuses a non-numeric REPOS_DB_CONNECT_TIMEOUT_MS', () => {
    expect(() => resolveBootConfig({ REPOS_DB_CONNECT_TIMEOUT_MS: 'not-a-number' })).toThrow(
      /REPOS_DB_CONNECT_TIMEOUT_MS/
    );
  });

  it('refuses a non-numeric REPOS_DB_STATEMENT_TIMEOUT_MS', () => {
    expect(() => resolveBootConfig({ REPOS_DB_STATEMENT_TIMEOUT_MS: 'nope' })).toThrow(
      /REPOS_DB_STATEMENT_TIMEOUT_MS/
    );
  });

  it('refuses a non-numeric REPOS_API_PORT', () => {
    expect(() => resolveBootConfig({ REPOS_API_PORT: 'nope' })).toThrow(/REPOS_API_PORT/);
  });

  it('refuses a zero or negative timeout', () => {
    expect(() => resolveBootConfig({ REPOS_DB_CONNECT_TIMEOUT_MS: '0' })).toThrow(
      /REPOS_DB_CONNECT_TIMEOUT_MS/
    );
    expect(() => resolveBootConfig({ REPOS_DB_CONNECT_TIMEOUT_MS: '-5' })).toThrow(
      /REPOS_DB_CONNECT_TIMEOUT_MS/
    );
  });
});
