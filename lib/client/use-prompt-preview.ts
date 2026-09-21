/**
 * The Prompt View's wiring, once.
 *
 * Every puzzle screen offers the same thing: a button that opens a sheet, posts
 * the current configuration to the matching `/api/prompts/*` route and shows what
 * comes back — or why it could not be composed. The screens differ only in the
 * request, which is what `load` is.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { PromptPanel } from "@/components/puzzles/prompt-view";

import { describeApiError } from "./errors";

export type PromptPreviewState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  panels: PromptPanel[];
  loading: boolean;
  error: string | null;
  /** Opens the sheet and composes the preview into it. */
  show: () => Promise<void>;
};

/**
 * Holds one Prompt View. `load` composes the panels; it is read through a ref, so
 * a screen may pass an inline closure over its current configuration without
 * `show` changing identity on every keystroke.
 */
export function usePromptPreview(load: () => Promise<PromptPanel[]>): PromptPreviewState {
  const [open, setOpen] = useState(false);
  const [panels, setPanels] = useState<PromptPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const show = useCallback(async (): Promise<void> => {
    // The sheet opens first and says it is composing, rather than the button
    // going quiet for as long as the route takes to answer.
    setOpen(true);
    setLoading(true);
    setError(null);
    setPanels([]);
    try {
      setPanels(await loadRef.current());
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  return { open, setOpen, panels, loading, error, show };
}
