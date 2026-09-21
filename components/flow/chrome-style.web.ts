/**
 * React Flow's own chrome — the zoom controls and the attribution chip — as a
 * themed stylesheet.
 *
 * The widget ships a vendor stylesheet whose `.react-flow__controls-button`
 * rules (26px white squares, a drop shadow, a grey `#999` attribution link) win
 * over the `--xy-controls-*` variables in every case the variables do not cover:
 * shape, size, stroke weight, the separator between buttons. So instead of
 * hoping the variables are enough, the canvas appends one stylesheet of its own
 * to `document.head` — after the bundled vendor CSS, and therefore last in the
 * cascade — built entirely from `useTheme()` values.
 *
 * Web only: this module is imported from `.web.tsx` files, and it is the single
 * place the canvas is allowed to write CSS text.
 */
import { useEffect } from "react";

import type { Theme } from "@/theme";

/** The id of the injected element, so a second canvas reuses the same sheet. */
const STYLE_ID = "inner-knots-flow-chrome";

/** Marks the source handle of an option that currently ends the adventure. */
export const TERMINAL_HANDLE_CLASS = "ik-handle-terminal";

/** How big a zoom button is drawn: the smallest control the theme names, halved. */
function buttonSize(theme: Theme): number {
  return theme.controlSizes["control-sm"] - theme.spacing.xs;
}

/**
 * The stylesheet, as text. Exported for the sake of being readable in one piece;
 * every literal in it is a token, and every color follows the active theme.
 */
export function flowChromeCss(theme: Theme): string {
  const size = buttonSize(theme);
  const motion = `${theme.durations.fast}ms cubic-bezier(${theme.easings.standard.join(", ")})`;

  return `
.react-flow__controls {
  flex-direction: row;
  margin: ${theme.spacing.md}px;
  border: ${theme.borderWidths.hairline}px solid ${theme.colors.border};
  border-radius: ${theme.radii.sm}px;
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.inkSoft};
  overflow: hidden;
}
.react-flow__controls .react-flow__controls-button {
  width: ${size}px;
  height: ${size}px;
  padding: ${theme.spacing.sm}px;
  background: transparent;
  border: none;
  border-right: ${theme.borderWidths.hairline}px solid ${theme.colors.border};
  border-radius: 0;
  color: ${theme.colors.mutedForeground};
  transition: background-color ${motion}, color ${motion};
}
.react-flow__controls .react-flow__controls-button:last-child {
  border-right: none;
}
.react-flow__controls .react-flow__controls-button:hover {
  background: ${theme.colors.muted};
  color: ${theme.colors.primary};
}
.react-flow__controls .react-flow__controls-button:disabled {
  color: ${theme.colors.subtleForeground};
  opacity: ${theme.opacities.disabled};
}
.react-flow__controls .react-flow__controls-button svg {
  max-width: ${theme.spacing.md}px;
  max-height: ${theme.spacing.md}px;
  fill: currentColor;
}
.react-flow__attribution {
  margin: ${theme.spacing.sm}px;
  padding: 0;
  background: transparent;
}
.react-flow__attribution a {
  color: ${theme.colors.subtleForeground};
  opacity: ${theme.opacities.scrim};
  font-family: ${theme.fonts.body}, serif;
  text-decoration: none;
}
.react-flow__node .${TERMINAL_HANDLE_CLASS} {
  opacity: 0;
  transition: opacity ${motion};
}
.react-flow__node:hover .${TERMINAL_HANDLE_CLASS},
.react-flow__node.selected .${TERMINAL_HANDLE_CLASS},
.react-flow__node .${TERMINAL_HANDLE_CLASS}.connecting,
.react-flow.connecting .${TERMINAL_HANDLE_CLASS} {
  opacity: 1;
}
`;
}

/**
 * Keeps the themed sheet in `document.head`, rewriting it whenever the theme
 * changes. Nothing is removed on unmount: one small sheet that the next canvas
 * would only put back is cheaper than the flash of stock chrome in between.
 */
export function useFlowChromeStyle(theme: Theme): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const element =
      document.getElementById(STYLE_ID) ??
      document.head.appendChild(Object.assign(document.createElement("style"), { id: STYLE_ID }));
    element.textContent = flowChromeCss(theme);
  }, [theme]);
}
