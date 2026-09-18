/**
 * Component-level coverage for TodayPage: renders against mocked query-cache
 * data (no network), asserting both venture sections, the Graham Interiors
 * needs-visit row with its precomputed href, and an error-state source.
 *
 * Named `.test.ts` (not `.test.tsx`) to match vitest.config.ts's include glob,
 * so JSX is avoided in favor of React.createElement.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TodayPayload, TodaySource } from '@repos/shared';
import TodayPage from './TodayPage';
import { queryKeys } from '../lib/api';

const lexingtonWebUrl = 'http://pathfinder.local:3000';

const okSource: TodaySource = {
  slug: 'lexington',
  name: 'Lexington Home Brands',
  kind: 'territory',
  webUrl: lexingtonWebUrl,
  timezone: 'America/Chicago',
  needsVisit: [
    {
      accountId: 48,
      name: 'Graham Interiors',
      accountType: 'designer',
      city: 'Dallas',
      state: 'TX',
      lastVisitAt: null,
      daysSinceVisit: null,
      href: `${lexingtonWebUrl}/accounts/48`,
    },
  ],
  upcomingTrips: [
    {
      tripId: 1,
      name: 'DFW loop',
      startDate: '2026-09-20',
      endDate: '2026-09-21',
      status: 'planned',
      stopCount: 1,
      stops: [
        {
          stopId: 10,
          accountId: 48,
          accountName: 'Graham Interiors',
          stopDate: '2026-09-20',
          sequence: 1,
          startsAt: '2026-09-20T19:00:00.000Z',
          startsAtLocal: '2026-09-20 2:00 PM',
          meetingType: { id: 1, key: 'presentation', name: 'Presentation' },
        },
      ],
      href: `${lexingtonWebUrl}/trips/1`,
    },
  ],
  pipeline: [
    { stageId: 1, key: 'new', label: 'New', sortOrder: 1, prospectCount: 3, href: `${lexingtonWebUrl}/prospects?stage=new` },
  ],
  coverage: [
    {
      cycleId: 1,
      name: 'Q3 cycle',
      period: 'quarterly',
      periodKey: '2026-Q3',
      coveredLocations: 4,
      eligibleLocations: 10,
      ratio: 0.4,
      href: `${lexingtonWebUrl}/cycles/1`,
    },
  ],
  totals: { activeAccounts: 10, prospectsInPipeline: 3, tripsThisWeek: 1, staleAccounts: 2 },
};

const erroredSource: TodaySource = {
  slug: 'pathfinder',
  name: 'Pathfinder',
  kind: 'venture',
  webUrl: 'http://pathfinder-venture.local:3010',
  timezone: 'America/Chicago',
  needsVisit: [],
  upcomingTrips: [],
  pipeline: [],
  coverage: [],
  totals: { activeAccounts: 0, prospectsInPipeline: 0, tripsThisWeek: 0, staleAccounts: 0 },
  error: 'connection refused',
};

function renderWithPayload(payload: TodayPayload): string {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(queryKeys.today, payload);
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(TodayPage))
  );
}

function renderWithQueryError(message: string): string {
  // retryOnMount: false keeps the seeded error state settled through the
  // render — otherwise mounting would synchronously kick off a refetch
  // (since data is undefined) and flip status back to pending before we
  // can observe the bug this test guards against.
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
  });
  const query = client.getQueryCache().build(client, { queryKey: queryKeys.today });
  query.setState({
    status: 'error',
    error: new Error(message),
    data: undefined,
    fetchStatus: 'idle',
  });
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(TodayPage))
  );
}

describe('TodayPage', () => {
  it('renders both venture sections, the Graham Interiors row and its account 48 link', () => {
    const payload: TodayPayload = {
      generatedAt: '2026-09-18T12:00:00.000Z',
      totals: okSource.totals,
      sources: [okSource, erroredSource],
    };

    const html = renderWithPayload(payload);

    expect(html).toContain('data-testid="source-lexington"');
    expect(html).toContain('data-testid="source-pathfinder"');
    expect(html).toContain('Graham Interiors');
    expect(html).toContain(`href="${lexingtonWebUrl}/accounts/48"`);
    expect(html).toContain('Open in Pathfinder');
  });

  it('renders an error state for a source carrying error, without its blocks', () => {
    const payload: TodayPayload = {
      generatedAt: '2026-09-18T12:00:00.000Z',
      totals: okSource.totals,
      sources: [erroredSource],
    };

    const html = renderWithPayload(payload);

    expect(html).toContain('data-testid="source-pathfinder-error"');
    expect(html).toContain('connection refused');
    expect(html).not.toContain('data-testid="block-needs-visit"');
  });

  it('renders the totals header from cross-venture totals', () => {
    const payload: TodayPayload = {
      generatedAt: '2026-09-18T12:00:00.000Z',
      totals: { activeAccounts: 10, prospectsInPipeline: 3, tripsThisWeek: 1, staleAccounts: 2 },
      sources: [okSource],
    };

    const html = renderWithPayload(payload);

    expect(html).toContain('data-testid="totals-header"');
    expect(html).toContain('data-testid="totals-activeAccounts"');
  });

  it('renders the top-level error state when the query itself fails, instead of Loading', () => {
    const html = renderWithQueryError('network unreachable');

    expect(html).toContain('data-testid="today-error"');
    expect(html).toContain('network unreachable');
    expect(html).not.toContain('data-testid="today-loading"');
  });
});
