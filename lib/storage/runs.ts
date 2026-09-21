/**
 * The run store. Server only.
 *
 * `data/runs/index.jsonl` holds one {@link RunEvent} per status change rather
 * than whole runs, so a progress tick costs one short line. Replaying the file
 * rebuilds every run; the result is cached in memory and kept up to date as
 * events are written, so polling the logs screen does not re-read the file.
 *
 * Spans and logs live under `data/runs/<runId>/`. A span may be written more
 * than once: later lines are patches, merged by `spanId` on read, which keeps
 * writes append-only while a span is still running.
 */
import {
  runEventSchema,
  runSchema,
  type PuzzleId,
  type Run,
  type RunConfig,
  type RunEvent,
  type RunProgress,
  type RunStatus,
} from "@/lib/domain/run";
import { logEventSchema, spanSchema, type LogEvent, type LogLevel, type Span } from "@/lib/domain/span";
import { newId } from "@/lib/domain/id";

import { appendLine, readLines } from "./jsonl";
import { runLogsFile, runSpansFile, runsIndexFile } from "./paths";

// --- index cache -------------------------------------------------------------------

type IndexCache = { file: string; runs: Map<string, Run> };
let cache: IndexCache | null = null;

/** Folds one event into the replayed state. Shared by the reader and the writers. */
function applyEvent(runs: Map<string, Run>, event: RunEvent): void {
  if (event.type === "created") {
    runs.set(event.run.id, event.run);
    return;
  }
  const run = runs.get(event.runId);
  if (!run) return;
  switch (event.type) {
    case "progress":
      runs.set(run.id, { ...run, progress: event.progress, status: event.status });
      break;
    case "summary":
      runs.set(run.id, { ...run, summary: event.summary });
      break;
    case "finished":
      runs.set(run.id, {
        ...run,
        status: "finished",
        summary: event.summary,
        finishedAt: event.finishedAt,
        progress: { ...run.progress, done: run.progress.total },
      });
      break;
    case "failed":
      runs.set(run.id, { ...run, status: "failed", error: event.error, finishedAt: event.finishedAt });
      break;
    case "cancelled":
      runs.set(run.id, { ...run, status: "cancelled", finishedAt: event.finishedAt });
      break;
  }
}

async function loadIndex(): Promise<Map<string, Run>> {
  const file = runsIndexFile();
  if (cache && cache.file === file) return cache.runs;

  const runs = new Map<string, Run>();
  for (const raw of await readLines<unknown>(file)) {
    const parsed = runEventSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[runs] ignoring an unreadable run event");
      continue;
    }
    applyEvent(runs, parsed.data);
  }
  cache = { file, runs };
  return runs;
}

/** Appends an event and keeps the in-memory index in step with it. */
async function writeEvent(event: RunEvent): Promise<void> {
  const file = runsIndexFile();
  const runs = await loadIndex();
  await appendLine(file, event);
  if (cache && cache.file === file) applyEvent(runs, event);
  else cache = null;
}

/** Drops the cached index. Tests call this after pointing `DATA_DIR` elsewhere. */
export function resetRunCache(): void {
  cache = null;
}

// --- runs --------------------------------------------------------------------------

export type CreateRunInput = {
  config: RunConfig;
  /** How many decisions the run expects to make, for the progress bar. */
  total: number;
  /** Supply an id to make the call idempotent; one is generated otherwise. */
  id?: string;
};

/** Writes the `created` event and returns the run in its `queued` state. */
export async function createRun(input: CreateRunInput): Promise<Run> {
  const now = new Date().toISOString();
  const run = runSchema.parse({
    id: input.id ?? newId("run"),
    puzzle: input.config.puzzle,
    config: input.config,
    status: "queued",
    progress: { done: 0, total: input.total },
    startedAt: now,
    createdAt: now,
  });
  await writeEvent({ type: "created", run });
  return run;
}

/** Records progress, and moves a queued run to `running` unless told otherwise. */
export async function updateRunProgress(
  runId: string,
  progress: RunProgress,
  status: RunStatus = "running",
): Promise<void> {
  await writeEvent({ type: "progress", runId, progress, status });
}

/**
 * Rewrites the run's summary without changing its status. The engine calls this
 * after every decision so a poller sees a run fill in rather than jump from
 * empty to complete when it finishes.
 */
export async function updateRunSummary(runId: string, summary: unknown): Promise<void> {
  await writeEvent({ type: "summary", runId, summary });
}

export async function finishRun(runId: string, summary?: unknown): Promise<void> {
  await writeEvent({ type: "finished", runId, summary, finishedAt: new Date().toISOString() });
}

export async function failRun(runId: string, error: string): Promise<void> {
  await writeEvent({ type: "failed", runId, error, finishedAt: new Date().toISOString() });
}

export async function cancelRun(runId: string): Promise<void> {
  await writeEvent({ type: "cancelled", runId, finishedAt: new Date().toISOString() });
}

export async function getRun(runId: string): Promise<Run | undefined> {
  return (await loadIndex()).get(runId);
}

/** Every character id a run config mentions, used by the `characterId` filter. */
export function runCharacterIds(config: RunConfig): string[] {
  switch (config.puzzle) {
    case "trolley":
    case "adventure":
      return config.roster.map((entry) => entry.characterId);
    case "prisoners-dilemma":
      return [config.playerA, config.playerB];
  }
}

export type ListRunsFilter = {
  puzzle?: PuzzleId;
  characterId?: string;
  status?: RunStatus;
  /** Maximum number of runs to return, newest first. */
  limit?: number;
};

/** Runs newest first, filtered. */
export async function listRuns(filter: ListRunsFilter = {}): Promise<Run[]> {
  const all = [...(await loadIndex()).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const matched = all.filter((run) => {
    if (filter.puzzle && run.puzzle !== filter.puzzle) return false;
    if (filter.status && run.status !== filter.status) return false;
    if (filter.characterId && !runCharacterIds(run.config).includes(filter.characterId)) return false;
    return true;
  });
  return filter.limit === undefined ? matched : matched.slice(0, filter.limit);
}

// --- spans -------------------------------------------------------------------------

/** A span as the engine hands it over: `runId` is supplied by the call. */
export type SpanInput = Omit<Span, "runId"> & { runId?: string };
/** The fields a later line may revise. */
export type SpanPatch = Partial<Omit<Span, "runId" | "spanId">>;

/** Appends a span line. Call again through {@link updateSpan} to close it. */
export async function appendSpan(runId: string, span: SpanInput): Promise<Span> {
  const full = spanSchema.parse({ ...span, runId });
  await appendLine(runSpansFile(runId), full);
  return full;
}

/**
 * Appends a patch for an existing span. Readers merge by `spanId`, last write
 * wins per field, so the store stays append-only.
 */
export async function updateSpan(runId: string, spanId: string, patch: SpanPatch): Promise<void> {
  await appendLine(runSpansFile(runId), { ...patch, runId, spanId });
}

/** Every span of a run, merged and in the order each span first appeared. */
export async function listSpans(runId: string): Promise<Span[]> {
  const lines = await readLines<Record<string, unknown>>(runSpansFile(runId));
  const merged = new Map<string, Record<string, unknown>>();

  for (const line of lines) {
    const spanId = typeof line?.spanId === "string" ? line.spanId : undefined;
    if (!spanId) continue;
    merged.set(spanId, { ...merged.get(spanId), ...line });
  }

  const spans: Span[] = [];
  for (const [spanId, value] of merged) {
    const parsed = spanSchema.safeParse(value);
    if (parsed.success) spans.push(parsed.data);
    else console.warn(`[runs] span ${spanId} of run ${runId} is incomplete; skipping`);
  }
  return spans;
}

// --- logs --------------------------------------------------------------------------

/** Appends a log line for a run. */
export async function appendLog(
  runId: string,
  level: LogLevel,
  message: string,
  data?: unknown,
): Promise<LogEvent> {
  const event = logEventSchema.parse({ runId, ts: new Date().toISOString(), level, message, data });
  await appendLine(runLogsFile(runId), event);
  return event;
}

export type ListLogsFilter = { level?: LogLevel; limit?: number };

/** Log lines for a run, oldest first. `limit` keeps the most recent lines. */
export async function listLogs(runId: string, filter: ListLogsFilter = {}): Promise<LogEvent[]> {
  const lines = await readLines<unknown>(runLogsFile(runId));
  const events: LogEvent[] = [];
  for (const line of lines) {
    const parsed = logEventSchema.safeParse(line);
    if (parsed.success && (!filter.level || parsed.data.level === filter.level)) events.push(parsed.data);
  }
  return filter.limit === undefined ? events : events.slice(-filter.limit);
}
