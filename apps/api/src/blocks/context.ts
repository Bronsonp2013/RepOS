/**
 * The context every Today block receives. Shared by the four block modules so
 * a schema change lands in one file per block, not in the route (CLAUDE.md).
 */
import type { SourceKind } from '@repos/shared';

export interface BlockContext {
  /** Source slug, for messages and hrefs. */
  slug: string;
  kind: SourceKind;
  /** Base URL of this venture's Pathfinder instance. No trailing slash. */
  webUrl: string;
  /** IANA zone from `users.timezone` for user 1 in this source. */
  timezone: string;
  /** "Now" for the whole request, so every block agrees on today. */
  now: Date;
}

/** Rows returned per block, before the route assembles them. */
export const NEEDS_VISIT_LIMIT = 8;

/** Max trips returned by the upcomingTrips block. */
export const UPCOMING_TRIPS_LIMIT = 10;
