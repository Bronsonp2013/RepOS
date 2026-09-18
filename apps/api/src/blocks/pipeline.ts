/**
 * Today block: pipeline.
 * One row per `prospect_stages` row in `sort_order`, with live prospect counts. Deep-links to {webUrl}/prospects?stage={key}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 *
 * Schema notes: stages and prospects both landed in 0010. "Live" means
 * `prospects.deleted_at IS NULL` and not yet archived (`archived_at IS NULL`
 * — archived_at is set on Lost or after graduation to an account, per 0010).
 */
import type { Pool } from 'pg';
import type { PipelineRow } from '@repos/shared';
import type { BlockContext } from './context';

interface PipelineQueryRow {
  stage_id: string;
  key: string;
  label: string;
  sort_order: number;
  prospect_count: string;
}

export async function pipeline(pool: Pool, ctx: BlockContext): Promise<PipelineRow[]> {
  const result = await pool.query<PipelineQueryRow>(
    `SELECT
       ps.id AS stage_id,
       ps.key,
       ps.label,
       ps.sort_order,
       COUNT(p.id) AS prospect_count
     FROM prospect_stages ps
     LEFT JOIN prospects p
       ON p.prospect_stage_id = ps.id AND p.deleted_at IS NULL AND p.archived_at IS NULL
     WHERE ps.deleted_at IS NULL
     GROUP BY ps.id, ps.key, ps.label, ps.sort_order
     ORDER BY ps.sort_order ASC`
  );

  return result.rows.map((row) => ({
    stageId: Number(row.stage_id),
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order,
    prospectCount: Number(row.prospect_count),
    href: `${ctx.webUrl}/prospects?stage=${row.key}`,
  }));
}
