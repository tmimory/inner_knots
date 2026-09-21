/**
 * JSONL primitives. Every store in `data/` is an append-only file of one JSON
 * object per line, so it can be read with `cat` or `jq` and recovered by hand.
 *
 * Writes are serialized per file by a promise chain (see `withFileLock`) so two
 * concurrent API requests cannot interleave halves of a line.
 */
import fs from "node:fs";

import { ensureParentDir } from "./paths";

const locks = new Map<string, Promise<unknown>>();

/**
 * Runs `task` after every previously queued task for `file` has settled.
 * A single Node process serves the API routes, so an in-process chain is enough.
 */
export function withFileLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(file) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}

/**
 * Appends without taking the file lock. Only for callers that already hold it
 * (a read-then-write such as `upsert` must stay inside one lock).
 */
export async function appendLineUnlocked(file: string, value: unknown): Promise<void> {
  await ensureParentDir(file);
  await fs.promises.appendFile(file, `${JSON.stringify(value)}\n`, "utf8");
}

/** Appends one newline-terminated JSON object, creating the file if needed. */
export async function appendLine(file: string, value: unknown): Promise<void> {
  await withFileLock(file, () => appendLineUnlocked(file, value));
}

/** Appends several objects in one write, so a batch cannot be split. */
export async function appendLines(file: string, values: readonly unknown[]): Promise<void> {
  if (values.length === 0) return;
  await withFileLock(file, async () => {
    await ensureParentDir(file);
    await fs.promises.appendFile(file, `${values.map((v) => JSON.stringify(v)).join("\n")}\n`, "utf8");
  });
}

/**
 * Reads every parseable line. A missing file reads as empty. A trailing line
 * without its newline is a write that was cut short: it is skipped with a
 * warning rather than failing the whole read.
 */
export async function readLines<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.promises.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const complete = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  if (complete.length === 0) {
    if (raw.length > 0) console.warn(`[jsonl] ${file}: ignoring an incomplete trailing line`);
    return [];
  }

  const lines = complete.split("\n");
  const out: T[] = [];
  const lastIndex = lines.length - 1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      if (i === lastIndex && !raw.endsWith("\n")) {
        console.warn(`[jsonl] ${file}: ignoring an incomplete trailing line`);
      } else {
        console.warn(`[jsonl] ${file}: ignoring unparseable line ${i + 1}`);
      }
    }
  }

  return out;
}

/** One line of a collection file: an entity was written, or an id was removed. */
export type CollectionOp<T> = { op: "upsert"; entity: T } | { op: "delete"; id: string };

/**
 * Replays a collection file into its current state. The last op for an id wins,
 * and insertion order is preserved so lists stay stable as entities are edited.
 */
export async function replayCollection<T extends { id: string }>(file: string): Promise<T[]> {
  const ops = await readLines<CollectionOp<T>>(file);
  const state = new Map<string, T>();

  for (const op of ops) {
    if (!op || typeof op !== "object") continue;
    if (op.op === "upsert" && op.entity && typeof op.entity.id === "string") {
      state.set(op.entity.id, op.entity);
    } else if (op.op === "delete" && typeof op.id === "string") {
      state.delete(op.id);
    }
  }

  return [...state.values()];
}

/**
 * Rewrites a collection file as one `upsert` per surviving entity, dropping the
 * history of edits. Written to a sibling temp file and renamed, so a crash
 * mid-compaction leaves the original intact.
 */
export async function compact<T extends { id: string }>(file: string): Promise<T[]> {
  return withFileLock(file, async () => {
    const entities = await replayCollection<T>(file);
    await ensureParentDir(file);
    const temp = `${file}.compact`;
    const body = entities.map((entity) => JSON.stringify({ op: "upsert", entity })).join("\n");
    await fs.promises.writeFile(temp, body.length > 0 ? `${body}\n` : "", "utf8");
    await fs.promises.rename(temp, file);
    return entities;
  });
}
