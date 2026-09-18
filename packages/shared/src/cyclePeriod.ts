/**
 * `cyclePeriodKey` — computes `cycle_progress.period_key` (test/fixtures/
 * pathfinder/migrations/0025_cycles.sql, 0026_cycle_periods.sql).
 *
 * `period_key` is an opaque bucket id: stable and distinct per period, never
 * computed in SQL, so the timezone/anchor rule lives in exactly one place.
 * All dates here are already rep-local (`anchoredOn`/`now` are calendar dates
 * in the rep's timezone, not UTC instants) — callers resolve the timezone
 * before calling this function, it does no zone conversion itself.
 *
 * Calendar periods (weekly, monthly, quarterly, semiannual, yearly) key off
 * `now` alone, reset on the calendar boundary:
 *   - weekly:      ISO week,      `yyyy-Www` e.g. `2026-W29`
 *   - monthly:                    `yyyy-MM`  e.g. `2026-07`
 *   - quarterly:                  `yyyy-Qn`  e.g. `2026-Q3`
 *   - semiannual:  Jan-Jun/Jul-Dec `yyyy-H1`|`yyyy-H2` e.g. `2026-H2`
 *   - yearly:                     `yyyy`     e.g. `2026`
 *
 * `custom` is NOT calendar-aligned: every N weeks/months counting from
 * `anchoredOn` (the rep-local date the cycle was created). The key embeds the
 * anchor and interval plus the current period index, e.g. `2026-07-21+6w#3`,
 * so changing the interval or period yields fresh keys and coverage resets
 * naturally — old rows simply never match again (0026).
 */

export type CyclePeriod = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom';

export interface CyclePeriodCustom {
  /** `cycles.custom_every`, 1-99. */
  every: number;
  /** `cycles.custom_unit`. */
  unit: 'weeks' | 'months';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoWeekKey(d: Date): string {
  // ISO 8601 week: Thursday of the week's Mon-Sun decides the week-year.
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  t.setUTCDate(t.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);
  const weekNum = Math.round((t.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1;
  return `${isoYear}-W${pad2(weekNum)}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Whole days between two rep-local calendar dates (midnight-to-midnight), `to - from`. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** Whole calendar months between two rep-local dates, `to - from`, floored to a completed month. */
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

function customKey(anchoredOn: Date, now: Date, custom: CyclePeriodCustom): string {
  const { every, unit } = custom;
  const elapsed = unit === 'weeks' ? Math.floor(daysBetween(anchoredOn, now) / (every * 7)) : Math.floor(monthsBetween(anchoredOn, now) / every);
  const index = Math.max(0, elapsed);
  const unitLetter = unit === 'weeks' ? 'w' : 'm';
  return `${ymd(anchoredOn)}+${every}${unitLetter}#${index}`;
}

/**
 * Computes the `period_key` for a cycle at instant `now`.
 * `anchoredOn` is `cycles.anchored_on`: required by every calendar period's
 * signature for uniformity, but only `custom` cycles actually use it.
 * `custom` must be supplied when, and only when, `period === 'custom'`
 * (mirrors the `cycles_custom_consistency` CHECK in 0026).
 */
export function cyclePeriodKey(
  period: CyclePeriod,
  anchoredOn: Date,
  now: Date,
  custom?: CyclePeriodCustom
): string {
  switch (period) {
    case 'weekly':
      return isoWeekKey(now);
    case 'monthly':
      return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    case 'quarterly':
      return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
    case 'semiannual':
      return `${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`;
    case 'yearly':
      return `${now.getFullYear()}`;
    case 'custom':
      if (!custom) {
        throw new Error('cyclePeriodKey: custom is required when period is "custom"');
      }
      return customKey(anchoredOn, now, custom);
    default: {
      const exhaustive: never = period;
      throw new Error(`cyclePeriodKey: unknown period ${exhaustive as string}`);
    }
  }
}
