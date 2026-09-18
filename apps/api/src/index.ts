/**
 * API bootstrap. Loads source configuration, opens one read-only pool per
 * source, refuses to start when a source's schema is behind, then listens.
 * STUB — the `routes` lane wires the real boot sequence.
 */
import { createServer } from './server';

const PORT = Number(process.env.REPOS_API_PORT ?? 3200);

export async function main(): Promise<void> {
  void createServer;
  void PORT;
  throw new Error('not implemented: api bootstrap');
}

main().catch((err: unknown) => {
  console.error('[repos-api] failed to start:', err);
  process.exitCode = 1;
});
