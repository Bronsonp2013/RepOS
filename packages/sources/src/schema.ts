/**
 * Schema coupling. RepOS records the Pathfinder migration it was written
 * against and checks every source's `schema_migrations` at boot: behind
 * refuses to start naming the gap, ahead warns naming the extras, matching
 * reports `ok` (docs/REPOS_V1.md §2.5, CLAUDE.md hard rules).
 *
 * Bump EXPECTED_MIGRATION and KNOWN_MIGRATIONS in the same commit that adapts
 * the block queries.
 * Covered by schema.test.ts.
 */
import type { Pool } from 'pg';
import type { SchemaCheckResult } from './types';

/** The Pathfinder migration RepOS V1 was built against. */
export const EXPECTED_MIGRATION = '0029_sessions.sql';

/**
 * Every migration filename RepOS expects a source to have applied, in order.
 * Mirrors test/fixtures/pathfinder/migrations/, which is a verbatim copy of
 * Pathfinder at commit 028af48.
 */
export const KNOWN_MIGRATIONS: readonly string[] = [
  '0001_init.sql',
  '0002_tag_uniqueness.sql',
  '0003_geocode_failed.sql',
  '0004_appointment_types_and_trip_meta.sql',
  '0005_route_distance_cache.sql',
  '0006_trips_simplify_for_dynamic_start.sql',
  '0007_users_table.sql',
  '0008_trip_stops_pins.sql',
  '0009_accounts_is_key_account.sql',
  '0010_pipeline_split_multilocation_phase1.sql',
  '0011_interactions_location_id.sql',
  '0012_trip_stops_location_id.sql',
  '0013_drop_accounts_location.sql',
  '0014_drop_accounts_legacy_surface.sql',
  '0015_meeting_types.sql',
  '0016_drop_appointment_type.sql',
  '0017_interaction_types.sql',
  '0018_drop_interaction_type.sql',
  '0019_interaction_types_guards.sql',
  '0020_interactions_trip_stop.sql',
  '0021_drop_dup_route_cache_index.sql',
  '0022_tags_soft_delete_unique.sql',
  '0023_interactions_trip_stop_set_null.sql',
  '0024_interactions_trip_stop_unique.sql',
  '0025_cycles.sql',
  '0026_cycle_periods.sql',
  '0027_cycle_exclusions.sql',
  '0028_sync_state_uniqueness.sql',
  '0029_sessions.sql',
];

/** Compare an applied-migration list to KNOWN_MIGRATIONS. Pure; no I/O. */
export function compareMigrations(slug: string, applied: string[]): SchemaCheckResult {
  const appliedSet = new Set(applied);
  const knownSet = new Set(KNOWN_MIGRATIONS);

  const missingMigrations = KNOWN_MIGRATIONS.filter((m) => !appliedSet.has(m));
  const extraMigrations = applied.filter((m) => !knownSet.has(m));

  if (missingMigrations.length > 0) {
    return {
      slug,
      status: 'behind',
      expectedMigration: EXPECTED_MIGRATION,
      extraMigrations,
      missingMigrations,
      message: `source "${slug}" is behind: missing ${missingMigrations.join(', ')}`,
    };
  }

  if (extraMigrations.length > 0) {
    return {
      slug,
      status: 'ahead',
      expectedMigration: EXPECTED_MIGRATION,
      extraMigrations,
      missingMigrations,
      message: `source "${slug}" is ahead: extra migrations ${extraMigrations.join(', ')}`,
    };
  }

  return {
    slug,
    status: 'ok',
    expectedMigration: EXPECTED_MIGRATION,
    extraMigrations,
    missingMigrations,
  };
}

/** Read `schema_migrations` from a source and classify it. */
export async function checkSourceSchema(slug: string, pool: Pool): Promise<SchemaCheckResult> {
  try {
    const result = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations ORDER BY filename');
    const applied = result.rows.map((row) => row.filename);
    return compareMigrations(slug, applied);
  } catch (err) {
    return {
      slug,
      status: 'unknown',
      expectedMigration: EXPECTED_MIGRATION,
      extraMigrations: [],
      missingMigrations: [],
      message: `source "${slug}" schema check failed: ${(err as Error).message}`,
    };
  }
}

/** Throws when a source is `behind`, with a message naming the missing migrations. */
export function assertSchemaUsable(result: SchemaCheckResult): void {
  if (result.status === 'behind') {
    throw new Error(result.message ?? `source "${result.slug}" is behind expected schema`);
  }
  if (result.status === 'unknown') {
    throw new Error(
      result.message ??
        `source "${result.slug}" schema status is unknown: could not read schema_migrations`
    );
  }
}
