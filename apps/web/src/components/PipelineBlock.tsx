/** "Pipeline", prospect stages in sort_order. */
import type { PipelineRow } from '@repos/shared';

export default function PipelineBlock({ rows }: { rows: PipelineRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.prospectCount));
  return (
    <div data-testid="block-pipeline" className="p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pipeline</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No stages configured.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.stageId} data-testid={`pipeline-row-${row.key}`}>
              <a
                href={row.href}
                className="flex items-center justify-between gap-2 text-sm hover:underline"
              >
                <span className="text-slate-700">{row.label}</span>
                <span className="font-medium text-slate-900">{row.prospectCount}</span>
              </a>
              <div
                role="progressbar"
                aria-valuenow={row.prospectCount}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${row.label} prospects`}
                className="mt-1 h-1.5 w-full rounded-full bg-slate-100"
              >
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${(row.prospectCount / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
