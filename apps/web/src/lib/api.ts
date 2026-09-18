/**
 * The single HTTP chokepoint for the web app. Every fetch goes through here so
 * the base URL, error shape and query keys stay in one place.
 */
import { z } from 'zod';
import type { TodayPayload } from '@repos/shared';

// Same-origin by default so the built bundle works behind Caddy's
// connect-src 'self' (Caddyfile.example) without a build-time ARG. Override
// only for local dev against a standalone API (see .env.test).
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export const queryKeys = {
  today: ['today'] as const,
};

/** Bail out of a hung request rather than piling onto a saturated pool. */
const REQUEST_TIMEOUT_MS = 10_000;

const apiErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});

const meetingTypeSchema = z.object({
  id: z.number(),
  key: z.string().nullable(),
  name: z.string(),
});

const needsVisitRowSchema = z.object({
  accountId: z.number(),
  name: z.string(),
  accountType: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  lastVisitAt: z.string().nullable(),
  daysSinceVisit: z.number().nullable(),
  href: z.string(),
});

const tripStopSchema = z.object({
  stopId: z.number(),
  accountId: z.number(),
  accountName: z.string(),
  stopDate: z.string(),
  sequence: z.number(),
  startsAt: z.string().nullable(),
  startsAtLocal: z.string().nullable(),
  meetingType: meetingTypeSchema.nullable(),
});

const upcomingTripRowSchema = z.object({
  tripId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  stopCount: z.number(),
  stops: z.array(tripStopSchema),
  href: z.string(),
});

const pipelineRowSchema = z.object({
  stageId: z.number(),
  key: z.string(),
  label: z.string(),
  sortOrder: z.number(),
  prospectCount: z.number(),
  href: z.string(),
});

const coverageRowSchema = z.object({
  cycleId: z.number(),
  name: z.string(),
  period: z.string(),
  periodKey: z.string(),
  coveredLocations: z.number(),
  eligibleLocations: z.number(),
  ratio: z.number(),
  href: z.string(),
});

const sourceTotalsSchema = z.object({
  activeAccounts: z.number(),
  prospectsInPipeline: z.number(),
  tripsThisWeek: z.number(),
  staleAccounts: z.number(),
});

const todaySourceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  kind: z.union([z.literal('territory'), z.literal('venture')]),
  webUrl: z.string(),
  timezone: z.string(),
  needsVisit: z.array(needsVisitRowSchema),
  upcomingTrips: z.array(upcomingTripRowSchema),
  pipeline: z.array(pipelineRowSchema),
  coverage: z.array(coverageRowSchema),
  totals: sourceTotalsSchema,
  error: z.string().optional(),
});

export const todayPayloadSchema = z.object({
  generatedAt: z.string(),
  totals: sourceTotalsSchema,
  sources: z.array(todaySourceSchema),
});

function isApiError(value: unknown): value is z.infer<typeof apiErrorSchema> {
  return apiErrorSchema.safeParse(value).success;
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
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
  const body: unknown = await res.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected response shape from ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function fetchToday(): Promise<TodayPayload> {
  return apiGet<TodayPayload>('/api/today', todayPayloadSchema);
}
