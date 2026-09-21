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

/** Style for an edge, given how many walks took it and whether it is highlighted. */
export type EdgeTone = { share?: number; onPath?: boolean };

/** Style for a node card, given its state on the canvas. */
export type NodeTone = { selected?: boolean; onPath?: boolean; unvisited?: boolean };

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

/** The outline and fill of a decision card. */
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
    borderWidth: tone.selected || tone.onPath ? theme.borderWidths.thick : theme.borderWidths.hairline,
    borderRadius: theme.radii.lg,
    opacity: tone.unvisited ? theme.opacities.disabled : 1,
  };
}

/**
 * A connection point. Source handles are rubric, the single target is ink-faint,
 * and both are pushed clear of the card edge — React Flow centres a handle on
 * the border by default, which reads as decoration rather than as something to
 * drag. The cream ring is what separates the dot from the parchment behind it.
 */
export function handleStyle(theme: Theme, kind: "source" | "target"): Record<string, string | number> {
  const size = theme.spacing.md;
  // The handle is centred on its edge, so half its width plus a gap clears the border.
  const offset = -(size / 2 + theme.spacing.xs);

  return {
    width: size,
    height: size,
    borderRadius: theme.radii.full,
    backgroundColor: kind === "source" ? theme.colors.primary : theme.colors.mutedForeground,
    borderColor: theme.colors.card,
    borderWidth: theme.borderWidths.thick,
    ...(kind === "source" ? { right: offset } : { left: offset }),
  };
}

/**
 * The canvas itself. React Flow reads its own chrome — controls, mini-map,
 * connection line, attribution — from CSS variables, so handing it a themed set
 * is how the whole widget joins the manuscript instead of only the nodes.
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
    "--xy-controls-button-background-color": theme.colors.card,
    "--xy-controls-button-background-color-hover": theme.colors.muted,
    "--xy-controls-button-color": theme.colors.foreground,
    "--xy-controls-button-color-hover": theme.colors.primary,
    "--xy-controls-button-border-color": theme.colors.border,
    "--xy-controls-box-shadow": theme.shadows.inkSoft,
    "--xy-attribution-background-color": theme.colors.card,
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

/**
 * The zoom controls, restyled into the outline-button family: one bordered
 * column on the card surface rather than React Flow's default glyph stack.
 */
export function controlsStyle(theme: Theme): Record<string, string | number> {
  return {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidths.hairline,
    borderRadius: theme.radii.md,
    overflow: "hidden",
    margin: theme.spacing.md,
    boxShadow: theme.shadows.inkSoft,
    "--xy-controls-button-background-color": theme.colors.card,
    "--xy-controls-button-background-color-hover": theme.colors.muted,
    "--xy-controls-button-color": theme.colors.mutedForeground,
    "--xy-controls-button-color-hover": theme.colors.primary,
    "--xy-controls-button-border-color": theme.colors.border,
  };
}
