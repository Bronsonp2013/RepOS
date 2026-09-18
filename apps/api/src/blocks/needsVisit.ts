/**
 * Today block: needsVisit.
 * Accounts worst-first by `last_visit_at`, NULLS FIRST, top 8 (docs/REPOS_V1.md §3). Deep-links to {webUrl}/accounts/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 *
 * Schema notes: `accounts` no longer carries address columns (0014) — city and
 * state come from the account's primary `account_locations` row (0010).
 * Soft-delete: `accounts.deleted_at IS NULL` everywhere.
 */
import type { Pool } from 'pg';
import type { NeedsVisitRow } from '@repos/shared';
import { NEEDS_VISIT_LIMIT } from './context';
import type { BlockContext } from './context';

interface NeedsVisitQueryRow {
  account_id: string;
  name: string;
  account_type: string;
  city: string | null;
  state: string | null;
  last_visit_at: Date | null;
}

/** Whole days between `lastVisitAt` and `now`; null when never visited. */
function daysSince(lastVisitAt: Date | null, now: Date): number | null {
  if (!lastVisitAt) return null;
  const diffMs = now.getTime() - lastVisitAt.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

export async function needsVisit(pool: Pool, ctx: BlockContext): Promise<NeedsVisitRow[]> {
  const result = await pool.query<NeedsVisitQueryRow>(
    `SELECT
       a.id AS account_id,
       a.name,
       a.account_type,
       al.city,
       al.state,
       a.last_visit_at
     FROM accounts a
     LEFT JOIN account_locations al
       ON al.account_id = a.id AND al.is_primary AND al.deleted_at IS NULL
     WHERE a.deleted_at IS NULL
     ORDER BY a.last_visit_at ASC NULLS FIRST, a.name ASC
     LIMIT $1`,
    [NEEDS_VISIT_LIMIT]
  );

  return result.rows.map((row) => {
    const lastVisitAt = row.last_visit_at;
    return {
      // `Number()` can round a bigint id above 2^53; the href is built from
      // the raw string id below so a deep link never 404s on that account.
      accountId: Number(row.account_id),
      name: row.name,
      accountType: row.account_type,
      city: row.city,
      state: row.state,
      lastVisitAt: lastVisitAt ? lastVisitAt.toISOString() : null,
      daysSinceVisit: daysSince(lastVisitAt, ctx.now),
      href: `${ctx.webUrl}/accounts/${row.account_id}`,
    };
  });
}
