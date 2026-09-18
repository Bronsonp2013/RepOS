/**
 * Today block: totals.
 * One source's contribution to the cross-venture header numbers — active
 * accounts, prospects in the pipeline, trips this week, and stale accounts.
 * `services/today.ts` sums every source's result into `TodayPayload.totals`.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 *
 * Schema notes: "active" accounts are those whose `account_stage_id` resolves
 * to the `account_stages` row keyed `active` (0010; `accounts.pipeline_stage`
 * was dropped in 0014). Prospects "in the pipeline" mirrors pipeline.ts: live
 * and not archived. "This week" is the Mon-Sun calendar week containing
 * `BlockContext.now`, read in `BlockContext.timezone`. Stale accounts are
 * live accounts never visited or last visited 90+ days ago, matching the
 * needsVisit ordering (worst-first, NULLS FIRST).
 */
import type { Pool } from 'pg';
import type { SourceTotals } from '@repos/shared';
import type { BlockContext } from './context';
import { localDateOnly, localIsoWeekRange, repLocalDate } from './repLocal';

interface TotalsQueryRow {
  active_accounts: string;
  prospects_in_pipeline: string;
  trips_this_week: string;
  stale_accounts: string;
}

const STALE_DAYS = 90;

export async function totals(pool: Pool, ctx: BlockContext): Promise<SourceTotals> {
  const nowLocal = repLocalDate(ctx.now, ctx.timezone);
  const { monday, sunday } = localIsoWeekRange(nowLocal);
  const weekStart = localDateOnly(monday);
  const weekEnd = localDateOnly(sunday);
  const staleThreshold = new Date(ctx.now.getTime() - STALE_DAYS * 86_400_000).toISOString();

  const result = await pool.query<TotalsQueryRow>(
    `SELECT
       (SELECT COUNT(*)
          FROM accounts a
          JOIN account_stages s ON s.id = a.account_stage_id AND s.deleted_at IS NULL
          WHERE a.deleted_at IS NULL AND s.key = 'active'
       ) AS active_accounts,
       (SELECT COUNT(*)
          FROM prospects p
          WHERE p.deleted_at IS NULL AND p.archived_at IS NULL
       ) AS prospects_in_pipeline,
       (SELECT COUNT(*)
          FROM trips t
          WHERE t.deleted_at IS NULL
            AND t.start_date <= $2::date
            AND t.end_date >= $1::date
       ) AS trips_this_week,
       (SELECT COUNT(*)
          FROM accounts a
          WHERE a.deleted_at IS NULL
            AND (a.last_visit_at IS NULL OR a.last_visit_at <= $3::timestamptz)
       ) AS stale_accounts`,
    [weekStart, weekEnd, staleThreshold]
  );

  const row = result.rows[0];
  return {
    activeAccounts: Number(row?.active_accounts ?? '0'),
    prospectsInPipeline: Number(row?.prospects_in_pipeline ?? '0'),
    tripsThisWeek: Number(row?.trips_this_week ?? '0'),
    staleAccounts: Number(row?.stale_accounts ?? '0'),
  };
}
