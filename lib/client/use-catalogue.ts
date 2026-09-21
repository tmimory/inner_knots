/**
 * The object palette's data: the built-in catalogue merged with the user's own.
 *
 * The built-ins are generated in the browser rather than fetched, because
 * `buildCatalogue()` is pure and deterministic and the server resolves ids
 * through exactly the same function — so a palette entry and a run agree by
 * construction. Only the custom objects need a round trip.
 */
import { useCallback, useMemo } from "react";

import type { TrolleyObjectInput } from "../domain/trolley-object";
import { buildCatalogue, type TrolleyObject } from "../puzzles/trolley/catalogue";
import { CUSTOM_TAG, mergeCatalogue } from "../puzzles/trolley/search";
import { useObjects } from "./use-objects";

export type { TrolleyObject as CatalogueItem };

export type UseCatalogue = {
  /** Custom objects first, then the built-ins; an override replaces its built-in. */
  items: TrolleyObject[];
  byId: ReadonlyMap<string, TrolleyObject>;
  /** The user's own objects only, for the manage list. */
  custom: TrolleyObject[];
  /** True while the custom objects are being read; the built-ins are always there. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: TrolleyObjectInput) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
  /** Whether an id is already taken, by a custom object or by a built-in. */
  has: (id: string) => boolean;
};

/** The palette's catalogue, with the custom half writable. */
export function useCatalogue(): UseCatalogue {
  const { objects, loading, error, refresh, create, remove } = useObjects();

  const builtIn = useMemo(() => buildCatalogue(), []);

  const custom = useMemo(
    () =>
      objects.map(
        (object): TrolleyObject => ({
          id: object.id,
          label: object.label,
          prompt: object.prompt,
          icon: object.icon,
          builtIn: false,
          tags: object.tags.includes(CUSTOM_TAG) ? object.tags : [CUSTOM_TAG, ...object.tags],
        }),
      ),
    [objects],
  );

  const items = useMemo(() => mergeCatalogue(builtIn, custom), [builtIn, custom]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const has = useCallback((id: string) => byId.has(id), [byId]);

  return { items, byId, custom, loading, error, refresh, create, remove, has };
}
