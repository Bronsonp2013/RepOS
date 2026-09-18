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

/**
 * `meeting_types` rows configured in this instance, seeded and rep-created
 * alike. `key IS NULL` is not filtered out here: a rep-added meeting type
 * (migration 0015) has no `key` and must still surface, identified by `id`
 * (see `MeetingTypeSummary`).
 */
export async function readMeetingTypes(pool: Pool): Promise<MeetingTypeSummary[]> {
  const result = await pool.query<MeetingTypeSummary>(
    `SELECT id, key, name
       FROM meeting_types
      WHERE deleted_at IS NULL
      ORDER BY key, name`
  );
  return result.rows;
}
