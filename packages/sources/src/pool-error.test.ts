/**
 * F28, F63 — the pool's `error` listener must redact a credential-shaped
 * message before it reaches console.error, same as every other error sink.
 * Selected by: npm test -- pool-error
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { loadSourceConfigs } from './config';
import { createSourcePools } from './pool';
import type { SourcePoolFactory } from './types';

let factory: SourcePoolFactory | undefined;

afterAll(async () => {
  await factory?.close();
});

describe('pool error listener redaction (F28, F63)', () => {
  it('scrubs a credential-shaped message before logging it', async () => {
    const configs = await loadSourceConfigs();
    factory = await createSourcePools(configs);
    const source = factory.get('lexington');
    expect(source).toBeDefined();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      source!.pool.emit(
        'error',
        new Error('connect ECONNREFUSED postgresql://repos_reader:sup3r_secret@127.0.0.1:5432/db')
      );

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [logged] = errorSpy.mock.calls[0] as [string];
      expect(logged).not.toMatch(/sup3r_secret/);
      expect(logged).toContain('[redacted]');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
