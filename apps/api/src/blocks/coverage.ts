/**
 * Today block: coverage.
 * Per active cycle, covered vs eligible locations for the current period. Deep-links to {webUrl}/cycles/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 * STUB — the `blocks` lane implements it. Covered by apps/api/src/today.test.ts.
 */
import type { Pool } from 'pg';
import type { CoverageRow } from '@repos/shared';
import type { BlockContext } from './context';

export async function coverage(pool: Pool, ctx: BlockContext): Promise<CoverageRow[]> {
  void pool;
  void ctx;
  throw new Error('not implemented: coverage');
}
