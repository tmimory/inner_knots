/**
 * What a card or an edge can ask the builder to do, handed down the tree rather
 * than carried on the elements themselves.
 *
 * React Flow's nodes and edges are drawn from plain data objects, and that data
 * is rebuilt from the `Adventure` on every keystroke — so a callback written into
 * it would be a new function on every render, stored in a structure that is meant
 * to be nothing but a description of the graph. The two gestures that need one
 * (the × on a focused edge, the toolbar over a selected card) are the same two
 * for every element, so they are provided once by the canvas.
 *
 * `null` outside a builder. The outcome view is read-only, and a card that was
 * not given a way to ask for its own deletion is a card that does not offer it —
 * which is the whole of the mode check either element has to make.
 */
import { createContext, useContext, type ReactNode } from "react";

export type BuilderActions = {
  /**
   * Asks the screen to confirm deleting this card. Nothing is removed here: the
   * screen owns the dialog, because deleting a card also cuts every option that
   * led to it.
   */
  requestDeleteNode: (nodeId: string) => void;
  /** Points one option back at nothing, which is what cutting its edge means. */
  disconnectOption: (nodeId: string, optionId: string) => void;
};

const BuilderActionsContext = createContext<BuilderActions | null>(null);

/** The actions of the canvas this element is drawn in; `null` when it is read-only. */
export function useBuilderActions(): BuilderActions | null {
  return useContext(BuilderActionsContext);
}

export function BuilderActionsProvider({
  actions,
  children,
}: {
  actions: BuilderActions | null;
  children: ReactNode;
}) {
  return <BuilderActionsContext.Provider value={actions}>{children}</BuilderActionsContext.Provider>;
}
