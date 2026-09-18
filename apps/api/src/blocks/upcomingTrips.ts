/**
 * Today block: upcomingTrips.
 * Trips with `start_date >= today`, soonest first, with anchored appointments rendered in the source timezone. Deep-links to {webUrl}/trips/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 * STUB — the `blocks` lane implements it. Covered by apps/api/src/today.test.ts.
 */
import type { Pool } from 'pg';
import type { UpcomingTripRow } from '@repos/shared';
import type { BlockContext } from './context';

export async function upcomingTrips(pool: Pool, ctx: BlockContext): Promise<UpcomingTripRow[]> {
  void pool;
  void ctx;
  throw new Error('not implemented: upcomingTrips');
}
