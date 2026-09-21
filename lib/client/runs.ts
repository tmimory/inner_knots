/** Client-side access to the run index, spans and logs, and to starting a run. */
import type { PuzzleId, Run, RunConfig, RunStatus } from "../domain/run";
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

/**
 * Starts a run. Resolves as soon as the server has created it — the run is then
 * `queued` or `running`, and {@link fetchRun} (or `useRun`) reports its progress.
 * A configuration naming a character, object or adventure that is not there
 * fails with a 400 naming it, and nothing is created.
 */
export async function startRun(config: RunConfig): Promise<Run> {
  const { item } = await apiFetch<{ item: Run }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({ config }),
  });
  return item;
}

/**
 * Asks a run to stop. It stops after the decisions already in flight and keeps
 * the partial summary, so the returned run may still say `running`.
 */
export async function cancelRun(id: string): Promise<Run> {
  const { item } = await apiFetch<{ item: Run }>(`/api/runs/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
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
