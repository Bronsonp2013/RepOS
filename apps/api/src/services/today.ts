/**
 * Assembles `GET /api/today`: runs the four blocks per source, sums the header
 * totals, and degrades one source without failing the request — an unreachable
 * venture returns HTTP 200 with `error` set on its entry only
 * (docs/REPOS_V1.md §7.6). STUB — the `routes` lane implements it.
 * Covered by today.test.ts and degrade.test.ts.
 */
import type { TodayPayload, TodaySource } from '@repos/shared';
import type { SourcePoolFactory } from '@repos/sources';

export async function buildTodaySource(
  factory: SourcePoolFactory,
  slug: string,
  now: Date
): Promise<TodaySource> {
  void factory;
  void slug;
  void now;
  throw new Error('not implemented: buildTodaySource');
}

export async function buildToday(factory: SourcePoolFactory, now: Date): Promise<TodayPayload> {
  void factory;
  void now;
  throw new Error('not implemented: buildToday');
}
