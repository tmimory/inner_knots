/**
 * Viewport questions, asked once.
 *
 * "Is this window wide enough for two columns?" was written out five times as
 * `useWindowDimensions().width >= layout.wideBreakpoint`, which meant the shell's
 * idea of wide and a panel's idea of wide could drift apart by one edit. The
 * breakpoint itself still lives in `theme/tokens.ts`; this is only the reading.
 */
import { useWindowDimensions } from "react-native";

import { layout } from "@/theme";

/** True at and above the breakpoint where a fixed column beats a drawer. */
export function useWideViewport(): boolean {
  const { width } = useWindowDimensions();
  return width >= layout.wideBreakpoint;
}

/**
 * Whether `count` panels should sit beside each other rather than stack: wide
 * enough for it, and more than one panel to put there.
 */
export function useSideBySide(count: number): boolean {
  return useWideViewport() && count > 1;
}
