/**
 * Per-request source facts the blocks need: the rep timezone from
 * `users.timezone` (user id 1) and the instance's meeting types.
 * STUB — the `routes` lane implements it. Covered by sources.test.ts.
 */
import type { Pool } from 'pg';

export async function readTimezone(pool: Pool): Promise<string> {
  void pool;
  throw new Error('not implemented: readTimezone');
}

export async function readMeetingTypeKeys(pool: Pool): Promise<string[]> {
  void pool;
  throw new Error('not implemented: readMeetingTypeKeys');
}
