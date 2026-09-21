import { CanvasHost } from "./canvas-host.web";
import type { AdventureBuilderProps } from "./types";

/** The editable canvas: drag cards, drag an option's handle onto the next card. */
export function AdventureBuilder(props: AdventureBuilderProps) {
  return <CanvasHost mode="builder" {...props} />;
}
