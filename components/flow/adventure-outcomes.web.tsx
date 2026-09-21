import { CanvasHost } from "./canvas-host.web";
import type { AdventureOutcomesProps } from "./types";

/** The read-only canvas: the same tree, with the walks drawn over it. */
export function AdventureOutcomes(props: AdventureOutcomesProps) {
  return <CanvasHost mode="outcomes" {...props} />;
}
