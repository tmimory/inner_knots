/** Client-side access to the run index, spans and logs. */
import type { PuzzleId, Run, RunStatus } from "../domain/run";
import type { LogEvent, LogLevel, Span } from "../domain/span";
import { apiFetch } from "./api";

export type RunFilter = {
  puzzle?: PuzzleId;
  characterId?: string;
  status?: RunStatus;
  limit?: number;
};

function queryString(filter: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Runs newest first. */
export async function fetchRuns(filter: RunFilter = {}): Promise<Run[]> {
  const { items } = await apiFetch<{ items: Run[] }>(`/api/runs${queryString(filter)}`);
  return items;
}

/** One run, including its summary once it has finished. */
export async function fetchRun(id: string): Promise<Run> {
  const { item } = await apiFetch<{ item: Run }>(`/api/runs/${encodeURIComponent(id)}`);
  return item;
}

/** Every span of a run: the exact requests sent and the raw responses. */
export async function fetchSpans(runId: string): Promise<Span[]> {
  const { items } = await apiFetch<{ items: Span[] }>(`/api/runs/${encodeURIComponent(runId)}/spans`);
  return items;
}

/** A run's log lines, oldest first. */
export async function fetchLogs(
  runId: string,
  filter: { level?: LogLevel; limit?: number } = {},
): Promise<LogEvent[]> {
  const path = `/api/runs/${encodeURIComponent(runId)}/logs${queryString(filter)}`;
  const { items } = await apiFetch<{ items: LogEvent[] }>(path);
  return items;
}
