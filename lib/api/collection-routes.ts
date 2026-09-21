/**
 * The CRUD routes for a JSONL collection, built once and reused by characters,
 * objects and adventures. Server only.
 *
 * Shape, for `/api/<name>`:
 *
 * - `GET`    -> `{ items: T[] }`
 * - `POST`   -> `{ item: T }` (201), 409 when the id is already taken
 *
 * and for `/api/<name>/:id`:
 *
 * - `GET`    -> `{ item: T }`, 404 when absent
 * - `PUT`    -> `{ item: T }`, 404 when absent. The path id wins over the body.
 * - `DELETE` -> `{ deleted: true }`, 404 when absent
 */
import type { z } from "zod";

import type { Collection, StoredEntity, UpsertInput } from "@/lib/storage/collections";

import { conflict, handle, notFound, ok, readBody } from "./http";

export type CollectionInputSchema<T extends StoredEntity> = z.ZodType<
  UpsertInput<T>,
  z.ZodTypeDef,
  unknown
>;

/** `GET` and `POST` for the collection root. */
export function collectionRoutes<T extends StoredEntity>(
  collection: Collection<T>,
  schema: CollectionInputSchema<T>,
) {
  return {
    GET: handle(async () => ok({ items: await collection.list() })),

    POST: handle(async (request: Request) => {
      const input = await readBody(request, schema);
      if (await collection.has(input.id)) {
        return conflict(`A ${collection.name} entry with id "${input.id}" already exists.`);
      }
      return ok({ item: await collection.upsert(input) }, 201);
    }),
  };
}

/** `GET`, `PUT` and `DELETE` for one entity. */
export function entityRoutes<T extends StoredEntity>(
  collection: Collection<T>,
  schema: CollectionInputSchema<T>,
) {
  const missing = (id: string) => notFound(`No ${collection.name} entry with id "${id}".`);

  return {
    GET: handle(async (_request: Request, params: Record<string, string>) => {
      const item = await collection.get(params.id ?? "");
      return item ? ok({ item }) : missing(params.id ?? "");
    }),

    PUT: handle(async (request: Request, params: Record<string, string>) => {
      const id = params.id ?? "";
      if (!(await collection.has(id))) return missing(id);
      const input = await readBody(request, schema);
      return ok({ item: await collection.upsert({ ...input, id }) });
    }),

    DELETE: handle(async (_request: Request, params: Record<string, string>) => {
      const id = params.id ?? "";
      return (await collection.remove(id)) ? ok({ deleted: true }) : missing(id);
    }),
  };
}
