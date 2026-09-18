/**
 * Unit coverage for the credential-shaped redaction regex.
 */
import { describe, expect, it } from 'vitest';
import { errorMessage, redactCredentials } from './redact';

describe('redactCredentials', () => {
  it('redacts a plain connection string', () => {
    expect(redactCredentials('failed: postgres://user:secret@host:5432/db')).toBe(
      'failed: [redacted]'
    );
  });

  it('redacts a connection string whose password contains a slash', () => {
    expect(redactCredentials('failed: postgres://user:sec/ret@host:5432/db')).toBe(
      'failed: [redacted]'
    );
  });
});

describe('errorMessage', () => {
  it('redacts a credential embedded in an Error message', () => {
    const err = new Error('connect ECONNREFUSED postgres://user:sec/ret@host/db');
    expect(errorMessage(err)).not.toMatch(/sec\/ret/);
    expect(errorMessage(err)).toBe('connect ECONNREFUSED [redacted]');
  });
});
