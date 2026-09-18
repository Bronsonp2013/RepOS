/**
 * Loading `sources.json` and joining each entry to its credential.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { LoadSourcesOptions, SourceConfig, SourcesFile } from './types';

/** Default location of the committed source list, relative to the repo root. */
export const SOURCES_FILE = 'sources.json';

/** `lexington` → `REPOS_SOURCE_LEXINGTON_DATABASE_URL`. */
export function envVarForSlug(slug: string): string {
  return `REPOS_SOURCE_${slug.toUpperCase().replace(/-/g, '_')}_DATABASE_URL`;
}

/**
 * Rejects a string that looks like a connection string or a credential, so a
 * committed `sources.json` can never smuggle a secret in under a permitted
 * field name (CLAUDE.md hard rules: secrets in `.env`, never in `sources.json`).
 *
 * The `password|secret|token` keyword check only ever applies to `slug` and
 * `webUrl`: those are the fields a real credential (or a scheme-qualified
 * URL with embedded userinfo) could plausibly hide in. `name` is a free-text
 * display string — a venture legitimately named e.g. "Token Furniture" must
 * still load — so it is only checked for the connection-string shape and the
 * `user:pass@host` userinfo pattern, never for the bare keywords.
 */
function rejectCredentialShaped(value: string, field: string, checkKeywords: boolean): void {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
    throw new Error(`sources.json: field "${field}" looks like a connection string, not a URL`);
  }
  if (/@.*:.*@/i.test(value)) {
    throw new Error(`sources.json: field "${field}" looks credential-shaped`);
  }
  if (checkKeywords && /password|secret|token/i.test(value)) {
    throw new Error(`sources.json: field "${field}" looks credential-shaped`);
  }
}

const sourceEntrySchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['territory', 'venture']),
    webUrl: z.string().min(1),
  })
  .strict();

/** Parse and validate the committed file. Must reject any connection-string-like field. */
export function parseSourcesFile(raw: unknown): SourcesFile {
  const parsed = z.object({ sources: z.array(sourceEntrySchema) }).strict().parse(raw);

  for (const entry of parsed.sources) {
    rejectCredentialShaped(entry.slug, 'slug', true);
    rejectCredentialShaped(entry.name, 'name', false);
    rejectCredentialShaped(entry.webUrl, 'webUrl', true);
    if (!/^https?:\/\//i.test(entry.webUrl)) {
      throw new Error(`sources.json: entry "${entry.slug}" has a non-http(s) webUrl`);
    }
    entry.webUrl = entry.webUrl.replace(/\/+$/, '');
  }

  const slugs = new Set<string>();
  for (const entry of parsed.sources) {
    if (slugs.has(entry.slug)) {
      throw new Error(`sources.json: duplicate slug "${entry.slug}"`);
    }
    slugs.add(entry.slug);
  }

  return parsed;
}

/** Read `sources.json`, resolve every credential from the environment, fail loudly on a gap. */
export async function loadSourceConfigs(options: LoadSourcesOptions = {}): Promise<SourceConfig[]> {
  const configPath = resolve(process.cwd(), options.configPath ?? SOURCES_FILE);
  const env = options.env ?? process.env;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`failed to read source list at ${configPath}: ${(err as Error).message}`);
  }

  const sourcesFile = parseSourcesFile(raw);

  return sourcesFile.sources.map((entry) => {
    const envVar = envVarForSlug(entry.slug);
    const databaseUrl = env[envVar];
    if (!databaseUrl) {
      throw new Error(
        `missing credential for source "${entry.slug}": expected ${envVar} to be set in the environment`
      );
    }
    return { ...entry, databaseUrl, envVar };
  });
}
