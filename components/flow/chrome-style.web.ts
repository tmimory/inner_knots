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

/**
 * Marks the source handle of an option that currently ends the adventure.
 *
 * It used to hide the handle until the card was hovered, because an invisible
 * handle kept a settled graph to one dot per edge. The square now *is* how an
 * ending is said — it replaced the word "end" set beside the option — so it is
 * always drawn, and the class is left only for the cursor it deserves.
 */
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
/*
  The zoom cluster is a margin note on the canvas, not an object floating over
  it: the same hairline the canvas frame is drawn with, no fill of its own and no
  shadow. A filled, shadowed cluster outweighed the frame it sat inside.
*/
.react-flow__controls {
  flex-direction: row;
  margin: ${theme.spacing.md}px;
  border: ${theme.borderWidths.hairline}px solid ${theme.colors.border};
  border-radius: ${theme.radii.sm}px;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}
.react-flow__controls .react-flow__controls-button {
  width: ${size}px;
  height: ${size}px;
  padding: ${theme.spacing.sm}px;
  background: transparent;
  border: none;
  border-radius: 0;
  color: ${theme.colors.mutedForeground};
  transition: background-color ${motion}, color ${motion};
}
/*
  One outer hairline and one hairline between neighbours. Drawn on the second
  button of each pair rather than as a right edge on every button, so the cluster
  cannot end up with two rules a pixel apart where a button's own edge meets the
  frame's.
*/
.react-flow__controls .react-flow__controls-button + .react-flow__controls-button {
  border-left: ${theme.borderWidths.hairline}px solid ${theme.colors.border};
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
  margin: ${theme.spacing.md}px;
  padding: 0;
  background: transparent;
}
/*
  The vendor credit, held at the page's quietest weight: metadata size in the
  reading serif, at the opacity a scrim uses. It has to be there; it does not have
  to be one of the things the eye counts on the canvas.
*/
.react-flow__attribution a {
  color: ${theme.colors.mutedForeground};
  font-family: ${theme.fonts.body}, serif;
  font-size: ${theme.fontSizes.xs}px;
  line-height: ${theme.lineHeights.xs}px;
  text-decoration: none;
  opacity: ${theme.opacities.scrim};
}
/*
  An option's handle is drawn at 12px so it reads as a dot rather than a button,
  and carries an invisible collar so it can be *hit* at a finger's width. Aiming
  at a twelve-pixel target scaled to eight by a fitted graph is a test of the
  mouse, not of the author.
*/
.react-flow__node .react-flow__handle::after {
  content: "";
  position: absolute;
  inset: -${theme.spacing.sm}px;
  border-radius: ${theme.radii.full}px;
}
.react-flow__node .${TERMINAL_HANDLE_CLASS} {
  transition: opacity ${motion};
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
