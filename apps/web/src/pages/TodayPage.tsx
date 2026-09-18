/**
 * The Today page: a cross-venture header, then one section per source
 * (docs/REPOS_V1.md §3). STUB — the `web` lane implements it.
 * Covered by e2e/today.spec.ts.
 */
import { useQuery } from '@tanstack/react-query';
import type { TodayPayload } from '@repos/shared';
import { fetchToday, queryKeys } from '../lib/api';
import TotalsHeader from '../components/TotalsHeader';
import SourceSection from '../components/SourceSection';

export default function TodayPage() {
  const { data, isPending, error } = useQuery<TodayPayload>({
    queryKey: queryKeys.today,
    queryFn: fetchToday,
  });

  if (isPending) return <main data-testid="today-loading">Loading…</main>;
  if (error) return <main data-testid="today-error">{String(error)}</main>;

  return (
    <main data-testid="today-page">
      <TotalsHeader totals={data.totals} />
      {data.sources.map((source) => (
        <SourceSection key={source.slug} source={source} />
      ))}
    </main>
  );
}
