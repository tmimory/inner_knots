/**
 * Which option the reader is following, shared between the two halves of the
 * canvas that draw it.
 *
 * An option is drawn twice: as a numbered row inside its card, and as the edge
 * that leaves the handle beneath that row. On a card with three options those two
 * pictures are twenty pixels of numeral apart, and the reader was left counting
 * handles from the left to say which line was which choice. So whichever half the
 * pointer is over names the option here, and both halves light up: the row takes
 * the muted fill and the primary ink, the edge takes the primary stroke.
 *
 * Deliberately not React Flow's own selection. Selection means "the card the
 * author is writing" in the builder and nothing at all in the outcome view, and
 * it is stored per element rather than as one answer to "which option is the
 * reader on". This is a pointer, and there is only ever one.
 *
 * Hover is transient; a click pins it, because following a long edge across the
 * canvas means letting go of the row it left. A pinned focus ignores hover until
 * the reader clicks the pane, which is the same gesture that clears a selection.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** One option of one card: the whole of what the canvas can be focused on. */
export type FlowFocus = { nodeId: string; optionId: string };

export type FlowFocusValue = {
  /** The option the reader is on, hovered or pinned. */
  focus: FlowFocus | null;
  /** Follows the pointer. Ignored while a focus is pinned. */
  hover: (focus: FlowFocus | null) => void;
  /** Pins a focus until the next pin. `null` lets go of it. */
  pin: (focus: FlowFocus | null) => void;
};

/** Outside a canvas nothing is focused and nothing can be: the card still draws. */
const IDLE: FlowFocusValue = { focus: null, hover: () => {}, pin: () => {} };

const FlowFocusContext = createContext<FlowFocusValue>(IDLE);

/** The focus of the canvas this component is drawn in. */
export function useFlowFocus(): FlowFocusValue {
  return useContext(FlowFocusContext);
}

/** True when `focus` is this very option. */
export function isFocused(
  focus: FlowFocus | null,
  nodeId: string,
  optionId: string,
): boolean {
  return focus !== null && focus.nodeId === nodeId && focus.optionId === optionId;
}

/** Holds one canvas's focus. Wraps the whole canvas, cards and edges alike. */
export function FlowFocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ focus: FlowFocus | null; pinned: boolean }>({
    focus: null,
    pinned: false,
  });

  const value = useMemo<FlowFocusValue>(
    () => ({
      focus: state.focus,
      hover: (focus) =>
        setState((current) => (current.pinned ? current : { focus, pinned: false })),
      pin: (focus) => setState({ focus, pinned: focus !== null }),
    }),
    [state.focus],
  );

  return <FlowFocusContext.Provider value={value}>{children}</FlowFocusContext.Provider>;
}
