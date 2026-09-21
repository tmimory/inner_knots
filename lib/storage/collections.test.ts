import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { characters, createCollection } from "./collections";
import { useTempDataDir, type TempStore } from "./test-utils";

const thingSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(10),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const things = createCollection("things", thingSchema);

const baseCharacter = {
  id: "zeno",
  avatar: { shape: "owl", color: "verdigris" },
  provider: "anthropic" as const,
  model: "claude-sonnet-4-5",
  outputMode: "structured" as const,
  steering: { mode: "full" as const, bio: "a stoic", principles: ["endure"], values: ["calm"] },
};

describe("collections", () => {
  let store: TempStore;

  beforeEach(async () => {
    store = await useTempDataDir();
  });

  afterEach(async () => {
    await store.cleanup();
  });

  it("starts empty", async () => {
    expect(await things.list()).toEqual([]);
    expect(await things.get("nope")).toBeUndefined();
  });

  it("stamps createdAt and updatedAt on insert", async () => {
    const created = await things.upsert({ id: "a", label: "first" });
    expect(created.createdAt).toBe(created.updatedAt);
    expect(await things.get("a")).toEqual(created);
  });

  it("keeps createdAt and moves updatedAt on update", async () => {
    const created = await things.upsert({ id: "a", label: "first" });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const updated = await things.upsert({ id: "a", label: "second" });

    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect(await things.list()).toEqual([updated]);
  });

  it("ignores a createdAt supplied by the caller for an existing entity", async () => {
    const created = await things.upsert({ id: "a", label: "first" });
    const updated = await things.upsert({ id: "a", label: "second", createdAt: "1999-01-01T00:00:00.000Z" });
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it("rejects an entity the schema does not accept", async () => {
    await expect(things.upsert({ id: "a", label: "far too long to fit" })).rejects.toThrow();
    expect(await things.list()).toEqual([]);
  });

  it("removes an entity and reports whether it was there", async () => {
    await things.upsert({ id: "a", label: "first" });
    expect(await things.remove("a")).toBe(true);
    expect(await things.remove("a")).toBe(false);
    expect(await things.list()).toEqual([]);
  });

  it("validates characters against the domain schema", async () => {
    await expect(characters.upsert({ ...baseCharacter, id: "has spaces" })).rejects.toThrow();
    const saved = await characters.upsert(baseCharacter);
    expect(saved.id).toBe("zeno");
    expect(await characters.has("zeno")).toBe(true);
  });
});
