import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appendLine, compact, readLines, replayCollection } from "./jsonl";
import { useTempDataDir, type TempStore } from "./test-utils";

describe("jsonl", () => {
  let store: TempStore;
  let file: string;

  beforeEach(async () => {
    store = await useTempDataDir();
    file = path.join(store.dir, "things.jsonl");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await store.cleanup();
  });

  it("reads a missing file as empty", async () => {
    expect(await readLines(path.join(store.dir, "nope.jsonl"))).toEqual([]);
  });

  it("round-trips appended objects", async () => {
    await appendLine(file, { a: 1 });
    await appendLine(file, { a: 2 });
    expect(await readLines(file)).toEqual([{ a: 1 }, { a: 2 }]);
    expect(await fs.promises.readFile(file, "utf8")).toBe('{"a":1}\n{"a":2}\n');
  });

  it("skips a trailing line that was cut short, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await appendLine(file, { a: 1 });
    await fs.promises.appendFile(file, '{"a":2,"b"');

    expect(await readLines(file)).toEqual([{ a: 1 }]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("replays a collection with last-write-wins", async () => {
    await appendLine(file, { op: "upsert", entity: { id: "a", n: 1 } });
    await appendLine(file, { op: "upsert", entity: { id: "b", n: 1 } });
    await appendLine(file, { op: "upsert", entity: { id: "a", n: 2 } });
    await appendLine(file, { op: "delete", id: "b" });

    expect(await replayCollection(file)).toEqual([{ id: "a", n: 2 }]);
  });

  it("keeps the order entities were first written in", async () => {
    await appendLine(file, { op: "upsert", entity: { id: "a" } });
    await appendLine(file, { op: "upsert", entity: { id: "b" } });
    await appendLine(file, { op: "upsert", entity: { id: "a" } });

    expect((await replayCollection<{ id: string }>(file)).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("compacts history down to one line per surviving entity", async () => {
    await appendLine(file, { op: "upsert", entity: { id: "a", n: 1 } });
    await appendLine(file, { op: "upsert", entity: { id: "a", n: 2 } });
    await appendLine(file, { op: "upsert", entity: { id: "b", n: 1 } });
    await appendLine(file, { op: "delete", id: "b" });

    expect(await compact(file)).toEqual([{ id: "a", n: 2 }]);
    expect(await fs.promises.readFile(file, "utf8")).toBe('{"op":"upsert","entity":{"id":"a","n":2}}\n');
  });

  it("serializes concurrent appends", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => appendLine(file, { i })));
    const lines = await readLines<{ i: number }>(file);
    expect(lines).toHaveLength(25);
    expect(new Set(lines.map((line) => line.i)).size).toBe(25);
  });
});
