/**
 * "Needs a visit". Each row deep-links to `{webUrl}/accounts/{id}` via the
 * precomputed `href` (C8). STUB — the `web` lane implements it.
 */
import type { NeedsVisitRow } from '@repos/shared';

export default function NeedsVisitBlock({ rows }: { rows: NeedsVisitRow[] }) {
  void rows;
  return <div data-testid="block-needs-visit" />;
}
