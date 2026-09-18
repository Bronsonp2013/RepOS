/**
 * A 500 from the API must never leak a credential-shaped string, even when
 * the underlying failure (e.g. a source pool's query rejecting) echoes one
 * back in its error message. Exercises the server's error-handling
 * middleware directly with a fake `SourcePoolFactory` so no live database is
 * required.
 */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { SourcePool, SourcePoolFactory } from '@repos/sources';
import { createServer } from './server';

const LEAKY_MESSAGE =
  'connect ECONNREFUSED postgres://user:secret@host.internal:5432/db';

function factoryThatThrows(message: string): SourcePoolFactory {
  return {
    all(): SourcePool[] {
      throw new Error(message);
    },
    get(): SourcePool | undefined {
      throw new Error(message);
    },
    async close(): Promise<void> {},
  };
}

describe('credential redaction on a 500', () => {
  it('never returns a credential-shaped string in the response body', async () => {
    const app = createServer(factoryThatThrows(LEAKY_MESSAGE));

    const res = await request(app).get('/api/sources');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/:\/\/[^"]*@/);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
