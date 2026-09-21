/**
 * Typed repositories over the JSONL collection files. Server only: nothing in
 * `app/` outside an `+api.ts` route may import this module.
 *
 * Each repository is a thin wrapper around one append-only file. Reads replay
 * the file; writes append one op. Timestamps are stamped here so a client can
 * never backdate an entity.
 */
import type { z } from "zod";

import { adventureSchema, type Adventure } from "@/lib/domain/adventure";
import { characterSchema, type Character } from "@/lib/domain/character";
import { trolleyObjectSchema, type TrolleyObject } from "@/lib/domain/trolley-object";

import { appendLineUnlocked, compact as compactFile, replayCollection, withFileLock } from "./jsonl";
import { collectionFile } from "./paths";

/** The minimum an entity must have to live in a collection. */
export type StoredEntity = { id: string; createdAt: string; updatedAt: string };

/** What a caller may hand to `upsert`: the entity minus the stamped fields. */
export type UpsertInput<T extends StoredEntity> = Omit<T, "createdAt" | "updatedAt"> &
  Partial<Pick<T, "createdAt" | "updatedAt">>;

export type Collection<T extends StoredEntity> = {
  readonly name: string;
  /** Every surviving entity, in the order it was first written. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  has(id: string): Promise<boolean>;
  /** Validates, stamps `createdAt`/`updatedAt`, appends an upsert op. */
  upsert(input: UpsertInput<T>): Promise<T>;
  /** Appends a delete op. Returns false when the id was not there. */
  remove(id: string): Promise<boolean>;
  /** Rewrites the file as one line per surviving entity. */
  compact(): Promise<T[]>;
  /** Absolute path of the backing file, for diagnostics. */
  file(): string;
};

/**
 * Builds a repository for `data/<name>.jsonl` validated by `schema`.
 *
 * The file path is resolved per call rather than captured, so changing
 * `DATA_DIR` (as the tests do) redirects an existing repository.
 */
export function createCollection<T extends StoredEntity>(
  name: string,
  schema: z.ZodType<T>,
): Collection<T> {
  const file = () => collectionFile(name);

  async function list(): Promise<T[]> {
    return replayCollection<T>(file());
  }

  return {
    name,
    file,
    list,

    async get(id) {
      return (await list()).find((entity) => entity.id === id);
    },

    async has(id) {
      return (await list()).some((entity) => entity.id === id);
    },

    async upsert(input) {
      const target = file();
      return withFileLock(target, async () => {
        const existing = (await replayCollection<T>(target)).find((entity) => entity.id === input.id);
        const now = new Date().toISOString();
        const entity = schema.parse({
          ...input,
          createdAt: existing?.createdAt ?? input.createdAt ?? now,
          updatedAt: now,
        });
        await appendLineUnlocked(target, { op: "upsert", entity });
        return entity;
      });
    },

    async remove(id) {
      const target = file();
      return withFileLock(target, async () => {
        const existed = (await replayCollection<T>(target)).some((entity) => entity.id === id);
        if (!existed) return false;
        await appendLineUnlocked(target, { op: "delete", id });
        return true;
      });
    },

    async compact() {
      return compactFile<T>(file());
    },
  };
}

/** `data/characters.jsonl` */
export const characters: Collection<Character> = createCollection("characters", characterSchema);
/** `data/objects.jsonl` */
export const trolleyObjects: Collection<TrolleyObject> = createCollection("objects", trolleyObjectSchema);
/** `data/adventures.jsonl` */
export const adventures: Collection<Adventure> = createCollection("adventures", adventureSchema);
