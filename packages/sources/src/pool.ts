/**
 * The read-only pool factory. The ONLY place in RepOS that reads a connection
 * string (docs/REPOS_V1.md §4). STUB — the `sources` lane implements this.
 * Covered by readonly.test.ts and credentials.test.ts.
 */
import type { CreateSourcePools, SourceConfig, SourcePoolFactory } from './types';

/** Appended to every connection so the server refuses writes in-session. */
export const READ_ONLY_OPTION = 'options=-c default_transaction_read_only=on';

/** Pool ceiling per source, per the spec. */
export const MAX_POOL_CONNECTIONS = 5;

/**
 * Returns `url` with the read-only session option appended, preserving any
 * query parameters already present. Pure and synchronous so the credentials
 * test can assert on it without opening a socket.
 */
export function withReadOnlyOption(url: string): string {
  void url;
  throw new Error('not implemented: withReadOnlyOption');
}

export const createSourcePools: CreateSourcePools = async (configs, options) => {
  void configs;
  void options;
  throw new Error('not implemented: createSourcePools');
};

/** Convenience wrapper used by the API bootstrap. */
export async function createSourcePoolFactory(configs: SourceConfig[]): Promise<SourcePoolFactory> {
  return createSourcePools(configs, { max: MAX_POOL_CONNECTIONS });
}
