import { CanvasHost } from "./canvas-host.web";
import type { AdventureBuilderProps } from "./types";

/** The editable canvas: drag an option's handle onto the card it should lead to. */
export function AdventureBuilder(props: AdventureBuilderProps) {
  return <CanvasHost mode="builder" {...props} />;
}
