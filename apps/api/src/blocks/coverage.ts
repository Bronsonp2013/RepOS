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
  cycle_id: string;
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

  // periodKey is opaque and computed in JS (cyclePeriodKey, @repos/shared),
  // never in SQL — see the file header. Compute it per cycle first, then
  // resolve eligible/covered for every cycle in one set-based query instead
  // of one query per cycle: statement_timeout is per statement, so an N+1
  // loop here had worst-case latency scaling with the number of active
  // cycles with no bound capping it.
  const periodKeys = new Map<string, string>();
  for (const cycle of cycles.rows) {
    const anchoredOn = cycle.anchored_on ?? nowLocal;
    const custom: CyclePeriodCustom | undefined =
      cycle.period === 'custom' && cycle.custom_every !== null && cycle.custom_unit !== null
        ? { every: cycle.custom_every, unit: cycle.custom_unit }
        : undefined;
    periodKeys.set(cycle.cycle_id, cyclePeriodKey(cycle.period, anchoredOn, nowLocal, custom));
  }

  const cycleIds = cycles.rows.map((c) => c.cycle_id);
  const cyclePeriodKeyList = cycles.rows.map((c) => periodKeys.get(c.cycle_id) as string);

  const counts = await pool.query<CoverageCountRow>(
    `WITH cycle_periods AS (
       SELECT * FROM UNNEST($1::bigint[], $2::text[]) AS cp(cycle_id, period_key)
     ),
     eligible AS (
       SELECT cp.cycle_id, COUNT(al.id) AS eligible
       FROM cycle_periods cp
       JOIN account_locations al ON al.deleted_at IS NULL
       JOIN accounts a ON a.id = al.account_id AND a.deleted_at IS NULL
       WHERE NOT EXISTS (
         SELECT 1 FROM cycle_exclusions ex
         WHERE ex.cycle_id = cp.cycle_id AND ex.location_id = al.id AND ex.deleted_at IS NULL
       )
       GROUP BY cp.cycle_id
     ),
     covered AS (
       SELECT cp.cycle_id, COUNT(DISTINCT al.id) AS covered
       FROM cycle_periods cp
       JOIN cycle_progress prog
         ON prog.cycle_id = cp.cycle_id AND prog.period_key = cp.period_key AND prog.deleted_at IS NULL
       JOIN account_locations al ON al.id = prog.location_id AND al.deleted_at IS NULL
       JOIN accounts a ON a.id = al.account_id AND a.deleted_at IS NULL
       WHERE NOT EXISTS (
         SELECT 1 FROM cycle_exclusions ex
         WHERE ex.cycle_id = cp.cycle_id AND ex.location_id = al.id AND ex.deleted_at IS NULL
       )
       GROUP BY cp.cycle_id
     )
     SELECT cp.cycle_id, COALESCE(e.eligible, 0) AS eligible, COALESCE(c.covered, 0) AS covered
     FROM cycle_periods cp
     LEFT JOIN eligible e ON e.cycle_id = cp.cycle_id
     LEFT JOIN covered c ON c.cycle_id = cp.cycle_id`,
    [cycleIds, cyclePeriodKeyList]
  );

  const countsByCycle = new Map<string, { eligible: number; covered: number }>();
  for (const row of counts.rows) {
    countsByCycle.set(row.cycle_id, {
      eligible: Number(row.eligible ?? '0'),
      covered: Number(row.covered ?? '0'),
    });
  }

  return cycles.rows.map((cycle) => {
    const periodKey = periodKeys.get(cycle.cycle_id) as string;
    const { eligible: eligibleLocations, covered: coveredLocations } = countsByCycle.get(cycle.cycle_id) ?? {
      eligible: 0,
      covered: 0,
    };

    return {
      // `Number()` can round a bigint id above 2^53; the href is built from
      // the raw string id below so a deep link never 404s on that cycle.
      cycleId: Number(cycle.cycle_id),
      name: cycle.name,
      period: cycle.period,
      periodKey,
      coveredLocations,
      eligibleLocations,
      ratio: eligibleLocations > 0 ? coveredLocations / eligibleLocations : 0,
      href: `${ctx.webUrl}/cycles/${cycle.cycle_id}`,
    };
  });
}
