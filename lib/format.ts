/**
 * Display formatting: durations, clock times, day headings, percentages.
 *
 * Every screen that shows a timestamp or an elapsed time renders it the same way
 * because the rules live here rather than beside each caller. Nothing in this
 * file knows about the domain; it takes numbers and ISO strings.
 */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

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

/** Wall-clock time in the viewer's locale: `14:32:07`. */
export function formatTime(iso: string): string {
  const date = parseDate(iso);
  if (!date) return UNKNOWN;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
