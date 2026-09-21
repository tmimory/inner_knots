/**
 * The user's own trolley objects as screen state.
 *
 * `/api/objects` holds only what the user made; the several hundred built-in
 * objects are generated in the browser by `buildCatalogue()`. {@link useCatalogue}
 * is what a screen normally wants — this hook is the writable half of it.
 */
import { useCallback } from "react";

import type { TrolleyObject, TrolleyObjectInput } from "../domain/trolley-object";
import { objectsApi } from "./objects";
import { useAsyncResource } from "./use-async-resource";

export type UseObjects = {
  objects: TrolleyObject[];
  loading: boolean;
  /** Set when the list itself could not be read. Mutations throw instead. */
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: TrolleyObjectInput) => Promise<TrolleyObject>;
  remove: (id: string) => Promise<void>;
};

const NONE: TrolleyObject[] = [];

/** Reads `/api/objects` on mount and keeps the list current across edits. */
export function useObjects(): UseObjects {
  const load = useCallback(() => objectsApi.list(), []);
  const { data, loading, error, refresh, set } = useAsyncResource(load, NONE);

  const create = useCallback(
    async (input: TrolleyObjectInput) => {
      const created = await objectsApi.create(input);
      // The store preserves first-write order, so a new object belongs at the end.
      set((current) => [...current, created]);
      return created;
    },
    [set],
  );

  const remove = useCallback(
    async (id: string) => {
      await objectsApi.remove(id);
      set((current) => current.filter((item) => item.id !== id));
    },
    [set],
  );

  return { objects: data, loading, error, refresh, create, remove };
}
