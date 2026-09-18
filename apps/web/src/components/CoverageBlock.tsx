/** "Coverage", covered / eligible per active cycle. STUB — the `web` lane implements it. */
import type { CoverageRow } from '@repos/shared';

export default function CoverageBlock({ rows }: { rows: CoverageRow[] }) {
  void rows;
  return <div data-testid="block-coverage" />;
}
