/**
 * Where the JSONL stores live on disk. Server only.
 *
 * This is the single place `process.env.DATA_DIR` is read, and it is read on
 * every call rather than at import time so tests can point a fresh temporary
 * directory at the store between cases.
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DATA_DIR = "./data";

/** Absolute path of the data directory, resolved against the process cwd. */
export function dataDir(): string {
  return path.resolve(process.cwd(), process.env.DATA_DIR ?? DEFAULT_DATA_DIR);
}

/** Creates `dir` (and its parents) if it is not there yet. */
export async function ensureDir(dir: string): Promise<string> {
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
}

/** Creates the directory holding `file`, then returns `file`. */
export async function ensureParentDir(file: string): Promise<string> {
  await ensureDir(path.dirname(file));
  return file;
}

/** `data/<name>.jsonl` — the event log for one entity collection. */
export function collectionFile(name: string): string {
  return path.join(dataDir(), `${name}.jsonl`);
}

/** `data/runs` — one directory per run lives underneath. */
export function runsDir(): string {
  return path.join(dataDir(), "runs");
}

/** `data/runs/index.jsonl` — the append-only run status log. */
export function runsIndexFile(): string {
  return path.join(runsDir(), "index.jsonl");
}

/** `data/runs/<runId>` — spans and logs for a single run. */
export function runDir(runId: string): string {
  return path.join(runsDir(), runId);
}

export function runSpansFile(runId: string): string {
  return path.join(runDir(runId), "spans.jsonl");
}

export function runLogsFile(runId: string): string {
  return path.join(runDir(runId), "logs.jsonl");
}
