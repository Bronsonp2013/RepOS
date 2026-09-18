/**
 * Today block: pipeline.
 * One row per `prospect_stages` row in `sort_order`, with live prospect counts. Deep-links to {webUrl}/prospects?stage={key}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 * STUB — the `blocks` lane implements it. Covered by apps/api/src/today.test.ts.
 */
import type { Pool } from 'pg';
import type { PipelineRow } from '@repos/shared';
import type { BlockContext } from './context';

export async function pipeline(pool: Pool, ctx: BlockContext): Promise<PipelineRow[]> {
  void pool;
  void ctx;
  throw new Error('not implemented: pipeline');
}
