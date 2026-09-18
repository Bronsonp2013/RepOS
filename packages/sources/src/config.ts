/**
 * Loading `sources.json` and joining each entry to its credential.
 * STUB — the `sources` lane implements this. Covered by credentials.test.ts.
 */
import type { LoadSourcesOptions, SourceConfig, SourcesFile } from './types';

/** Default location of the committed source list, relative to the repo root. */
export const SOURCES_FILE = 'sources.json';

/** `lexington` → `REPOS_SOURCE_LEXINGTON_DATABASE_URL`. */
export function envVarForSlug(slug: string): string {
  return `REPOS_SOURCE_${slug.toUpperCase().replace(/-/g, '_')}_DATABASE_URL`;
}

/** Parse and validate the committed file. Must reject any connection-string-like field. */
export function parseSourcesFile(raw: unknown): SourcesFile {
  void raw;
  throw new Error('not implemented: parseSourcesFile');
}

/** Read `sources.json`, resolve every credential from the environment, fail loudly on a gap. */
export async function loadSourceConfigs(options: LoadSourcesOptions = {}): Promise<SourceConfig[]> {
  void options;
  throw new Error('not implemented: loadSourceConfigs');
}
