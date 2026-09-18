/** "Pipeline", prospect stages in sort_order. STUB — the `web` lane implements it. */
import type { PipelineRow } from '@repos/shared';

export default function PipelineBlock({ rows }: { rows: PipelineRow[] }) {
  void rows;
  return <div data-testid="block-pipeline" />;
}
