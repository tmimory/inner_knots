/**
 * The only place the run engine reads `process.env`.
 *
 * As in the provider layer, the value is read per call rather than captured at
 * module load, so a route that boots before `.env` is loaded still sees it and a
 * test can vary it between cases.
 */

/** Decisions in flight at once when `RUN_CONCURRENCY` is unset or unusable. */
export const FALLBACK_RUN_CONCURRENCY = 3;
/** Above this a run is mostly a way to collect rate-limit errors. */
export const MAX_RUN_CONCURRENCY = 16;

/** How many decisions the engine keeps in flight at once. */
export function runConcurrency(): number {
  const raw = process.env.RUN_CONCURRENCY?.trim();
  if (raw === undefined || raw === "") return FALLBACK_RUN_CONCURRENCY;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return FALLBACK_RUN_CONCURRENCY;
  return Math.min(parsed, MAX_RUN_CONCURRENCY);
}
