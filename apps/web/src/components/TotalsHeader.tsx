/** Cross-venture header row: totals summed across every source that answered. */
import type { TodayTotals } from '@repos/shared';

const TILES: Array<{ key: keyof TodayTotals; label: string }> = [
  { key: 'activeAccounts', label: 'Active accounts' },
  { key: 'prospectsInPipeline', label: 'Prospects in pipeline' },
  { key: 'tripsThisWeek', label: 'Trips this week' },
  { key: 'staleAccounts', label: 'Stale accounts' },
];

export default function TotalsHeader({ totals }: { totals: TodayTotals }) {
  return (
    <header
      data-testid="totals-header"
      className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 sm:grid-cols-4"
    >
      {TILES.map(({ key, label }) => (
        <div key={key} data-testid={`totals-${key}`} className="rounded-lg bg-slate-50 p-3">
          <div className="text-2xl font-semibold text-slate-900">{totals[key]}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      ))}
    </header>
  );
}
