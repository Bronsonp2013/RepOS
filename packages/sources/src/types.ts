/**
 * Source configuration and the pool-factory contract.
 *
 * A "source" is one venture's Pathfinder instance. Its identity (slug, name,
 * kind, web URL) is committed in `sources.json`; its credential never is — it
 * is read from `REPOS_SOURCE_<SLUG>_DATABASE_URL` in the environment
 * (docs/REPOS_V1.md §6, CLAUDE.md hard rules).
 */
import type { Pool } from 'pg';
import type { SchemaStatus, SourceKind } from '@repos/shared';

/** One committed entry in `sources.json`. Slugs, names, kinds and URLs only. */
export interface SourceEntry {
  slug: string;
  name: string;
  kind: SourceKind;
  /** Base URL of the venture's Pathfinder instance. No trailing slash. */
  webUrl: string;
}

/** The committed file as a whole. */
export interface SourcesFile {
  sources: SourceEntry[];
}

/**
 * A `SourceEntry` joined to the credential resolved from the environment.
 * This is the only shape that ever carries a connection string, and it must
 * not be serialized into an API response.
 */
export interface SourceConfig extends SourceEntry {
  /** From `REPOS_SOURCE_<SLUG>_DATABASE_URL`, uppercased slug, `-` → `_`. */
  databaseUrl: string;
  /** Env var name the URL came from, for error messages that name no secret. */
  envVar: string;
}

/** Options accepted when loading source configuration. */
export interface LoadSourcesOptions {
  /** Path to `sources.json`. Defaults to the repository root file. */
  configPath?: string;
  /** Environment to resolve credentials from. Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
}

/** What a source's `schema_migrations` table says, compared to what RepOS needs. */
export interface SchemaCheckResult {
  slug: string;
  status: SchemaStatus;
  /** The migration filename RepOS was built against, e.g. `0029_sessions.sql`. */
  expectedMigration: string;
  /** Present in the source but unknown to RepOS. Non-empty implies `ahead`. */
  extraMigrations: string[];
  /** Expected by RepOS but absent from the source. Non-empty implies `behind`. */
  missingMigrations: string[];
  /** Human-readable summary naming the gap; set whenever status is not `ok`. */
  message?: string;
}

/** A live source: its config, its pool, and the schema verdict taken at boot. */
export interface SourcePool {
  config: SourceConfig;
  pool: Pool;
  schema: SchemaCheckResult;
}

/**
 * Creates and owns one read-only `pg.Pool` per source.
 *
 * Implementations MUST append `options=-c default_transaction_read_only=on` to
 * every connection string (docs/REPOS_V1.md §4) so a write fails at the
 * database even if the role were ever over-granted, and MUST cap `max` at
 * `MAX_POOL_CONNECTIONS_CEILING` (pool.ts). Callers with real per-source
 * concurrency needs may pass a higher `options.max` than the default.
 */
export interface SourcePoolFactory {
  /** Every source that was configured, in `sources.json` order. */
  all(): SourcePool[];
  /** One source by slug, or `undefined` when no such slug is configured. */
  get(slug: string): SourcePool | undefined;
  /** Close every pool. Safe to call more than once. */
  close(): Promise<void>;
}

/** Signature of the factory entry point. */
export type CreateSourcePools = (
  configs: SourceConfig[],
  options?: {
    max?: number;
    /** `pg.Pool` `connectionTimeoutMillis`: how long to wait for a free connection. */
    connectionTimeoutMillis?: number;
    /** `pg.Pool` `statement_timeout` (ms), set per-connection so one slow read-only query can't hang a request. */
    statementTimeoutMillis?: number;
  }
) => Promise<SourcePoolFactory>;
