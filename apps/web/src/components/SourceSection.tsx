/**
 * One venture's section: the four blocks, or an error state when the source
 * could not be read (docs/REPOS_V1.md §7.6).
 */
import type { TodaySource } from '@repos/shared';
import NeedsVisitBlock from './NeedsVisitBlock';
import UpcomingTripsBlock from './UpcomingTripsBlock';
import PipelineBlock from './PipelineBlock';
import CoverageBlock from './CoverageBlock';

export default function SourceSection({ source }: { source: TodaySource }) {
  return (
    <section data-testid={`source-${source.slug}`} className="border-b border-slate-200">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-lg font-semibold text-slate-900">{source.name}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-500">
          {source.kind}
        </span>
      </div>
      {source.error ? (
        <p
          data-testid={`source-${source.slug}-error`}
          className="mx-4 mb-4 mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {source.error}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NeedsVisitBlock rows={source.needsVisit} />
          <UpcomingTripsBlock rows={source.upcomingTrips} timezone={source.timezone} />
          <PipelineBlock rows={source.pipeline} />
          <CoverageBlock rows={source.coverage} />
        </div>
      )}
    </section>
  );
}
