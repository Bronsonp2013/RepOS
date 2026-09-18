/**
 * The single HTTP chokepoint for the web app. Every fetch goes through here so
 * the base URL, error shape and query keys stay in one place.
 * STUB — the `web` lane implements the fetch bodies.
 */
import type { HealthReport, SourceSummary, TodayPayload } from '@repos/shared';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3200';

export const queryKeys = {
  sources: ['sources'] as const,
  health: ['health'] as const,
  today: ['today'] as const,
};

export async function apiGet<T>(path: string): Promise<T> {
  void path;
  throw new Error('not implemented: apiGet');
}

export function fetchSources(): Promise<SourceSummary[]> {
  return apiGet<SourceSummary[]>('/api/sources');
}

export function fetchHealth(): Promise<HealthReport> {
  return apiGet<HealthReport>('/api/health');
}

export function fetchToday(): Promise<TodayPayload> {
  return apiGet<TodayPayload>('/api/today');
}
