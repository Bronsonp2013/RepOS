/**
 * One venture's section: the four blocks, or an error state when the source
 * could not be read (docs/REPOS_V1.md §7.6). STUB — the `web` lane implements it.
 */
import type { TodaySource } from '@repos/shared';
import NeedsVisitBlock from './NeedsVisitBlock';
import UpcomingTripsBlock from './UpcomingTripsBlock';
import PipelineBlock from './PipelineBlock';
import CoverageBlock from './CoverageBlock';

export default function SourceSection({ source }: { source: TodaySource }) {
  return (
    <section data-testid={`source-${source.slug}`}>
      <h2>{source.name}</h2>
      {source.error ? (
        <p data-testid={`source-${source.slug}-error`}>{source.error}</p>
      ) : (
        <>
          <NeedsVisitBlock rows={source.needsVisit} />
          <UpcomingTripsBlock rows={source.upcomingTrips} timezone={source.timezone} />
          <PipelineBlock rows={source.pipeline} />
          <CoverageBlock rows={source.coverage} />
        </>
      )}
    </section>
  );
}
