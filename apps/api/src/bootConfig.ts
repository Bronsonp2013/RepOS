/**
 * Env -> boot settings, split out from `index.ts` (F62b) so it can be unit
 * tested without executing that file's top-level `main().catch(...)` call —
 * importing `index.ts` itself would open real source pools and bind a real
 * port as a side effect of the import.
 */

/** Resolved, validated boot configuration — see `resolveBootConfig`. */
export interface BootConfig {
  port: number;
  host: string;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
}

// Parses a required-positive-integer env var (F16). `Number('')` and
// `Number(undefined)` both yield `NaN`, and pg silently drops an invalid
// timeout option (falling back to 0 — disabled — for connectionTimeoutMillis,
// and to "never send it" for statement_timeout) rather than rejecting it, so
// an unparseable value here must fail boot loudly instead of degrading
// silently into an unbounded connection.
export function requirePositiveInt(name: string, raw: string | undefined, fallback: number): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got ${JSON.stringify(raw)}`);
  }
  return value;
}

/**
 * Resolves and validates the env-derived boot settings. Reads directly from
 * the `env` map passed in — never `process.env` — so a test can exercise a
 * non-default `REPOS_API_HOST` and a non-numeric timeout without mutating
 * global state.
 */
export function resolveBootConfig(env: NodeJS.ProcessEnv): BootConfig {
  const port = requirePositiveInt('REPOS_API_PORT', env.REPOS_API_PORT, 3200);
  // Tailnet-only: bind to loopback unless the environment names a different
  // host explicitly (docs/REPOS_V1.md §2.6, .env.example).
  const host = env.REPOS_API_HOST ?? '127.0.0.1';
  // Bounded so a source whose connection is refused can't hang a boot or a
  // request past a short, known wait (docs/REPOS_V1.md §7.6).
  const connectionTimeoutMs = requirePositiveInt(
    'REPOS_DB_CONNECT_TIMEOUT_MS',
    env.REPOS_DB_CONNECT_TIMEOUT_MS,
    3000
  );
  const statementTimeoutMs = requirePositiveInt(
    'REPOS_DB_STATEMENT_TIMEOUT_MS',
    env.REPOS_DB_STATEMENT_TIMEOUT_MS,
    10_000
  );
  return { port, host, connectionTimeoutMs, statementTimeoutMs };
}
