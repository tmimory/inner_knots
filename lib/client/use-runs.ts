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
import { useCallback, useMemo } from "react";

import type { Character } from "@/lib/domain/character";
import { isTerminalRunStatus, type Run } from "@/lib/domain/run";
import type { LogEvent, Span } from "@/lib/domain/span";
import { buildCatalogue } from "@/lib/puzzles/trolley/catalogue";
import { indexById } from "@/lib/utils";

import { adventuresApi } from "./adventures";
import { charactersApi } from "./characters";
import { objectsApi } from "./objects";
import { fetchLogs, fetchRun, fetchRuns, fetchSpans, type RunFilter } from "./runs";
import { useAsyncResource } from "./use-async-resource";
import { DEFAULT_POLL_MS, usePolled, type PollOptions } from "./use-polled";

export { DEFAULT_POLL_MS, type PollOptions } from "./use-polled";

/**
 * How often the logs screens re-read.
 *
 * Slower than {@link DEFAULT_POLL_MS}: a ledger is read, not watched, and a run
 * detail costs three requests a tick rather than one.
 */
export const LOGS_POLL_MS = 2000;

/** True while a run may still change, which is what keeps a poller alive. */
export function isRunActive(run: Run): boolean {
  return !isTerminalRunStatus(run.status);
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
  return indexById(list);
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
