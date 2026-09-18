/**
 * `GET /api/health` and the `/api/sources` summaries: per-source connectivity
 * and the boot schema verdict, with no credential in the output (C9).
 * STUB — the `routes` lane implements it. Covered by sources.test.ts.
 */
import type { HealthReport, SourceSummary } from '@repos/shared';
import type { SourcePoolFactory } from '@repos/sources';

export async function buildSourceSummaries(factory: SourcePoolFactory): Promise<SourceSummary[]> {
  void factory;
  throw new Error('not implemented: buildSourceSummaries');
}

export async function buildHealthReport(factory: SourcePoolFactory): Promise<HealthReport> {
  void factory;
  throw new Error('not implemented: buildHealthReport');
}
