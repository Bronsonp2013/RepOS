/**
 * Strips anything connection-string-shaped out of a message before it can
 * reach a log line or a response body (CLAUDE.md: no writable credential,
 * ever; docs/REPOS_V1.md §6). A `pg` connection error occasionally echoes
 * the connection string it failed to use; this is the last line of defense
 * against that leaking through.
 *
 * The userinfo segment (before the last `@`) is matched greedily and allows
 * any non-whitespace character, including `/`, since a generated password
 * can itself contain one; greedy matching backtracks to the last `@` on the
 * line, which is always the one separating credentials from host.
 *
 * Single shared copy: packages/sources must not depend on apps/api, so this
 * is the canonical copy and apps/api's services lane imports it from here
 * rather than keeping a second, divergence-prone regex.
 */
const CREDENTIAL_SHAPED = /[a-z][a-z0-9+.-]*:\/\/[^\s]+@[^\s]+/gi;

export function redactCredentials(message: string): string {
  return message.replace(CREDENTIAL_SHAPED, '[redacted]');
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return redactCredentials(raw);
}
