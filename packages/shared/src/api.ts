/**
 * Wire contracts for the RepOS HTTP API.
 *
 * These types are the only thing apps/web is allowed to share with apps/api.
 * They are the frozen shape of `/api/sources`, `/api/health` and `/api/today`
 * (docs/REPOS_V1.md §4). Changing a field here is an API change: update the
 * spec first, then this file, then both sides.
 *
 * Every timestamp crossing the wire is an ISO-8601 string in UTC. Anything
 * that must render in the rep's own clock also carries a pre-rendered,
 * timezone-resolved display string, so the browser never re-guesses a zone.
 */

/** A venture RepOS reads. `kind` is presentational only; V1 gates nothing on it. */
export type SourceKind = 'territory' | 'venture';

/**
 * Result of comparing a source's `schema_migrations` against the Pathfinder
 * migration RepOS was built for.
 * - `ok`      — the source has exactly the migrations RepOS expects.
 * - `ahead`   — the source has extra migrations; boot warns and names them.
 * - `behind`  — the source is missing an expected migration; boot refuses.
 * - `unknown` — the check could not run (source unreachable).
 */
export type SchemaStatus = 'ok' | 'ahead' | 'behind' | 'unknown';

/** `GET /api/sources` — one entry per configured venture. Never a credential. */
export interface SourceSummary {
  slug: string;
  name: string;
  kind: SourceKind;
  /** Base URL of this venture's Pathfinder instance, for deep links. No trailing slash. */
  webUrl: string;
  schemaStatus: SchemaStatus;
  /** Migrations the source has that RepOS does not know about. Empty unless `ahead`. */
  extraMigrations: string[];
  /** Migrations RepOS expects that the source lacks. Empty unless `behind`. */
  missingMigrations: string[];
  /** IANA zone from `users.timezone` for user 1, e.g. `America/Chicago`. */
  timezone: string;
  /** Distinct `meeting_types.key` values configured in this instance. */
  meetingTypes: string[];
}

/** One source's live connectivity, as reported by `GET /api/health`. */
export interface SourceHealth {
  slug: string;
  reachable: boolean;
  schemaStatus: SchemaStatus;
  /** Round-trip of the probe query in milliseconds; null when unreachable. */
  latencyMs: number | null;
  /** Human-readable failure reason. Present only when something is wrong. */
  error?: string;
}

/** `GET /api/health` — overall roll-up plus per-source detail. */
export interface HealthReport {
  status: 'ok' | 'degraded';
  generatedAt: string;
  /** The Pathfinder migration this build of RepOS was written against. */
  expectedMigration: string;
  sources: SourceHealth[];
}

/** Today → "Needs a visit": accounts worst-first by `last_visit_at`, NULLS FIRST. */
export interface NeedsVisitRow {
  accountId: number;
  name: string;
  /** `accounts.account_type`, e.g. `retail` | `designer`. */
  accountType: string;
  /** Primary `account_locations` city/state, either may be null. */
  city: string | null;
  state: string | null;
  /** ISO UTC; null means never visited, which sorts first. */
  lastVisitAt: string | null;
  /** Whole days since the last visit; null when never visited. */
  daysSinceVisit: number | null;
  /** `{webUrl}/accounts/{accountId}`, precomputed server-side. */
  href: string;
}

/**
 * A `meeting_types` row, resolved for an anchored appointment (migration 0015).
 * `key` is the seed/backfill correspondence for the five types migration 0015
 * seeds (`prospecting`, `presentation`, `checkin`, `training`,
 * `updating_sales_aids`); a rep-created meeting type has `key IS NULL` and is
 * never rendered by its key, so consumers must identify a meeting type by
 * `id`, never by `key`, when `key` is null.
 */
export interface MeetingTypeSummary {
  id: number;
  key: string | null;
  name: string;
}

/** One appointment-anchored stop inside an upcoming trip. */
export interface TripStopSummary {
  stopId: number;
  accountId: number;
  accountName: string;
  /** Trip day, `YYYY-MM-DD`. */
  stopDate: string;
  sequence: number;
  /** `appointments.starts_at` as ISO UTC; null when the stop has no appointment. */
  startsAt: string | null;
  /** Same instant rendered in the source's timezone, e.g. `2026-07-08 2:00 PM`. */
  startsAtLocal: string | null;
  /**
   * The anchored appointment's meeting type; null when the stop has no
   * appointment (mirrors `startsAt`/`startsAtLocal`). See `MeetingTypeSummary`
   * for the null semantics of the `key` field inside it.
   */
  meetingType: MeetingTypeSummary | null;
}

/**
 * Today → "Upcoming trips": `start_date >= today`, soonest first. "Today" is
 * evaluated against `BlockContext.now` (apps/api/src/blocks/context.ts), not
 * the wall clock at request time, so a block and its tests can agree on a
 * fixed instant.
 */
export interface UpcomingTripRow {
  tripId: number;
  name: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  status: string;
  stopCount: number;
  stops: TripStopSummary[];
  /** `{webUrl}/trips/{tripId}`. */
  href: string;
}

/** Today → "Pipeline": one row per `prospect_stages` row, in `sort_order`. */
export interface PipelineRow {
  stageId: number;
  key: string;
  label: string;
  sortOrder: number;
  /** Live (non-archived, non-deleted) prospects sitting in this stage. */
  prospectCount: number;
  /** `{webUrl}/prospects?stage={key}`. */
  href: string;
}

/** Today → "Coverage": per active cycle, covered vs eligible for this period. */
export interface CoverageRow {
  cycleId: number;
  name: string;
  /** `cycles.period`: weekly | monthly | quarterly | yearly | custom. */
  period: string;
  /** The period bucket these numbers describe, e.g. `2026-09`. */
  periodKey: string;
  coveredLocations: number;
  eligibleLocations: number;
  /** 0–1, `coveredLocations / eligibleLocations`; 0 when nothing is eligible. */
  ratio: number;
  /** `{webUrl}/cycles/{cycleId}`. */
  href: string;
}

/** One venture's slice of the Today page. */
export interface TodaySource {
  slug: string;
  name: string;
  kind: SourceKind;
  webUrl: string;
  timezone: string;
  needsVisit: NeedsVisitRow[];
  upcomingTrips: UpcomingTripRow[];
  pipeline: PipelineRow[];
  coverage: CoverageRow[];
  /**
   * This source's own totals, computed by `apps/api/src/blocks/totals.ts`.
   * `services/today.ts` sums these across every source that answered into
   * the page-level `TodayPayload.totals` (see `TodayTotals`).
   */
  totals: SourceTotals;
  /**
   * Set when this source could not be read. The other arrays are then empty and
   * the rest of the page still renders (docs/REPOS_V1.md §7.6). Absent on success.
   */
  error?: string;
}

/** One source's contribution to the cross-venture totals; see `TodaySource.totals`. */
export interface SourceTotals {
  activeAccounts: number;
  prospectsInPipeline: number;
  tripsThisWeek: number;
  /** Accounts never visited or last visited 90+ days ago. */
  staleAccounts: number;
}

/**
 * Cross-venture header numbers. Same shape as `SourceTotals` — it is the
 * field-wise sum of every source's `totals` for sources that answered
 * (`services/today.ts`), so a source with an `error` contributes zero.
 */
export interface TodayTotals {
  activeAccounts: number;
  prospectsInPipeline: number;
  tripsThisWeek: number;
  /** Accounts never visited or last visited 90+ days ago. */
  staleAccounts: number;
}

/** `GET /api/today` — the whole page in one payload. */
export interface TodayPayload {
  generatedAt: string;
  totals: TodayTotals;
  sources: TodaySource[];
}

/** Uniform error body for a 4xx/5xx from the RepOS API. */
export interface ApiError {
  error: string;
  detail?: string;
}
