/**
 * cyclePeriodKey — period_key formats from 0025_cycles.sql / 0026_cycle_periods.sql.
 * Selected by: npm test -- cyclePeriod
 */
import { describe, expect, it } from 'vitest';
import { cyclePeriodKey } from './cyclePeriod';

describe('cyclePeriodKey', () => {
  it('formats weekly as ISO yyyy-Www (2026-07-18 -> 2026-W29)', () => {
    expect(cyclePeriodKey('weekly', new Date(2026, 0, 1), new Date(2026, 6, 18))).toBe('2026-W29');
  });

  it('handles an ISO week that spans a year boundary (2025-12-29 -> 2026-W01)', () => {
    expect(cyclePeriodKey('weekly', new Date(2025, 0, 1), new Date(2025, 11, 29))).toBe('2026-W01');
  });

  it('formats monthly as yyyy-MM', () => {
    expect(cyclePeriodKey('monthly', new Date(2026, 0, 1), new Date(2026, 6, 18))).toBe('2026-07');
  });

  it('formats quarterly as yyyy-Qn', () => {
    expect(cyclePeriodKey('quarterly', new Date(2026, 0, 1), new Date(2026, 6, 18))).toBe('2026-Q3');
    expect(cyclePeriodKey('quarterly', new Date(2026, 0, 1), new Date(2026, 0, 5))).toBe('2026-Q1');
    expect(cyclePeriodKey('quarterly', new Date(2026, 0, 1), new Date(2026, 11, 31))).toBe('2026-Q4');
  });

  it('formats semiannual as yyyy-H1/H2 (Jan-Jun vs Jul-Dec)', () => {
    expect(cyclePeriodKey('semiannual', new Date(2026, 0, 1), new Date(2026, 5, 30))).toBe('2026-H1');
    expect(cyclePeriodKey('semiannual', new Date(2026, 0, 1), new Date(2026, 6, 1))).toBe('2026-H2');
  });

  it('formats yearly as yyyy', () => {
    expect(cyclePeriodKey('yearly', new Date(2026, 0, 1), new Date(2026, 6, 18))).toBe('2026');
  });

  it('formats custom weeks as anchor+Nw#index, rolling over on the interval boundary', () => {
    const anchor = new Date(2026, 6, 21); // 2026-07-21
    const custom = { every: 6, unit: 'weeks' as const };
    expect(cyclePeriodKey('custom', anchor, anchor, custom)).toBe('2026-07-21+6w#0');
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 6, 21 + 41), custom)).toBe('2026-07-21+6w#0');
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 6, 21 + 42), custom)).toBe('2026-07-21+6w#1');
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 6, 21 + 130), custom)).toBe('2026-07-21+6w#3');
  });

  it('formats custom months as anchor+Nm#index, using calendar months not fixed days', () => {
    const anchor = new Date(2026, 0, 31); // 2026-01-31
    const custom = { every: 2, unit: 'months' as const };
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 2, 1), custom)).toBe('2026-01-31+2m#0');
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 2, 31), custom)).toBe('2026-01-31+2m#1');
    expect(cyclePeriodKey('custom', anchor, new Date(2026, 4, 31), custom)).toBe('2026-01-31+2m#2');
  });

  it('throws when period is custom but no custom interval was supplied', () => {
    expect(() => cyclePeriodKey('custom', new Date(2026, 0, 1), new Date(2026, 0, 1))).toThrow();
  });
});
