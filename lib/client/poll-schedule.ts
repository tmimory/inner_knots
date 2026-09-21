/**
 * When a poller reads again — the arithmetic of {@link usePolled}, on its own.
 *
 * It is separated from the hook so it can be tested without a renderer and
 * without pulling `react-native` into the test process, and so the one default
 * interval every screen polls at has a single home.
 */

/**
 * How often anything that is still changing is re-read.
 *
 * One second, because the trolley animation plays a run's decisions as they
 * arrive and any slower reads as a stutter. Screens with nothing to animate —
 * the logs list and a run's detail — pass a longer interval of their own.
 */
export const DEFAULT_POLL_MS = 1000;

/** How much longer to wait after a failed request, so a dead server is not hammered. */
export const POLL_ERROR_BACKOFF = 4;

/** What the last read produced, which is all the schedule depends on. */
export type PollOutcome =
  /** The value arrived and can still change. */
  | "active"
  /** The value arrived and will never change again. */
  | "settled"
  /** The read failed. */
  | "error";

/**
 * How long to wait before reading again, or `null` when the loop should stop.
 *
 * A settled value is the end of the loop: a finished run costs no further
 * requests. A failure keeps the loop alive — the server may come back — but at a
 * fraction of the rate. `pollMs` of `0` or less means "read once and stop", which
 * is how a caller disables polling.
 */
export function nextPollDelay(pollMs: number, outcome: PollOutcome): number | null {
  if (pollMs <= 0) return null;
  if (outcome === "settled") return null;
  return outcome === "error" ? pollMs * POLL_ERROR_BACKOFF : pollMs;
}
