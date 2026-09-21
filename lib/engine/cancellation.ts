/**
 * Noticing a cancellation that was asked for somewhere else.
 *
 * A run executes inside the promise left behind by the request that started it,
 * while `POST /api/runs/:id/cancel` arrives as a *different* request. In the Expo
 * dev server those two requests do not share module state — a route's module
 * graph is re-evaluated per request — so an in-process `AbortController` is a
 * fast path, not a mechanism. The mechanism is the store: the cancel route
 * appends a `cancelled` event, and the engine looks for it between decisions.
 *
 * The check reads `data/runs/index.jsonl` directly rather than through the run
 * store's cached index, because that cache only sees what its own module wrote.
 * It is throttled, so a run of fast decisions does not re-read the file for each.
 */
import { readLines } from "@/lib/storage/jsonl";
import { runsIndexFile } from "@/lib/storage/paths";

/** How often the index is re-read while a run is executing. */
export const CANCELLATION_POLL_MS = 250;

type IndexLine = { type?: unknown; runId?: unknown };

/** Whether a `cancelled` event for this run has been written by anyone. */
export async function cancellationRequested(runId: string): Promise<boolean> {
  const lines = await readLines<IndexLine>(runsIndexFile());
  return lines.some((line) => line?.type === "cancelled" && line.runId === runId);
}

/**
 * A throttled {@link cancellationRequested}. The first call always reads; later
 * calls within `everyMs` answer `false` without touching the disk.
 */
export function watchForCancellation(
  runId: string,
  everyMs: number = CANCELLATION_POLL_MS,
): () => Promise<boolean> {
  let checkedAt = 0;
  return async () => {
    const now = Date.now();
    if (checkedAt !== 0 && now - checkedAt < everyMs) return false;
    checkedAt = now;
    return cancellationRequested(runId);
  };
}
