/**
 * C7 — one unreachable source degrades only its own section.
 * Owned by the `routes` lane. Points the venture source at
 * REPOS_TEST_CLOSED_DATABASE_URL (a port nothing listens on) and asserts the
 * request still succeeds with lexington data intact.
 * Selected by: npm test -- degrade
 */
import { describe, it } from 'vitest';

describe('degradation (C7)', () => {
  it('returns HTTP 200 with lexington data when the venture source is unreachable', () => {
    throw new Error('not implemented: assert 200 and a populated lexington entry');
  });

  it('carries an error state on the unreachable venture entry only', () => {
    throw new Error('not implemented: assert sources[venture].error is set and lexington has none');
  });
});
