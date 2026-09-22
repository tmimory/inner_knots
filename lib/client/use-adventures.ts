/**
 * Adventures as screen state: the shelf at `/puzzles/adventure`, and one
 * editable draft for the builder.
 *
 * The builder edits a whole `Adventure` in memory — connecting an edge is a
 * change to `option.nextNodeId`, writing a card is a change to its text; the
 * canvas positions are derived, never stored — and saves it back with a single
 * PUT. So `useAdventure` holds a draft beside
 * the copy the store last confirmed and reports whether the two have drifted
 * apart, rather than writing through on every keystroke. A save folds into that
 * baseline rather than into the loaded resource, so edits made while the request
 * was in flight are not thrown away when it answers.
 */
import { useCallback, useMemo, useState } from "react";

import type { Adventure, AdventureInput } from "../domain/adventure";
import { copyOfAdventure } from "../puzzles/adventure/edits";
import { adventuresApi } from "./adventures";
import { describeApiError } from "./errors";
import { useAsyncResource } from "./use-async-resource";

/** What the builder saves: the stored fields of a draft, without the timestamps. */
export function adventureInput(adventure: Adventure): AdventureInput {
  const { createdAt, updatedAt, ...input } = adventure;
  return input;
}

const NONE: Adventure[] = [];

export type UseAdventures = {
  adventures: Adventure[];
  loading: boolean;
  /** Set when the list itself could not be read. Mutations throw instead. */
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: AdventureInput) => Promise<Adventure>;
  duplicate: (adventure: Adventure) => Promise<Adventure>;
  remove: (id: string) => Promise<void>;
};

/** Reads `/api/adventures` on mount and keeps the shelf current across edits. */
export function useAdventures(): UseAdventures {
  const load = useCallback(() => adventuresApi.list(), []);
  const { data, loading, error, refresh, set } = useAsyncResource(load, NONE);

  const create = useCallback(
    async (input: AdventureInput) => {
      const created = await adventuresApi.create(input);
      // The store preserves first-write order, so a new adventure belongs at the end.
      set((current) => [...current, created]);
      return created;
    },
    [set],
  );

  const duplicate = useCallback(
    (adventure: Adventure) => create(copyOfAdventure(adventure)),
    [create],
  );

  const remove = useCallback(
    async (id: string) => {
      await adventuresApi.remove(id);
      set((current) => current.filter((item) => item.id !== id));
    },
    [set],
  );

  return { adventures: data, loading, error, refresh, create, duplicate, remove };
}

export type UseAdventure = {
  /** The draft the builder edits; `undefined` until it has been read. */
  draft: Adventure | undefined;
  /** Replaces the draft. Every builder gesture ends here. */
  setDraft: (next: Adventure) => void;
  loading: boolean;
  error: string | null;
  saving: boolean;
  /** True when the draft differs from what the store last confirmed. */
  dirty: boolean;
  /** Writes the draft back with a PUT. Throws nothing: read `error` after. */
  save: () => Promise<void>;
};

/** Reads one adventure and holds the builder's draft of it. Pass `null` to read nothing. */
export function useAdventure(id: string | null): UseAdventure {
  const load = useCallback(
    () => (id === null ? Promise.resolve(undefined) : adventuresApi.get(id)),
    [id],
  );
  const { data: stored, loading, error } = useAsyncResource<Adventure | undefined>(load, undefined);

  const [draft, setDraft] = useState<Adventure | undefined>(stored);
  /** What the store last confirmed: the yardstick `dirty` is measured against. */
  const [baseline, setBaseline] = useState<Adventure | undefined>(stored);
  const [seeded, setSeeded] = useState<Adventure | undefined>(stored);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A fresh read replaces both; adjusting during render rather than in an effect
  // means the builder never paints one adventure's draft over another's.
  if (seeded !== stored) {
    setSeeded(stored);
    setDraft(stored);
    setBaseline(stored);
  }

  // Timestamps are the store's to set, so they are not part of "has this drifted".
  const dirty = useMemo(() => {
    if (draft === undefined || baseline === undefined) return false;
    return JSON.stringify(adventureInput(draft)) !== JSON.stringify(adventureInput(baseline));
  }, [draft, baseline]);

  const save = useCallback(async () => {
    if (draft === undefined) return;
    setSaving(true);
    try {
      const saved = await adventuresApi.update(draft.id, adventureInput(draft));
      setBaseline(saved);
      // Keep whatever is on screen, including edits made while this was in flight.
      setDraft((current) => (current === undefined ? saved : { ...current, updatedAt: saved.updatedAt }));
      setSaveError(null);
    } catch (cause) {
      setSaveError(describeApiError(cause));
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return { draft, setDraft, loading, error: error ?? saveError, saving, dirty, save };
}
