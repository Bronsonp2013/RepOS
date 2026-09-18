/**
 * Today block: totals.
 * One source's contribution to the cross-venture header numbers — active
 * accounts, prospects in the pipeline, trips this week, and stale accounts.
 * `services/today.ts` sums every source's result into `TodayPayload.totals`.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 * STUB — the `blocks` lane implements it. Covered by apps/api/src/blocks/today-blocks.test.ts.
 */
import type { Pool } from 'pg';
import type { SourceTotals } from '@repos/shared';
import type { BlockContext } from './context';

export async function totals(pool: Pool, ctx: BlockContext): Promise<SourceTotals> {
  void pool;
  void ctx;
  throw new Error('not implemented: totals');
}
