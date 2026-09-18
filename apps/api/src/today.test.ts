/**
 * C6 — GET /api/today against the fixture databases.
 * Owned by the `blocks` lane. Asserts the four block outputs:
 *   - lexington needsVisit lists account 48 first (never visited);
 *   - lexington upcomingTrips contains the trip anchored on appointment 1,
 *     rendered as 2026-07-08 2:00 PM America/Chicago;
 *   - the venture source shows zero accounts and zero prospects;
 *   - pipeline lists prospect_stages in sort_order; coverage is present.
 * Selected by: npm test -- today
 */
import { describe, it } from 'vitest';

describe('GET /api/today (C6)', () => {
  it('lists account 48 first under lexington needsVisit (never visited)', () => {
    throw new Error('not implemented: assert needsVisit[0].accountId === 48');
  });

  it('renders the trip anchored on appointment 1 as 2026-07-08 2:00 PM America/Chicago', () => {
    throw new Error('not implemented: assert startsAtLocal for trip 1 stop 1');
  });

  it('shows zero accounts and zero prospects for the venture source', () => {
    throw new Error('not implemented: assert empty needsVisit and zero prospect counts');
  });

  it('lists prospect_stages in sort_order and returns a coverage block', () => {
    throw new Error('not implemented: assert pipeline ordering and coverage presence');
  });
});
