/**
 * React hooks for starting a run and watching it fill in.
 *
 * The engine persists progress and a partial summary after every decision, so
 * polling `GET /api/runs/:id` once a second is enough to animate a run: the
 * summary that comes back mid-run has the same shape as the final one, with
 * fewer decisions in it. The polling itself is {@link usePolled}, which every
 * screen that watches a run shares; this hook only says what to read and when it
 * has settled.
 */
import { useCallback, useMemo, useState } from "react";

import type { Run, RunConfig } from "../domain/run";
import { parseRunSummary, type RunSummary } from "../domain/summary";
import { describeApiError } from "./errors";
import { fetchRun, startRun } from "./runs";
import { DEFAULT_POLL_MS, usePolled } from "./use-polled";
import { isRunActive } from "./use-runs";

export { DEFAULT_POLL_MS } from "./use-polled";

export type UseRunOptions = {
  intervalMs?: number;
};

export type UseRunResult = {
  run: Run | undefined;
  /** The summary, narrowed by its `kind`; undefined until the first decision. */
  summary: RunSummary | undefined;
  /** True while the run exists and has not settled. */
  isRunning: boolean;
  error: Error | undefined;
  /** Asks for an immediate read, out of band with the poll. */
  refresh: () => Promise<void>;
};

/**
 * What one poll knows. The id is kept alongside the run so that switching to a
 * different run shows nothing rather than the previous run's last state, without
 * an effect that resets state and re-renders for it.
 */
type RunSnapshot = { id: string | null; run?: Run };

const NO_RUN: RunSnapshot = { id: null };

/** Watches one run until it settles. Pass `null` to watch nothing. */
export function useRun(runId: string | null, options: UseRunOptions = {}): UseRunResult {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_MS;

  const load = useCallback(async (): Promise<RunSnapshot> => {
    if (runId === null) return NO_RUN;
    return { id: runId, run: await fetchRun(runId) };
  }, [runId]);

  const polled = usePolled(
    `run:${runId ?? ""}`,
    // Watching nothing is a poll of nothing: one read that resolves empty.
    runId === null ? 0 : intervalMs,
    NO_RUN,
    load,
    (snapshot) => snapshot.run !== undefined && isRunActive(snapshot.run),
  );

  // Anything read before the first poll of a new id belongs to the previous one.
  const run = polled.data.id === runId ? polled.data.run : undefined;
  const summary = useMemo(() => parseRunSummary(run?.summary), [run?.summary]);
  const error = useMemo(
    () => (polled.error === undefined ? undefined : new Error(polled.error)),
    [polled.error],
  );

  const { refresh } = polled;
  const askForRead = useCallback((): Promise<void> => {
    refresh();
    return Promise.resolve();
  }, [refresh]);

  return {
    run,
    summary,
    isRunning: run !== undefined && isRunActive(run),
    error,
    refresh: askForRead,
  };
}

export type UseRunStarterResult = {
  /** Starts a run and remembers its id. Resolves to the run, or undefined on failure. */
  start: (config: RunConfig) => Promise<Run | undefined>;
  /** The id of the run most recently started here; `null` before the first. */
  runId: string | null;
  starting: boolean;
  /**
   * Why the last start failed, as a sentence ready to render.
   *
   * Already through {@link describeApiError}: every screen with a run button put
   * the same line under it, and the two that rendered `error.message` instead
   * showed "API request failed with 400" where the route had said what was wrong.
   */
  error: string | undefined;
};

/** Starts runs and hands the id to {@link useRun}. */
export function useRunStarter(): UseRunStarterResult {
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const start = useCallback(async (config: RunConfig): Promise<Run | undefined> => {
    setStarting(true);
    setError(undefined);
    try {
      const run = await startRun(config);
      setRunId(run.id);
      return run;
    } catch (caught) {
      setError(describeApiError(caught));
      return undefined;
    } finally {
      setStarting(false);
    }
  }, []);

  return { start, runId, starting, error };
}
