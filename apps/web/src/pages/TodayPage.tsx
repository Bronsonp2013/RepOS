/**
 * The Today page: a cross-venture header, then one section per source
 * (docs/REPOS_V1.md §3). Covered by e2e/today.spec.ts.
 */
import { useQuery } from '@tanstack/react-query';
import type { TodayPayload } from '@repos/shared';
import { fetchToday, queryKeys } from '../lib/api';
import TotalsHeader from '../components/TotalsHeader';
import SourceSection from '../components/SourceSection';

function formatAsOf(generatedAt: string): string {
  const parsed = new Date(generatedAt);
  return Number.isNaN(parsed.getTime()) ? generatedAt : parsed.toLocaleString();
}

export default function TodayPage() {
  const { data, isPending, isError, error } = useQuery<TodayPayload>({
    queryKey: queryKeys.today,
    queryFn: fetchToday,
    // A slow/failed background refetch should never retry into a doubled
    // load on an already-saturated connection pool (F23).
    retry: false,
  });

  if (isPending) {
    return (
      <main
        data-testid="today-loading"
        role="status"
        aria-live="polite"
        className="p-4 text-sm text-slate-500"
      >
        Loading…
      </main>
    );
  }

  // A background refetch failing must not discard good cached data (F39):
  // fall back to the full-page error only when there is nothing to show.
  if (data === undefined) {
    return (
      <main data-testid="today-error" role="alert" className="p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </main>
    );
  }

  return (
    <main data-testid="today-page" className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Today <span className="text-sm font-normal text-slate-600">· As of {formatAsOf(data.generatedAt)}</span>
        </h1>
      </header>
      {isError && (
        <p
          data-testid="today-refresh-error"
          role="alert"
          className="mx-4 mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800"
        >
          Showing the last data that loaded successfully. {error instanceof Error ? error.message : String(error)}
        </p>
      )}
      <TotalsHeader totals={data.totals} />
      {data.sources.length === 0 ? (
        <p data-testid="today-no-sources" className="p-4 text-sm text-slate-600">
          No sources configured.
        </p>
      ) : (
        data.sources.map((source) => <SourceSection key={source.slug} source={source} />)
      )}
    </main>
  );
}
