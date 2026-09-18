/**
 * Today block: needsVisit.
 * Accounts worst-first by `last_visit_at`, NULLS FIRST, top 8 (docs/REPOS_V1.md §3). Deep-links to {webUrl}/accounts/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 * STUB — the `blocks` lane implements it. Covered by apps/api/src/today.test.ts.
 */
import type { Pool } from 'pg';
import type { NeedsVisitRow } from '@repos/shared';
import type { BlockContext } from './context';

export async function needsVisit(pool: Pool, ctx: BlockContext): Promise<NeedsVisitRow[]> {
  void pool;
  void ctx;
  throw new Error('not implemented: needsVisit');
}
