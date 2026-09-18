/**
 * The single HTTP chokepoint for the web app. Every fetch goes through here so
 * the base URL, error shape and query keys stay in one place.
 */
import type { ApiError, HealthReport, SourceSummary, TodayPayload } from '@repos/shared';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3200';

export const queryKeys = {
  sources: ['sources'] as const,
  health: ['health'] as const,
  today: ['today'] as const,
};

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'error' in value;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body: unknown = await res.json();
      if (isApiError(body)) {
        message = body.detail ? `${body.error}: ${body.detail}` : body.error;
      }
    } catch {
      // Response body wasn't JSON; fall back to the status line.
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
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
