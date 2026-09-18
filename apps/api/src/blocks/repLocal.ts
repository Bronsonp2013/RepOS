/**
 * Rep-local calendar helpers shared by the Today blocks.
 *
 * Every block receives `BlockContext.now` (a UTC instant) and
 * `BlockContext.timezone` (the rep's IANA zone from `users.timezone`) and
 * must derive "today" and period boundaries from those, never from the
 * process's own wall clock or system timezone (CLAUDE.md, docs/REPOS_V1.md
 * §4). `Intl.DateTimeFormat` resolves the wall-clock date/time in the given
 * zone; the local `Date` constructor/getters are then used as a matched pair
 * so the result is independent of the host's own TZ setting — round-tripping
 * y/m/d/h/m/s through `new Date(y, m, d, ...)` and back out through
 * `.getFullYear()`/etc. always returns what was put in, whatever offset the
 * host happens to be running at.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

interface RepLocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** The wall-clock date/time `instant` reads as in `timeZone`. */
export function repLocalParts(instant: Date, timeZone: string): RepLocalParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24, // hourCycle h23 can print "24" for midnight
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * A `Date` whose LOCAL getters (`getFullYear`, `getMonth`, `getDate`, ...)
 * reproduce `instant`'s wall-clock reading in `timeZone`. Feed this to
 * `cyclePeriodKey` (packages/shared), which reads calendar fields with those
 * same local getters.
 */
export function repLocalDate(instant: Date, timeZone: string): Date {
  const p = repLocalParts(instant, timeZone);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** `instant`'s rep-local calendar date as `YYYY-MM-DD`, for comparing against a SQL `date` column. */
export function repLocalDateString(instant: Date, timeZone: string): string {
  const p = repLocalParts(instant, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * Formats a `Date` whose LOCAL getters already hold the calendar date to show
 * (e.g. a pg `date` column, which node-postgres parses via the local `Date`
 * constructor — see `postgres-date`'s "force YYYY-MM-DD to be parsed as local
 * time" — or a date built by `repLocalDate`/plain arithmetic on one). No
 * timezone conversion happens here; it only reads back what is already there.
 */
export function localDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** The Monday..Sunday calendar week (inclusive) containing `d`'s local date. */
export function localIsoWeekRange(d: Date): { monday: Date; sunday: Date } {
  const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { monday, sunday };
}
