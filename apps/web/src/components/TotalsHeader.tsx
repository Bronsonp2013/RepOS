/** Cross-venture header row. STUB — the `web` lane implements it. */
import type { TodayTotals } from '@repos/shared';

export default function TotalsHeader({ totals }: { totals: TodayTotals }) {
  void totals;
  return <header data-testid="totals-header" />;
}
