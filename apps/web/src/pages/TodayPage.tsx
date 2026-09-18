/**
 * The Today page: a cross-venture header, then one section per source
 * (docs/REPOS_V1.md §3). Covered by e2e/today.spec.ts.
 */
import { useQuery } from '@tanstack/react-query';
import type { TodayPayload } from '@repos/shared';
import { fetchToday, queryKeys } from '../lib/api';
import TotalsHeader from '../components/TotalsHeader';
import SourceSection from '../components/SourceSection';

export default function TodayPage() {
  const { data, isPending, isError, error } = useQuery<TodayPayload>({
    queryKey: queryKeys.today,
    queryFn: fetchToday,
  });

  if (isError) {
    return (
      <main data-testid="today-error" className="p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </main>
    );
  }

  if (isPending) {
    return (
      <main data-testid="today-loading" className="p-4 text-sm text-slate-500">
        Loading…
      </main>
    );
  }

  return (
    <main data-testid="today-page" className="mx-auto max-w-4xl">
      <TotalsHeader totals={data.totals} />
      {data.sources.map((source) => (
        <SourceSection key={source.slug} source={source} />
      ))}
    </main>
  );
}
