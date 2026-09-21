/**
 * The character list as screen state.
 *
 * One hook owns the list, its loading and error states, and the three mutations.
 * A mutation folds the store's answer straight into local state rather than
 * re-listing, so a save or a delete lands on screen in the same tick it returns;
 * `refresh()` is there for the cases where a full re-read is genuinely wanted.
 */
import { useCallback } from "react";

import type { Character, CharacterInput } from "../domain/character";
import { charactersApi } from "./characters";
import { useAsyncResource } from "./use-async-resource";

export type UseCharacters = {
  characters: Character[];
  loading: boolean;
  /** Set when the list itself could not be read. Mutations throw instead. */
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CharacterInput) => Promise<Character>;
  update: (id: string, input: CharacterInput) => Promise<Character>;
  remove: (id: string) => Promise<void>;
};

const NONE: Character[] = [];

/** Reads `/api/characters` on mount and keeps the list current across edits. */
export function useCharacters(): UseCharacters {
  const load = useCallback(() => charactersApi.list(), []);
  const { data, loading, error, refresh, set } = useAsyncResource(load, NONE);

  const create = useCallback(
    async (input: CharacterInput) => {
      const created = await charactersApi.create(input);
      // The store preserves first-write order, so a new character belongs at the end.
      set((current) => [...current, created]);
      return created;
    },
    [set],
  );

  const update = useCallback(
    async (id: string, input: CharacterInput) => {
      const saved = await charactersApi.update(id, input);
      set((current) => current.map((item) => (item.id === id ? saved : item)));
      return saved;
    },
    [set],
  );

  const remove = useCallback(
    async (id: string) => {
      await charactersApi.remove(id);
      set((current) => current.filter((item) => item.id !== id));
    },
    [set],
  );

  return { characters: data, loading, error, refresh, create, update, remove };
}
