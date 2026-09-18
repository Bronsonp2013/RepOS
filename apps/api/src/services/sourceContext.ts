/**
 * Per-request source facts the blocks need: the rep timezone from
 * `users.timezone` (user id 1) and the instance's meeting types.
 * Covered by sources.test.ts.
 */
import type { Pool } from 'pg';

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

interface MeetingTypeKeyRow {
  key: string;
}

/** Distinct, non-null `meeting_types.key` values configured in this instance. */
export async function readMeetingTypeKeys(pool: Pool): Promise<string[]> {
  const result = await pool.query<MeetingTypeKeyRow>(
    `SELECT DISTINCT key
       FROM meeting_types
      WHERE deleted_at IS NULL AND key IS NOT NULL
      ORDER BY key`
  );
  return result.rows.map((row) => row.key);
}
