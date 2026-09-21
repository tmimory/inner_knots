/**
 * React hooks over the run index, spans and logs.
 *
 * A run is written while it is being read: the engine appends progress, spans
 * and a partial summary after every decision. These hooks therefore poll rather
 * than fetch once, and they stop polling by themselves the moment nothing on
 * screen can still change — a finished run costs no requests.
 *
 * The auxiliary indexes (characters, trolley objects, an adventure's name) live
 * here too, because the logs screens are what need them: a stored run holds ids,
 * and a reader needs faces and labels.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Character } from "@/lib/domain/character";
import { isTerminalRunStatus, type Run } from "@/lib/domain/run";
import type { LogEvent, Span } from "@/lib/domain/span";
import { buildCatalogue } from "@/lib/puzzles/trolley/catalogue";

import { adventuresApi } from "./adventures";
import { charactersApi } from "./characters";
import { describeApiError } from "./errors";
import { objectsApi } from "./objects";
import { fetchLogs, fetchRun, fetchRuns, fetchSpans, type RunFilter } from "./runs";
import { useAsyncResource } from "./use-async-resource";

/** How often a live run is re-read. */
export const DEFAULT_POLL_MS = 2000;

/** How much longer to wait after a failed request, so a dead server is not hammered. */
const ERROR_BACKOFF = 4;

export type PollOptions = {
  /** Polling interval in milliseconds. `0` disables polling. */
  pollMs?: number;
};

/** True while a run may still change, which is what keeps a poller alive. */
export function isRunActive(run: Run): boolean {
  return !isTerminalRunStatus(run.status);
}

type PolledState<T> = {
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
 */
function usePolled<T>(
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

    const schedule = (ms: number): void => {
      if (pollMs <= 0 || cancelled) return;
      timer = setTimeout(() => void tick(), ms);
    };

    const tick = async (): Promise<void> => {
      try {
        const data = await loadRef.current();
        if (cancelled) return;
        setState({ data, loading: false });
        if (activeRef.current(data)) schedule(pollMs);
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({ ...current, loading: false, error: describeApiError(error) }));
        schedule(pollMs * ERROR_BACKOFF);
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

// --- runs --------------------------------------------------------------------------

const NO_RUNS: Run[] = [];

export type RunsState = {
  runs: Run[];
  loading: boolean;
  error?: string;
  refresh: () => void;
};

/** The run index for a filter, polled while any matching run is still going. */
export function useRuns(filter: RunFilter = {}, options: PollOptions = {}): RunsState {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const key = JSON.stringify(filter);
  const parsed = useMemo(() => JSON.parse(key) as RunFilter, [key]);
  const { data, loading, error, refresh } = usePolled(
    `runs:${key}`,
    pollMs,
    NO_RUNS,
    () => fetchRuns(parsed),
    (runs) => runs.some(isRunActive),
  );
  return { runs: data, loading, error, refresh };
}

export type RunDetail = {
  run?: Run;
  spans: Span[];
  logs: LogEvent[];
};

export type RunDetailState = RunDetail & {
  loading: boolean;
  error?: string;
  refresh: () => void;
};

const EMPTY_DETAIL: RunDetail = { spans: [], logs: [] };

/** One run with its spans and log lines, polled while the run is still going. */
export function useRunDetail(id: string, options: PollOptions = {}): RunDetailState {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const load = useCallback(async (): Promise<RunDetail> => {
    const [run, spans, logs] = await Promise.all([fetchRun(id), fetchSpans(id), fetchLogs(id)]);
    return { run, spans, logs };
  }, [id]);

  const { data, loading, error, refresh } = usePolled(
    `run:${id}`,
    pollMs,
    EMPTY_DETAIL,
    load,
    (detail) => detail.run !== undefined && isRunActive(detail.run),
  );
  return { ...data, loading, error, refresh };
}

// --- auxiliary indexes -------------------------------------------------------------

const NO_CHARACTERS: ReadonlyMap<string, Character> = new Map<string, Character>();

async function loadCharacterIndex(): Promise<ReadonlyMap<string, Character>> {
  const list = await charactersApi.list();
  return new Map(list.map((character) => [character.id, character]));
}

/** Every character by id, for the avatars and names a stored run only has ids for. */
export function useCharacterIndex(): ReadonlyMap<string, Character> {
  const load = useCallback(() => loadCharacterIndex(), []);
  return useAsyncResource(load, NO_CHARACTERS).data;
}

/** What a run detail needs to know about one thing on a track. */
export type ObjectEntry = { id: string; label: string; icon: string };

const NO_OBJECTS: ReadonlyMap<string, ObjectEntry> = new Map<string, ObjectEntry>();

async function loadObjectIndex(): Promise<ReadonlyMap<string, ObjectEntry>> {
  const index = new Map<string, ObjectEntry>();
  for (const item of buildCatalogue()) {
    index.set(item.id, { id: item.id, label: item.label, icon: item.icon });
  }
  try {
    for (const item of await objectsApi.list()) {
      index.set(item.id, { id: item.id, label: item.label, icon: item.icon });
    }
  } catch {
    // The built-in catalogue alone still reads a run; custom objects are a bonus.
  }
  return index;
}

/** The built-in catalogue merged with the stored custom objects, keyed by id. */
export function useObjectIndex(): ReadonlyMap<string, ObjectEntry> {
  const load = useCallback(() => loadObjectIndex(), []);
  return useAsyncResource(load, NO_OBJECTS).data;
}

/** An adventure's name, or `undefined` when it has since been deleted. */
export function useAdventureName(adventureId?: string): string | undefined {
  const load = useCallback(async (): Promise<string | undefined> => {
    if (adventureId === undefined || adventureId === "") return undefined;
    try {
      return (await adventuresApi.get(adventureId)).name;
    } catch {
      // A run outlives the adventure it walked; the id is then all there is.
      return undefined;
    }
  }, [adventureId]);

  return useAsyncResource<string | undefined>(load, undefined).data;
}
