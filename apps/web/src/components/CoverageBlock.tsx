/** "Coverage", covered / eligible per active cycle, as a bar. */
import type { CoverageRow } from '@repos/shared';

export default function CoverageBlock({ rows }: { rows: CoverageRow[] }) {
  return (
    <div data-testid="block-coverage" className="p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Coverage</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No active cycles.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.cycleId} data-testid={`coverage-row-${row.cycleId}`}>
              <a href={row.href} className="flex items-center justify-between text-sm hover:underline">
                <span className="text-slate-700">
                  {row.name} <span className="text-slate-600">({row.periodKey})</span>
                </span>
                <span className="font-medium text-slate-900">
                  {row.coveredLocations}/{row.eligibleLocations}
                </span>
              </a>
              <div
                role="progressbar"
                aria-valuenow={Math.round(row.ratio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.name} coverage`}
                className="mt-1 h-1.5 w-full rounded-full bg-slate-100"
              >
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${Math.round(row.ratio * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
