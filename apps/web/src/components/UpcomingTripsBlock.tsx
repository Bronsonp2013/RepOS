/** "Upcoming trips", times rendered rep-local (`startsAtLocal` from the API). */
import type { UpcomingTripRow } from '@repos/shared';

export default function UpcomingTripsBlock({
  rows,
  timezone,
}: {
  rows: UpcomingTripRow[];
  timezone: string;
}) {
  return (
    <div data-testid="block-upcoming-trips" className="p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Upcoming trips <span className="font-normal normal-case text-slate-400">({timezone})</span>
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No trips scheduled.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {rows.map((trip) => (
            <li key={trip.tripId} data-testid={`trip-row-${trip.tripId}`}>
              <a href={trip.href} className="font-medium text-blue-600 hover:underline">
                {trip.name}
              </a>
              <div className="text-xs text-slate-500">
                {trip.startDate} – {trip.endDate} · {trip.stopCount} stop
                {trip.stopCount === 1 ? '' : 's'}
              </div>
              {trip.stops.length > 0 && (
                <ul className="mt-1 space-y-1 pl-3 text-sm text-slate-700">
                  {trip.stops.map((stop) => (
                    <li key={stop.stopId} data-testid={`trip-stop-${stop.stopId}`}>
                      {stop.accountName}
                      {stop.startsAtLocal ? ` — ${stop.startsAtLocal}` : ''}
                      {stop.meetingType ? ` (${stop.meetingType.name})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
