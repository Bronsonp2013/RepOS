/**
 * Per-request source facts the blocks need: the rep timezone from
 * `users.timezone` (user id 1) and the instance's meeting types.
 * Covered by sources.test.ts.
 */
import type { Pool } from 'pg';
import type { MeetingTypeSummary } from '@repos/shared';

/** Fallback used only when a source's `users` row can't be read. */
export const DEFAULT_TIMEZONE = 'America/Chicago';

interface TimezoneRow {
  timezone: string;
}

/** `users.timezone` for user id 1, the rep RepOS renders around. */
export async function readTimezone(pool: Pool): Promise<string> {
  const result = await pool.query<TimezoneRow>(
    'SELECT timezone FROM users WHERE id = 1 AND deleted_at IS NULL LIMIT 1'
  );
  return result.rows[0]?.timezone ?? DEFAULT_TIMEZONE;
}

interface MeetingTypeRow {
  id: string | number;
  key: string | null;
  name: string;
}

/**
 * `meeting_types` rows configured in this instance, seeded and rep-created
 * alike. `key IS NULL` is not filtered out here: a rep-added meeting type
 * (migration 0015) has no `key` and must still surface, identified by `id`
 * (see `MeetingTypeSummary`). Only `active` rows are returned (inactive
 * types are archived, not deleted); ordered by `sort_order`, then `name` —
 * `key` is a seed/backfill correspondence only and rep-created rows (key
 * NULL) would otherwise always sort last.
 */
export async function readMeetingTypes(pool: Pool): Promise<MeetingTypeSummary[]> {
  const result = await pool.query<MeetingTypeRow>(
    `SELECT id, key, name
       FROM meeting_types
      WHERE deleted_at IS NULL
        AND active
      ORDER BY sort_order, name`
  );
  // `id` is a Postgres bigint, which node-pg returns as a string; the
  // shared contract declares MeetingTypeSummary.id: number.
  return result.rows.map((row) => ({
    id: Number(row.id),
    key: row.key,
    name: row.name,
  }));
}
