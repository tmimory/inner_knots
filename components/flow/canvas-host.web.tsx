/**
 * Mounts the React Flow canvas in the browser and nowhere else.
 *
 * The web build is server-rendered, and React Flow needs a DOM the moment it is
 * evaluated, so the canvas is behind a lazy import that is only reached after
 * the first client render. `useSyncExternalStore` is what tells the two apart —
 * it answers the server snapshot while rendering to HTML and the client one once
 * hydrated — so the markup the browser receives and the markup it first renders
 * agree. Until the chunk lands the page shows the same panel the native fallback
 * uses, at the same height, so nothing jumps when it arrives.
 */
import { lazy, Suspense, useSyncExternalStore } from "react";

import { FlowNotice } from "./flow-notice";
import type { AdventureCanvasProps } from "./types";

const AdventureCanvas = lazy(() => import("./adventure-canvas.web"));

/** Shown while the canvas chunk is still on its way. */
const UNROLLING = "Unrolling the canvas\u2026";

/** Nothing to subscribe to: the answer only ever changes by hydrating. */
function subscribe(): () => void {
  return () => {};
}

export function CanvasHost(props: AdventureCanvasProps) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!inBrowser) return <FlowNotice message={UNROLLING} />;

  return (
    <Suspense fallback={<FlowNotice message={UNROLLING} />}>
      <AdventureCanvas {...props} />
    </Suspense>
  );
}
