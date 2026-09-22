/**
 * The Prompt View's wiring, once.
 *
 * Every puzzle screen offers the same thing: a button that opens a sheet, posts
 * the current configuration to the matching `/api/prompts/*` route and shows what
 * comes back — or why it could not be composed. The screens differ only in the
 * request, which is what `load` is.
 *
 * A preview is composed *as* somebody: the prompt's last paragraph depends on
 * the character that would answer it, because a TypeSafe character is never
 * shown a response format and a tool-calling one is not told about a `choice`
 * field. So the hook also holds the roster as a list of viewpoints, hands the
 * selected one to `load`, and recomposes when it changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PromptPanel, Viewpoint } from "@/components/puzzles/prompt-view";
import type { Character } from "@/lib/domain/character";

import { describeApiError } from "./errors";
import { viewpointsOf } from "./viewpoints";

export type { Viewpoint };
/** Re-exported so a screen needs one import to wire the whole sheet. */
export { seatedCharacters, viewpointsOf } from "./viewpoints";

export type PromptPreviewOptions = {
  /**
   * The characters the preview may be composed as, in seat order. Pass the
   * roster's characters (see {@link seatedCharacters}); an empty list means the
   * preview falls back to the route's default style and says so.
   */
  characters?: readonly Character[];
};

export type PromptPreviewState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  panels: PromptPanel[];
  loading: boolean;
  error: string | null;
  /** Opens the sheet and composes the preview into it. */
  show: () => Promise<void>;
  /** The roster as viewpoints, for the Prompt View's "Viewing as" selector. */
  viewpoints: Viewpoint[];
  /** Whose prompt is on screen: the first viewpoint until another is chosen. */
  viewpoint: Viewpoint | undefined;
  setViewpoint: (id: string) => void;
};

/**
 * Holds one Prompt View. `load` composes the panels for a viewpoint; it is read
 * through a ref, so a screen may pass an inline closure over its current
 * configuration without `show` changing identity on every keystroke.
 */
export function usePromptPreview(
  load: (viewpoint: Viewpoint | undefined) => Promise<PromptPanel[]>,
  options: PromptPreviewOptions = {},
): PromptPreviewState {
  const { characters } = options;

  const [open, setOpen] = useState(false);
  const [panels, setPanels] = useState<PromptPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const viewpoints = useMemo(() => viewpointsOf(characters ?? []), [characters]);

  // Derived rather than stored, so a character leaving the roster falls back to
  // the first seat on its own instead of leaving the sheet pointing at nobody.
  const viewpoint =
    viewpoints.find((entry) => entry.id === selectedId) ?? viewpoints[0] ?? undefined;
  const viewpointId = viewpoint?.id ?? null;

  const loadRef = useRef(load);
  const viewpointRef = useRef(viewpoint);
  useEffect(() => {
    loadRef.current = load;
    viewpointRef.current = viewpoint;
  });

  /** Whose prompt the panels currently hold, so a change recomposes once. */
  const composedFor = useRef<string | null>(null);

  const compose = useCallback(async (next: Viewpoint | undefined): Promise<void> => {
    composedFor.current = next?.id ?? null;
    setLoading(true);
    setError(null);
    setPanels([]);
    try {
      setPanels(await loadRef.current(next));
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const show = useCallback(async (): Promise<void> => {
    // The sheet opens first and says it is composing, rather than the button
    // going quiet for as long as the route takes to answer.
    setOpen(true);
    await compose(viewpointRef.current);
  }, [compose]);

  // Picking another face — or the roster resolving while the sheet is already
  // open — recomposes. Keyed on the id, because the viewpoint list is rebuilt
  // from the characters on every render.
  useEffect(() => {
    if (!open) return;
    if (composedFor.current === viewpointId) return;
    void compose(viewpointRef.current);
  }, [compose, open, viewpointId]);

  const setViewpoint = useCallback((id: string): void => {
    setSelectedId(id);
  }, []);

  return {
    open,
    setOpen,
    panels,
    loading,
    error,
    show,
    viewpoints,
    viewpoint,
    setViewpoint,
  };
}
