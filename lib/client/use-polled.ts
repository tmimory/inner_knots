/**
 * Reading something that is being written while it is read.
 *
 * A run is appended to by the engine after every decision, so the screens
 * watching one poll rather than fetch once — and stop by themselves the moment
 * nothing on screen can still change. Every poller in the app is this hook:
 * `useRun`, `useRuns` and `useRunDetail` differ only in what they load and in
 * what "still changing" means for it.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { describeApiError } from "./errors";
import { nextPollDelay } from "./poll-schedule";

export { DEFAULT_POLL_MS } from "./poll-schedule";

export type PollOptions = {
  /** Polling interval in milliseconds. `0` reads once and does not poll. */
  pollMs?: number;
};

export type PolledState<T> = {
  data: T;
  loading: boolean;
  error?: string;
  /** Re-reads immediately, whatever the poll schedule says. */
  refresh: () => void;
};

/**
 * Loads `load()`, then reloads it every `pollMs` for as long as `active()` says
 * the value can still change. `key` identifies the request: changing it starts a
 * fresh load and cancels the one in flight.
 *
 * The last value is kept while a reload is in flight and while an error is
 * showing, so a screen never blanks because one request out of many failed.
 */
export function usePolled<T>(
  key: string,
  pollMs: number,
  initial: T,
  load: () => Promise<T>,
  active: (value: T) => boolean,
): PolledState<T> {
  const [state, setState] = useState<{ data: T; loading: boolean; error?: string }>({
    data: initial,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  // The callbacks are read through refs so a caller may pass inline functions
  // without restarting the poll loop on every render.
  const loadRef = useRef(load);
  const activeRef = useRef(active);
  useEffect(() => {
    loadRef.current = load;
    activeRef.current = active;
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ms: number | null): void => {
      if (ms === null || cancelled) return;
      timer = setTimeout(() => void tick(), ms);
    };

    const tick = async (): Promise<void> => {
      try {
        const data = await loadRef.current();
        if (cancelled) return;
        setState({ data, loading: false });
        schedule(nextPollDelay(pollMs, activeRef.current(data) ? "active" : "settled"));
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({ ...current, loading: false, error: describeApiError(error) }));
        schedule(nextPollDelay(pollMs, "error"));
      }
    };

    setState((current) => ({ ...current, loading: true }));
    void tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [key, pollMs, nonce]);

  return { ...state, refresh };
}
