/**
 * Unit coverage for the shared credential-redaction helper (F17, F26).
 * Selected by: npm test -- redact
 */
import { describe, expect, it } from 'vitest';
import { errorMessage, redactCredentials } from './redact';

describe('redactCredentials', () => {
  it('redacts a plain connection string', () => {
    expect(redactCredentials('failed: postgres://user:secret@host:5432/db')).toBe('failed: [redacted]');
  });

  it('redacts a connection string whose password contains a slash', () => {
    expect(redactCredentials('failed: postgres://user:sec/ret@host:5432/db')).toBe('failed: [redacted]');
  });

  it('leaves a message with no credential-shaped substring untouched', () => {
    expect(redactCredentials('connection timed out after 5000ms')).toBe('connection timed out after 5000ms');
  });
});

describe('errorMessage', () => {
  it('redacts a credential embedded in an Error message', () => {
    const err = new Error('connect ECONNREFUSED postgres://user:sec/ret@host/db');
    expect(errorMessage(err)).toBe('connect ECONNREFUSED [redacted]');
  });
});
