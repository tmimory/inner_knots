/**
 * React hooks for starting a run and watching it fill in.
 *
 * The engine persists progress and a partial summary after every decision, so
 * polling `GET /api/runs/:id` once a second is enough to animate a run: the
 * summary that comes back mid-run has the same shape as the final one, with
 * fewer decisions in it. Polling stops by itself when the run reaches a terminal
 * status, so a finished screen costs nothing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isTerminalRunStatus, type Run, type RunConfig } from "../domain/run";
import { parseRunSummary, type RunSummary } from "../domain/summary";
import { fetchRun, startRun } from "./runs";

/** How often a running run is re-read, unless the caller says otherwise. */
export const DEFAULT_POLL_INTERVAL_MS = 1000;

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
  /** Reads the run once, out of band with the poll. */
  refresh: () => Promise<void>;
};

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * What one poll knows. The id is kept alongside the run so that switching to a
 * different run shows nothing rather than the previous run's last state, without
 * an effect that resets state and re-renders for it.
 */
type PollState = { id: string | null; run?: Run; error?: Error };

/** Watches one run until it settles. Pass `null` to watch nothing. */
export function useRun(runId: string | null, options: UseRunOptions = {}): UseRunResult {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [state, setState] = useState<PollState>({ id: runId });
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (runId === null) return;
    try {
      const run = await fetchRun(runId);
      if (live.current) setState({ id: runId, run });
    } catch (caught) {
      if (live.current) setState((previous) => ({ ...previous, id: runId, error: asError(caught) }));
    }
  }, [runId]);

  useEffect(() => {
    if (runId === null) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      try {
        const run = await fetchRun(runId);
        if (stopped) return;
        setState({ id: runId, run });
        // A settled run never changes again, so this is the last read.
        if (isTerminalRunStatus(run.status)) return;
      } catch (caught) {
        if (stopped) return;
        setState((previous) => ({ ...previous, id: runId, error: asError(caught) }));
      }
      timer = setTimeout(() => void poll(), intervalMs);
    };

    void poll();

    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [runId, intervalMs]);

  // Anything read before the first poll of a new id belongs to the previous one.
  const current: PollState = state.id === runId ? state : { id: runId };
  const summary = useMemo(() => parseRunSummary(current.run?.summary), [current.run?.summary]);

  return {
    run: current.run,
    summary,
    isRunning: current.run !== undefined && !isTerminalRunStatus(current.run.status),
    error: current.error,
    refresh,
  };
}

export type UseRunStarterResult = {
  /** Starts a run and remembers its id. Resolves to the run, or undefined on failure. */
  start: (config: RunConfig) => Promise<Run | undefined>;
  /** The id of the run most recently started here; `null` before the first. */
  runId: string | null;
  starting: boolean;
  error: Error | undefined;
};

/** Starts runs and hands the id to {@link useRun}. */
export function useRunStarter(): UseRunStarterResult {
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const start = useCallback(async (config: RunConfig): Promise<Run | undefined> => {
    setStarting(true);
    setError(undefined);
    try {
      const run = await startRun(config);
      setRunId(run.id);
      return run;
    } catch (caught) {
      setError(asError(caught));
      return undefined;
    } finally {
      setStarting(false);
    }
  }, []);

  return { start, runId, starting, error };
}
