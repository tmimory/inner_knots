/**
 * The typed client for a CRUD collection route. Characters, objects and
 * adventures all expose the same five calls, so they share one factory.
 *
 * Only types cross this boundary: nothing here imports the store.
 */
import { apiFetch } from "./api";

export type CollectionClient<T, TInput> = {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
  /** Fails with a 409 when the id is already taken. */
  create(input: TInput): Promise<T>;
  /** Fails with a 404 when the id does not exist yet. */
  update(id: string, input: TInput): Promise<T>;
  remove(id: string): Promise<void>;
};

/** Builds the five calls for `/api/<path>`. */
export function createCollectionClient<T, TInput>(path: string): CollectionClient<T, TInput> {
  const root = `/api/${path}`;
  const one = (id: string) => `${root}/${encodeURIComponent(id)}`;

  return {
    async list() {
      const { items } = await apiFetch<{ items: T[] }>(root);
      return items;
    },

    async get(id) {
      const { item } = await apiFetch<{ item: T }>(one(id));
      return item;
    },

    async create(input) {
      const { item } = await apiFetch<{ item: T }>(root, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return item;
    },

    async update(id, input) {
      const { item } = await apiFetch<{ item: T }>(one(id), {
        method: "PUT",
        body: JSON.stringify(input),
      });
      return item;
    },

    async remove(id) {
      await apiFetch<{ deleted: true }>(one(id), { method: "DELETE" });
    },
  };
}
