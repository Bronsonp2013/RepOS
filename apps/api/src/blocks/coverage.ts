/**
 * Today block: coverage.
 * Per active cycle, covered vs eligible locations for the current period. Deep-links to {webUrl}/cycles/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 *
 * Schema notes (0025-0027): `cycle_progress.period_key` is an opaque bucket id
 * computed by `cyclePeriodKey` (@repos/shared) in the rep's timezone, never in
 * SQL. Eligible locations are every live `account_locations` row for a live
 * account, minus any live `cycle_exclusions` row for that (cycle, location).
 */
import type { Pool } from 'pg';
import type { CoverageRow } from '@repos/shared';
import type { CyclePeriod, CyclePeriodCustom } from '@repos/shared';
import { cyclePeriodKey } from '@repos/shared';
import type { BlockContext } from './context';
import { repLocalDate } from './repLocal';

interface CycleQueryRow {
  cycle_id: string;
  name: string;
  period: CyclePeriod;
  anchored_on: Date | null;
  custom_every: number | null;
  custom_unit: 'weeks' | 'months' | null;
}

interface CoverageCountRow {
  eligible: string;
  covered: string;
}

export async function coverage(pool: Pool, ctx: BlockContext): Promise<CoverageRow[]> {
  const cycles = await pool.query<CycleQueryRow>(
    `SELECT id AS cycle_id, name, period, anchored_on, custom_every, custom_unit
     FROM cycles
     WHERE active AND deleted_at IS NULL
     ORDER BY id ASC`
  );

  if (cycles.rows.length === 0) return [];

  const nowLocal = repLocalDate(ctx.now, ctx.timezone);
  const rows: CoverageRow[] = [];

  for (const cycle of cycles.rows) {
    const anchoredOn = cycle.anchored_on ?? nowLocal;
    const custom: CyclePeriodCustom | undefined =
      cycle.period === 'custom' && cycle.custom_every !== null && cycle.custom_unit !== null
        ? { every: cycle.custom_every, unit: cycle.custom_unit }
        : undefined;
    const periodKey = cyclePeriodKey(cycle.period, anchoredOn, nowLocal, custom);

    const counts = await pool.query<CoverageCountRow>(
      `SELECT
         (SELECT COUNT(*)
            FROM account_locations al
            JOIN accounts a ON a.id = al.account_id AND a.deleted_at IS NULL
            WHERE al.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM cycle_exclusions ex
                WHERE ex.cycle_id = $1 AND ex.location_id = al.id AND ex.deleted_at IS NULL
              )
         ) AS eligible,
         (SELECT COUNT(DISTINCT cp.location_id)
            FROM cycle_progress cp
            JOIN account_locations al ON al.id = cp.location_id AND al.deleted_at IS NULL
            JOIN accounts a ON a.id = al.account_id AND a.deleted_at IS NULL
            WHERE cp.cycle_id = $1
              AND cp.period_key = $2
              AND cp.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM cycle_exclusions ex
                WHERE ex.cycle_id = $1 AND ex.location_id = al.id AND ex.deleted_at IS NULL
              )
         ) AS covered`,
      [cycle.cycle_id, periodKey]
    );

    const eligibleLocations = Number(counts.rows[0]?.eligible ?? '0');
    const coveredLocations = Number(counts.rows[0]?.covered ?? '0');

    rows.push({
      cycleId: Number(cycle.cycle_id),
      name: cycle.name,
      period: cycle.period,
      periodKey,
      coveredLocations,
      eligibleLocations,
      ratio: eligibleLocations > 0 ? coveredLocations / eligibleLocations : 0,
      href: `${ctx.webUrl}/cycles/${cycle.cycle_id}`,
    });
  }

  return rows;
}
