/**
 * F35, F46 — the credential-keyword check must not reject a legitimate
 * venture name, and a webUrl's trailing slash must be normalized away.
 * Selected by: npm test -- config
 */
import { describe, expect, it } from 'vitest';
import { parseSourcesFile } from './config';

function fileWith(overrides: Partial<{ slug: string; name: string; webUrl: string }>) {
  return {
    sources: [
      {
        slug: overrides.slug ?? 'lexington',
        name: overrides.name ?? 'Lexington',
        kind: 'venture',
        webUrl: overrides.webUrl ?? 'https://example.test',
      },
    ],
  };
}

describe('parseSourcesFile credential-shape check (F35, F46)', () => {
  it('accepts a venture name that merely contains a keyword like "token"', () => {
    const parsed = parseSourcesFile(fileWith({ name: 'Token Furniture' }));
    expect(parsed.sources[0].name).toBe('Token Furniture');
  });

  it('still rejects a slug that looks credential-shaped', () => {
    expect(() => parseSourcesFile(fileWith({ slug: 'has-secret-in-it' }))).toThrow(/credential-shaped/);
  });

  it('still rejects a webUrl that looks credential-shaped', () => {
    expect(() => parseSourcesFile(fileWith({ webUrl: 'https://user:secret@example.test' }))).toThrow(
      /credential-shaped/
    );
  });

  it('strips a trailing slash from webUrl', () => {
    const parsed = parseSourcesFile(fileWith({ webUrl: 'https://example.test/' }));
    expect(parsed.sources[0].webUrl).toBe('https://example.test');
  });
});
