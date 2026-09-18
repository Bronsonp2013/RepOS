/**
 * Barrel for the Today blocks. `routes/today.ts` → `services/today.ts` import
 * block functions and `BlockContext` from here rather than reaching into
 * individual block files (CLAUDE.md: one module per Today block, one place
 * to import them from).
 */
export type { BlockContext } from './context';
export { NEEDS_VISIT_LIMIT } from './context';

export { needsVisit } from './needsVisit';
export { upcomingTrips } from './upcomingTrips';
export { pipeline } from './pipeline';
export { coverage } from './coverage';
export { totals } from './totals';
