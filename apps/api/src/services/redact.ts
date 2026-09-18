/**
 * Strips anything connection-string-shaped out of a message before it can
 * reach a response body or a log line (CLAUDE.md: no writable credential,
 * ever; docs/REPOS_V1.md §6). A `pg` connection error occasionally echoes
 * the connection string it failed to use; this is the last line of defense
 * against that leaking through `error?: string` fields.
 *
 * The scheme://user:pass@host shape is redacted by the canonical copy in
 * `@repos/sources` (packages/sources/src/redact.ts) — imported here rather
 * than duplicated. On top of that, a DSN can also carry the credential as a
 * `password=`/`PGPASSWORD=` key-value pair in a query string or a keyword
 * DSN (`host=... password=...`), which is not URL-shaped and would reach a
 * 500 body or a log line unredacted; that pair is stripped here.
 */
import { redactCredentials as redactConnectionString } from '@repos/sources';

const PASSWORD_KV = /\b(password|pgpassword)=\S+/gi;

export function redactCredentials(message: string): string {
  return redactConnectionString(message).replace(PASSWORD_KV, '$1=[redacted]');
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return redactCredentials(raw);
}
