/**
 * Strips anything connection-string-shaped out of a message before it can
 * reach a response body or a log line (CLAUDE.md: no writable credential,
 * ever; docs/REPOS_V1.md §6). A `pg` connection error occasionally echoes
 * the connection string it failed to use; this is the last line of defense
 * against that leaking through `error?: string` fields.
 */
const CREDENTIAL_SHAPED = /[a-z][a-z0-9+.-]*:\/\/[^\s@/]+@[^\s]+/gi;

export function redactCredentials(message: string): string {
  return message.replace(CREDENTIAL_SHAPED, '[redacted]');
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return redactCredentials(raw);
}
