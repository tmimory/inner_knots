/**
 * The runs in flight in this process.
 *
 * A run is started by one API route and cancelled by another, so the handle that
 * connects them cannot live in either route module. It lives here: one
 * `AbortController` per running run, dropped as soon as the run settles.
 *
 * Nothing here survives a restart, which is the honest state of affairs — a run
 * executes inside the dev server process. A cancel for a run this process is not
 * running is handled by the route, which marks it cancelled in the store.
 */
import type { Run } from "@/lib/domain/run";

import { executeRun } from "./engine";

const inFlight = new Map<string, AbortController>();

/**
 * Starts a run in the background and returns at once; the caller answers the
 * HTTP request while the engine works. Failures are already recorded on the run
 * by the engine, so the promise is deliberately not awaited anywhere.
 */
export function startBackgroundRun(run: Run): void {
  const controller = new AbortController();
  inFlight.set(run.id, controller);

  void executeRun(run, { signal: controller.signal })
    .catch((error: unknown) => {
      console.error(`[engine] run ${run.id} ended unexpectedly`, error);
    })
    .finally(() => {
      inFlight.delete(run.id);
    });
}

/** Whether this process is currently executing a run. */
export function isRunning(runId: string): boolean {
  return inFlight.has(runId);
}

/**
 * Asks a running run to stop. The engine notices between decisions and marks the
 * run cancelled with whatever summary it has. Returns false when this process is
 * not running that run.
 */
export function requestCancel(runId: string): boolean {
  const controller = inFlight.get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}
