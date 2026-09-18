/**
 * Today block: upcomingTrips.
 * Trips with `start_date >= today`, soonest first, with anchored appointments rendered in the source timezone. Deep-links to {webUrl}/trips/{id}.
 *
 * Every query against Pathfinder tables for this block lives in this file and
 * nowhere else, so a Pathfinder schema change lands in one place (CLAUDE.md).
 *
 * Schema notes: `trip_stops.location_id` (0012) points at `account_locations`;
 * unused here directly (the stop's account is what renders), but the FK is
 * why a stop's location can outlive an account edit. An anchored stop's
 * appointment resolves its meeting type via `appointments.meeting_type_id`
 * (0015); `meeting_types.key` is null for a rep-created type (see
 * `MeetingTypeSummary` in packages/shared/src/api.ts) and must never be
 * treated as unset in the SQL below. "Today" is `BlockContext.now` read in
 * `BlockContext.timezone`, never the wall clock.
 */
import type { Pool } from 'pg';
import type { MeetingTypeSummary, TripStopSummary, UpcomingTripRow } from '@repos/shared';
import type { BlockContext } from './context';
import { formatInTimeZone } from 'date-fns-tz';
import { localDateOnly, repLocalDateString } from './repLocal';

interface TripQueryRow {
  trip_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  status: string;
}

interface StopQueryRow {
  stop_id: string;
  trip_id: string;
  account_id: string;
  account_name: string;
  stop_date: Date;
  sequence: number;
  starts_at: Date | null;
  meeting_type_id: string | null;
  meeting_type_key: string | null;
  meeting_type_name: string | null;
}

export async function upcomingTrips(pool: Pool, ctx: BlockContext): Promise<UpcomingTripRow[]> {
  const today = repLocalDateString(ctx.now, ctx.timezone);

  const trips = await pool.query<TripQueryRow>(
    `SELECT id AS trip_id, name, start_date, end_date, status
     FROM trips
     WHERE deleted_at IS NULL AND start_date >= $1::date
     ORDER BY start_date ASC, id ASC`,
    [today]
  );

  if (trips.rows.length === 0) return [];

  const tripIds = trips.rows.map((row) => row.trip_id);
  const stops = await pool.query<StopQueryRow>(
    `SELECT
       ts.id AS stop_id,
       ts.trip_id,
       ts.account_id,
       a.name AS account_name,
       ts.stop_date,
       ts.sequence,
       ap.starts_at,
       mt.id AS meeting_type_id,
       mt.key AS meeting_type_key,
       mt.name AS meeting_type_name
     FROM trip_stops ts
     JOIN accounts a ON a.id = ts.account_id
     LEFT JOIN appointments ap ON ap.id = ts.appointment_id AND ap.deleted_at IS NULL
     LEFT JOIN meeting_types mt ON mt.id = ap.meeting_type_id AND mt.deleted_at IS NULL
     WHERE ts.trip_id = ANY($1::bigint[])
     ORDER BY ts.trip_id ASC, ts.stop_date ASC, ts.sequence ASC`,
    [tripIds]
  );

  const stopsByTrip = new Map<string, TripStopSummary[]>();
  for (const row of stops.rows) {
    const meetingType: MeetingTypeSummary | null = row.meeting_type_id
      ? { id: Number(row.meeting_type_id), key: row.meeting_type_key, name: row.meeting_type_name ?? '' }
      : null;

    const summary: TripStopSummary = {
      stopId: Number(row.stop_id),
      accountId: Number(row.account_id),
      accountName: row.account_name,
      stopDate: localDateOnly(row.stop_date),
      sequence: row.sequence,
      startsAt: row.starts_at ? row.starts_at.toISOString() : null,
      startsAtLocal: row.starts_at ? formatInTimeZone(row.starts_at, ctx.timezone, 'yyyy-MM-dd h:mm a') : null,
      meetingType,
    };

    const list = stopsByTrip.get(row.trip_id);
    if (list) {
      list.push(summary);
    } else {
      stopsByTrip.set(row.trip_id, [summary]);
    }
  }

  return trips.rows.map((row) => {
    const tripStops = stopsByTrip.get(row.trip_id) ?? [];
    return {
      tripId: Number(row.trip_id),
      name: row.name,
      startDate: localDateOnly(row.start_date),
      endDate: localDateOnly(row.end_date),
      status: row.status,
      stopCount: tripStops.length,
      stops: tripStops,
      href: `${ctx.webUrl}/trips/${row.trip_id}`,
    };
  });
}
