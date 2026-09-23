/**
 * Display formatting: durations, clock times, day headings, percentages, counts.
 *
 * Every screen that shows a timestamp or an elapsed time renders it the same way
 * because the rules live here rather than beside each caller. Nothing in this
 * file knows about the domain; it takes numbers and ISO strings.
 */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** What every formatter shows for a value it cannot read. */
export const UNKNOWN = "—";

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** The date behind an ISO string, or `undefined` when it does not parse. */
function parseDate(iso: string): Date | undefined {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * A duration in the largest unit that still reads precisely: `840ms`, `3.4s`,
 * `2m 05s`, `1h 12m`.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return UNKNOWN;
  if (ms < SECOND_MS) return `${Math.round(ms)}ms`;
  if (ms < MINUTE_MS) return `${(ms / SECOND_MS).toFixed(1)}s`;

  if (ms < HOUR_MS) {
    const minutes = Math.floor(ms / MINUTE_MS);
    const seconds = Math.round((ms % MINUTE_MS) / SECOND_MS);
    return seconds === 60 ? `${minutes + 1}m 00s` : `${minutes}m ${pad(seconds)}s`;
  }

  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS);
  return minutes === 60 ? `${hours + 1}h 00m` : `${hours}h ${pad(minutes)}m`;
}

/** Milliseconds between two instants; `end` defaults to now, for something still running. */
export function durationBetween(startIso: string, endIso?: string): number | undefined {
  const start = parseDate(startIso);
  if (!start) return undefined;
  const end = endIso === undefined ? new Date() : parseDate(endIso);
  if (!end) return undefined;
  return Math.max(0, end.getTime() - start.getTime());
}

/** `durationBetween`, already formatted. */
export function formatElapsed(startIso: string, endIso?: string): string {
  const ms = durationBetween(startIso, endIso);
  return ms === undefined ? UNKNOWN : formatDuration(ms);
}

export type ClockOptions = {
  /** Include the seconds. Off by default: a list row is not a stopwatch. */
  seconds?: boolean;
  /**
   * Whether to use a 12-hour clock. Left to the viewer's locale by default; a
   * column of times is set on a 24-hour clock so every row is the same width.
   */
  hour12?: boolean;
};

/**
 * Wall-clock time in the viewer's locale: `14:32`, or `14:32:07` with seconds.
 *
 * A day's runs are already under the day's own heading, so the date is said once
 * at the top and each row only has to say when within that day. "3h ago" on every
 * line of a list made ten rows read as ten identical answers to a question nobody
 * asked twice.
 */
export function formatClock(iso: string, options: ClockOptions = {}): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: options.seconds === true ? "2-digit" : undefined,
    hour12: options.hour12,
  });
}

/** Wall-clock time to the second: `14:32:07`. */
export function formatTime(iso: string): string {
  return formatClock(iso, { seconds: true });
}

/**
 * A timestamp as it reads in a list: `Sep 21, 5:16 PM`.
 *
 * Month and day, hour and minute, nothing else. A run's seconds are a duration,
 * and the duration is already on the row; a wall clock counting to the second
 * next to it is precision no one reads.
 */
export function formatStamp(iso: string): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

/**
 * How long ago, as a list reads it: `just now`, `5m ago`, `2h ago`, `yesterday`,
 * `3d ago`, and beyond a week the exact {@link formatStamp}.
 *
 * A row in a list is answering "is this the run I just made?", and `2h ago` answers
 * it without the reader doing arithmetic against a wall clock. The exact instant is
 * still worth having, so it belongs in the row's tooltip or on the detail page —
 * relative time is the headline, not a replacement.
 *
 * `now` is a parameter so the caller can pin it (a list that formats fifty rows
 * should ask the clock once) and so the tests do not depend on when they run.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;

  const elapsed = now - date.getTime();
  // A clock a little ahead of the server is the common case for "in the future";
  // anything genuinely scheduled ahead is not something this app shows.
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;

  // Past a day, count calendar days rather than 24-hour blocks: 31 hours is
  // "yesterday" to a reader who has slept once since, not "1d ago".
  const days = calendarDaysBetween(date, new Date(now));
  if (days <= 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatStamp(iso);
}

/** Whole calendar days from `from` to `to`, ignoring the time of day. */
function calendarDaysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((end - start) / DAY_MS);
}

/** Date and time together, for a detail header. */
export function formatDateTime(iso: string): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;
  return `${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} ${formatTime(iso)}`;
}

/** Local calendar day as `YYYY-MM-DD`, the key runs are grouped by. */
export function dayKey(iso: string): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day heading: `Today`, `Yesterday`, or `Sunday, 21 September 2026`. */
export function formatDay(iso: string): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * HOUR_MS);
  const key = dayKey(iso);
  if (key === dayKey(today.toISOString())) return "Today";
  if (key === dayKey(yesterday.toISOString())) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** A fraction as a percentage: `0.425` -> `43%`. */
export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return UNKNOWN;
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/** Shortens to `max` characters, ellipsis included. */
export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * `3 nodes`, `1 node`. The plural defaults to the singular plus `s`, which covers
 * every noun this app counts; pass one when it does not (`ending` / `endings` is
 * regular, `person` / `people` would not be).
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * `pluralize`, but silent at zero: the aside that reads "2 errors" beside a bar
 * should not read "0 errors" when nothing went wrong.
 */
export function countNote(count: number, singular: string, plural?: string): string | undefined {
  return count === 0 ? undefined : pluralize(count, singular, plural);
}

/**
 * Money the way a voice would say it: `$2`, `$2.50`, `$1,024`.
 *
 * Fixed to en-US because the sums are dollars in the prompt's own words — the
 * model is told "$2", and the screens and the ledger have to say the same thing
 * the model was told, whatever locale the reader is in. Cents are shown when
 * there are any and dropped when there are none, so a whole-dollar pot does not
 * read as an invoice.
 */
const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return UNKNOWN;
  const text = MONEY.format(amount);
  return text.endsWith(".00") ? text.slice(0, -3) : text;
}
