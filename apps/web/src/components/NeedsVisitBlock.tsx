/**
 * "Needs a visit". Each row deep-links to `{webUrl}/accounts/{id}` via the
 * precomputed `href` (C8).
 */
import type { NeedsVisitRow } from '@repos/shared';

export default function NeedsVisitBlock({ rows }: { rows: NeedsVisitRow[] }) {
  return (
    <div data-testid="block-needs-visit" className="p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Needs a visit
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Nothing due.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.accountId}
              data-testid={`needs-visit-row-${row.accountId}`}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{row.name}</div>
                <div className="text-xs text-slate-500">
                  {[row.city, row.state].filter(Boolean).join(', ') || row.accountType}
                  {' · '}
                  {row.daysSinceVisit === null ? 'never visited' : `${row.daysSinceVisit}d ago`}
                </div>
              </div>
              <a
                href={row.href}
                className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
              >
                Open in Pathfinder
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
