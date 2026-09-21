/**
 * One thing read from the API, held as screen state.
 *
 * Every list screen wants the same four things — the value, whether it is still
 * arriving, why it did not, and a way to ask again — and the same two guards: do
 * not set state after unmount, and do not let a slow answer overwrite a newer
 * one. Writing that per hook is how one copy quietly loses a guard, so it is
 * written once here.
 *
 * Deliberately plain `useState` / `useEffect`: there is no cross-screen cache to
 * keep honest, so a query library would be ceremony.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { describeApiError } from "./errors";

/** Why the loader is running: the first read, or an explicit re-read. */
export type LoadReason = "mount" | "refresh";

export type AsyncResource<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  /** Re-runs the loader with `reason: "refresh"`. */
  refresh: () => Promise<void>;
  /** Folds a known-good value in without a round trip, after a mutation. */
  set: (update: (current: T) => T) => void;
};

/**
 * Runs `load` on mount and whenever it changes identity, so callers keep it in a
 * `useCallback` whose dependencies are the query it describes.
 */
export function useAsyncResource<T>(
  load: (reason: LoadReason) => Promise<T>,
  initial: T,
): AsyncResource<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  /** Guards against an answer to a question the screen has already moved on from. */
  const request = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (reason: LoadReason) => {
      const token = ++request.current;
      setLoading(true);
      try {
        const next = await load(reason);
        if (!mounted.current || token !== request.current) return;
        setData(next);
        setError(null);
      } catch (cause) {
        if (!mounted.current || token !== request.current) return;
        setError(describeApiError(cause));
      } finally {
        if (mounted.current && token === request.current) setLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    void run("mount");
  }, [run]);

  const refresh = useCallback(() => run("refresh"), [run]);

  const set = useCallback((update: (current: T) => T) => {
    setData((current) => update(current));
  }, []);

  return { data, loading, error, refresh, set };
}
