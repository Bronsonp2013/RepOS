/** "Upcoming trips", times rendered rep-local. STUB — the `web` lane implements it. */
import type { UpcomingTripRow } from '@repos/shared';

export default function UpcomingTripsBlock({
  rows,
  timezone,
}: {
  rows: UpcomingTripRow[];
  timezone: string;
}) {
  void rows;
  void timezone;
  return <div data-testid="block-upcoming-trips" />;
}
