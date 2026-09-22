/**
 * React Flow draws with inline styles rather than classes, so the one place the
 * canvas is allowed to name a color, a width or a radius is here — and every
 * value comes from `useTheme()`.
 *
 * Keeping the edge widths in a single function is also what makes the outcome
 * view honest: a thick edge is thick because more walks took it, between a
 * hairline and the widest stroke the theme has a step for.
 */
import { ADVENTURE_LAYOUT } from "@/lib/puzzles/adventure/layout";
import type { Theme } from "@/theme";

/**
 * The smallest zoom at which a decision card is still a card.
 *
 * Derived rather than picked. A card is set in two sizes — the question one step
 * up, its setup and options at body size — so the smallest type on the canvas is
 * the body step, and the floor is whatever keeps that at or above the caption
 * step, the smallest size the rest of the app is allowed to use. Scaled below it,
 * the cards stop being read and start being recognised, which is a diagram of an
 * adventure rather than the adventure.
 */
export function zoomFloor(theme: Theme): number {
  return theme.fontSizes.xs / theme.fontSizes.base;
}

/**
 * How far one edge's bend is pushed off the shared corridor.
 *
 * Five options landing on one card's single input handle draw five identical
 * right-angled runs on top of each other, and what looks like one edge is five.
 * Giving each edge in a bundle its own step-out distance and its own bend
 * position spreads those runs laterally, so the count of lines into a card is the
 * count of ways into it.
 *
 * `index` is the edge's place in the bundle arriving at one node; `size` is how
 * many there are. A lone edge gets the plain middle bend.
 */
export function edgePathOptions(
  theme: Theme,
  index: number,
  size: number,
): { offset: number; borderRadius: number; stepPosition: number } {
  const middle = (size - 1) / 2;
  const rank = index - middle;
  return {
    // The straight run out of a handle before the first corner.
    offset: theme.spacing.lg + index * theme.spacing.sm,
    borderRadius: theme.radii.sm,
    // Where along the gap the vertical run sits, 0 at the source and 1 at the
    // target. Spread around the midpoint, and never so far out that a bend
    // touches the card it left.
    stepPosition: clampStep(EDGE_STEP.center + rank * EDGE_STEP.spread),
  };
}

/** How the bends of a bundle of edges are spread around the midpoint of the gap. */
const EDGE_STEP = { center: 0.5, spread: 0.11, min: 0.2, max: 0.8 } as const;

function clampStep(value: number): number {
  return Math.min(EDGE_STEP.max, Math.max(EDGE_STEP.min, value));
}

/** Style for an edge, given how many walks took it and whether it is highlighted. */
export type EdgeTone = { share?: number; onPath?: boolean };

/** Style for a node card, given its state on the canvas. */
export type NodeTone = {
  selected?: boolean;
  onPath?: boolean;
  unvisited?: boolean;
  /** The node a walk begins at, which wears a rubric bar instead of a kicker. */
  isStart?: boolean;
};

function clampShare(share: number | undefined): number {
  if (share === undefined || !Number.isFinite(share)) return 0;
  return Math.min(1, Math.max(0, share));
}

/**
 * How thick an edge is drawn. The narrowest is the theme's hairline, the widest
 * its small spacing step, and an edge nobody took stays at the hairline.
 */
export function edgeStrokeWidth(theme: Theme, tone: EdgeTone): number {
  const min = theme.borderWidths.hairline;
  const max = theme.spacing.sm;
  if (tone.share === undefined) return theme.borderWidths.thick;
  return min + (max - min) * clampShare(tone.share);
}

/** Stroke color and width for one edge. */
export function edgeStyle(theme: Theme, tone: EdgeTone): { stroke: string; strokeWidth: number } {
  return {
    stroke: tone.onPath ? theme.colors.accent : theme.colors.mutedForeground,
    strokeWidth: edgeStrokeWidth(theme, tone),
  };
}

/** The small label an edge carries: the option's own words. */
export function edgeLabelStyle(theme: Theme): Record<string, string | number> {
  return {
    fill: theme.colors.mutedForeground,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.xs,
  };
}

/** The parchment plaque the label sits on, so it stays readable over an edge. */
export function edgeLabelBackgroundStyle(theme: Theme): Record<string, string | number> {
  return { fill: theme.colors.card, fillOpacity: theme.opacities.hover };
}

/**
 * The outline and fill of a decision card.
 *
 * The start of the adventure is said with the card's own left edge — a rubric bar
 * in the theme's oxblood — rather than with a kicker above the context. A label
 * costs the card a third type size in its top 60px; an edge costs it nothing and
 * is legible at the zoom a fitted graph is actually read at.
 */
export function nodeCardStyle(theme: Theme, tone: NodeTone): Record<string, string | number> {
  const borderColor = tone.selected
    ? theme.colors.ring
    : tone.onPath
      ? theme.colors.accent
      : theme.colors.border;

  return {
    // The card is exactly as wide as the auto-layout believes it is.
    width: ADVENTURE_LAYOUT.nodeWidth,
    backgroundColor: theme.colors.card,
    borderColor,
    borderWidth:
      tone.selected || tone.onPath ? theme.borderWidths.thick : theme.borderWidths.hairline,
    // Surfaces take the 8px step; only controls (buttons, chips) go tighter.
    borderRadius: theme.radii.md,
    opacity: tone.unvisited ? theme.opacities.disabled : 1,
    // Written after the uniform border so it wins: one edge in another colour.
    ...(tone.isStart
      ? {
          borderLeftWidth: theme.spacing.xxs,
          borderLeftColor: theme.colors.primary,
        }
      : {}),
  };
}

/**
 * A connection point, in one color and three shapes: a hollow ring where an edge
 * arrives, a filled dot where one leaves, and a filled square where taking the
 * option ends the adventure. Colors would have needed a key; a ring, a dot and a
 * square do not, and the square is what replaced the word "end" set at seven
 * pixels beside it. All three are pushed clear of the card edge — React Flow
 * centres a handle on the border by default, which reads as decoration rather
 * than as something to drag.
 */
export function handleStyle(
  theme: Theme,
  kind: "source" | "target" | "terminal",
): Record<string, string | number> {
  const size = theme.spacing.md;
  // The handle is centred on its edge, so half its width plus a gap clears the border.
  const offset = -(size / 2 + theme.spacing.xs);
  const filled = kind !== "target";

  return {
    width: size,
    height: size,
    borderRadius: kind === "terminal" ? theme.radii.none : theme.radii.full,
    backgroundColor: filled ? theme.colors.primary : theme.colors.card,
    borderColor: theme.colors.primary,
    borderWidth: theme.borderWidths.thick,
    ...(kind === "target" ? { left: offset } : { right: offset }),
  };
}

/**
 * The canvas itself. React Flow reads its edges, handles and selection box from
 * CSS variables, so handing it a themed set is how the graph joins the
 * manuscript. Its *chrome* — the zoom controls and the attribution chip — has
 * shape and size baked into the vendor stylesheet that no variable reaches, so
 * that part is restyled in `chrome-style.web.ts` instead.
 */
export function canvasStyle(theme: Theme): Record<string, string | number> {
  return {
    backgroundColor: theme.colors.background,
    "--xy-background-color": theme.colors.background,
    "--xy-background-pattern-color": theme.colors.border,
    "--xy-edge-stroke": theme.colors.mutedForeground,
    "--xy-edge-stroke-selected": theme.colors.accent,
    "--xy-edge-stroke-width": theme.borderWidths.thick,
    "--xy-edge-label-color": theme.colors.mutedForeground,
    "--xy-edge-label-background-color": theme.colors.card,
    "--xy-connectionline-stroke": theme.colors.primary,
    "--xy-connectionline-stroke-width": theme.borderWidths.thick,
    "--xy-handle-background-color": theme.colors.primary,
    "--xy-handle-border-color": theme.colors.card,
    "--xy-selection-background-color": theme.colors.muted,
    "--xy-selection-border": `${theme.borderWidths.thick}px dashed ${theme.colors.ring}`,
    "--xy-minimap-background-color": theme.colors.card,
    "--xy-minimap-node-background-color": theme.colors.muted,
    "--xy-minimap-node-stroke-color": theme.colors.border,
    "--xy-minimap-mask-background-color": theme.colors.background,
  };
}

/**
 * The mini-map, in card and muted colors so it reads as a marginal sketch, and
 * a third smaller than React Flow's default so it keeps out of the graph's way.
 */
export function miniMapStyle(theme: Theme): Record<string, string | number> {
  return {
    width: theme.spacing["4xl"] * 2,
    height: theme.spacing["3xl"] * 2,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidths.hairline,
    borderRadius: theme.radii.md,
  };
}
