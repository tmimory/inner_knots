/**
 * React Flow draws with inline styles rather than classes, so the one place the
 * canvas is allowed to name a color, a width or a radius is here — and every
 * value comes from `useTheme()`.
 *
 * Keeping the edge widths in a single function is also what makes the outcome
 * view honest: a thick edge is thick because more walks took it, between a
 * hairline and the widest stroke the theme has a step for.
 */
import type { ViewStyle } from "react-native";

import { ADVENTURE_LAYOUT, optionLaneCentre } from "@/lib/puzzles/adventure/layout";
import type { Theme } from "@/theme";

/**
 * How far one edge's sideways jog is pushed off its neighbours'.
 *
 * The tree runs top to bottom, so an edge leaves the bottom of a card, runs
 * straight down, jogs across to sit over its target, and turns down into the
 * target's top handle. Each option already leaves from its own place along the
 * bottom edge, so a bundle fans out the moment it is drawn — what is left to
 * separate is the *depth* at which two of those runs cross the gap between ranks.
 * Two edges jogging across at the same height read as one bracket.
 *
 * `index` is the edge's place in the bundle leaving one node; `size` is how many
 * there are. A lone edge gets the plain middle bend.
 */
export function edgePathOptions(
  theme: Theme,
  index: number,
  size: number,
): { offset: number; borderRadius: number; stepPosition: number } {
  const middle = (size - 1) / 2;
  const rank = index - middle;
  return {
    // The straight run down out of the handle before the first corner, and the
    // matching run down into the target. One hair longer per lane, so the corners
    // are staggered too — and small enough that both ends fit inside the rank gap
    // with room left for the jogs to spread.
    offset: theme.spacing.md + index * theme.spacing.xxs,
    borderRadius: theme.radii.sm,
    // How far down the gap the sideways run sits, 0 at the card it left and 1 at
    // the card it arrives on. Spread around the midpoint, and never so far out
    // that a bend touches either card.
    stepPosition: clampStep(EDGE_STEP.center + rank * EDGE_STEP.spread),
  };
}

/** How the jogs of a bundle of edges are spread down the gap between two ranks. */
const EDGE_STEP = { center: 0.5, spread: 0.18, min: 0.18, max: 0.82 } as const;

function clampStep(value: number): number {
  return Math.min(EDGE_STEP.max, Math.max(EDGE_STEP.min, value));
}

/** Style for an edge, given how many walks took it and whether it is highlighted. */
export type EdgeTone = {
  share?: number;
  onPath?: boolean;
  /**
   * True for the one option the reader is on — hovering its row, hovering the
   * edge itself, or having clicked either. Not a fourth colour: the edge takes the
   * primary ink the focused option row takes, so the two read as one thing.
   */
  focused?: boolean;
};

/** Style for a node card, given its state on the canvas. */
export type NodeTone = {
  /** The card the author is writing: the one thing the coloured bar means. */
  selected?: boolean;
  onPath?: boolean;
  unvisited?: boolean;
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
  const natural =
    tone.share === undefined
      ? theme.borderWidths.thick
      : min + (max - min) * clampShare(tone.share);
  // The focused edge is never thinner than it was: in the outcome view a stroke's
  // width is how many walks took it, and a hover must not make a busy line read as
  // a quiet one. It is only ever raised to the step where one line among twenty is
  // followable across a fitted canvas.
  return tone.focused ? Math.max(natural, theme.spacing.xs) : natural;
}

/** Stroke color and width for one edge. */
export function edgeStyle(theme: Theme, tone: EdgeTone): { stroke: string; strokeWidth: number } {
  return {
    stroke: tone.focused
      ? theme.colors.primary
      : tone.onPath
        ? theme.colors.accent
        : theme.colors.mutedForeground,
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
 * How big the × that cuts an edge is drawn. A step over the 12px handles, so it
 * reads as a button rather than as a fourth kind of dot, and still small enough
 * to sit on the line without covering the card it runs to.
 */
function edgeDeleteButtonSize(theme: Theme): number {
  return theme.spacing.xl;
}

/**
 * The round button drawn on a focused edge, at the midpoint of its path.
 *
 * It is positioned rather than translated: `EdgeLabelRenderer` portals it inside
 * the viewport's own transform, so flow coordinates minus half the button are
 * exactly the CSS percentage translate React Flow's examples use — and this way
 * the offset is arithmetic on a token rather than a string only CSS can read.
 *
 * `pointerEvents` is spelled out because the renderer's container switches them
 * off wholesale, so a label that wants to be pressed has to ask.
 *
 * `zIndex` is what makes the asking work. The focused edge is lifted to the
 * `menu` layer so its line clears the bundle it crosses, and React Flow draws
 * that layer as its own SVG beside the label renderer — above it, in DOM order.
 * A button under its own line takes no clicks: the wide hit path the edge is
 * given for hovering caught every one. One step above the line puts the button
 * where the pointer is.
 */
export function edgeDeleteButtonStyle(
  theme: Theme,
  at: { x: number; y: number; hovered: boolean },
): ViewStyle {
  const size = edgeDeleteButtonSize(theme);
  return {
    position: "absolute",
    left: at.x - size / 2,
    top: at.y - size / 2,
    width: size,
    height: size,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.full,
    borderWidth: theme.borderWidths.hairline,
    borderColor: at.hovered ? theme.colors.destructive : theme.colors.border,
    backgroundColor: theme.colors.card,
    pointerEvents: "auto",
    zIndex: theme.zIndex.sticky,
  };
}

/**
 * The outline and fill of a decision card.
 *
 * The coloured left edge belongs to the card the author has selected, and to
 * nothing else. It used to mark the start of the adventure, which is the same
 * mark the active page wears in the menu — so on the canvas the opening card
 * looked permanently selected. The start says so in its own header instead.
 */
export function nodeCardStyle(theme: Theme, tone: NodeTone): Record<string, string | number> {
  const borderColor = tone.selected
    ? theme.colors.ring
    : tone.onPath
      ? theme.colors.accent
      : theme.colors.border;

  return {
    // The card is exactly as wide as the layout believes it is.
    width: ADVENTURE_LAYOUT.nodeWidth,
    backgroundColor: theme.colors.card,
    borderColor,
    borderWidth:
      tone.selected || tone.onPath ? theme.borderWidths.thick : theme.borderWidths.hairline,
    // Surfaces take the 8px step; only controls (buttons, chips) go tighter.
    borderRadius: theme.radii.md,
    opacity: tone.unvisited ? theme.opacities.disabled : 1,
    // Written after the uniform border so it wins: one edge in another colour,
    // and only on the card that is being written.
    ...(tone.selected
      ? {
          borderLeftWidth: theme.spacing.xs,
          borderLeftColor: theme.colors.ring,
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
 *
 * The tree runs downwards, so the one target sits centred on the card's top edge
 * and the sources sit along its bottom edge: `lane` says which of the card's
 * options this one is, and the handles come out in the order of the option rows,
 * left to right. Row and handle carry the same number — see `handleLabelStyle` —
 * so an edge that leaves "2" belongs to the line that reads "2".
 */
export function handleStyle(
  theme: Theme,
  kind: "source" | "target" | "terminal",
  lane?: { index: number; count: number },
): Record<string, string | number> {
  const size = theme.spacing.md;
  // The handle is centred on its edge, so half its height plus a gap clears the border.
  const offset = -(size / 2 + theme.spacing.xs);
  const filled = kind !== "target";

  return {
    width: size,
    height: size,
    borderRadius: kind === "terminal" ? theme.radii.none : theme.radii.full,
    backgroundColor: filled ? theme.colors.primary : theme.colors.card,
    borderColor: theme.colors.primary,
    borderWidth: theme.borderWidths.thick,
    // React Flow's own rule already translates a top/bottom handle back by half
    // its width, so a percentage here centres the dot on its lane.
    ...(kind === "target"
      ? { top: offset }
      : { bottom: offset, left: `${laneCentre(lane)}%` }),
  };
}

/**
 * The centre of one option's lane along the card's bottom edge, as a CSS
 * percentage.
 *
 * The fraction itself comes from `optionLaneCentre` in the layout, which is also
 * what the uncrossing sweep measures a handle's x with: the picture and the
 * placement read the same number, so a card cannot be placed under a lane it is
 * not actually drawn under.
 */
function laneCentre(lane: { index: number; count: number } | undefined): number {
  return optionLaneCentre(lane?.index ?? 0, lane?.count ?? 1) * FULL_PERCENT;
}

const FULL_PERCENT = 100;

/**
 * The numeral beside one option's handle.
 *
 * The rows inside a forked card are numbered, but the handles beneath it were
 * not, so saying which line belonged to which choice meant counting dots from the
 * left. The number is drawn as a child of the handle itself rather than hung off
 * the card at a percentage, so it cannot drift from the dot it names however the
 * lanes are divided. It sits to the right of the dot, level with it, rather than
 * under it: the edge leaves the dot straight downwards, and a numeral written
 * under the dot was a numeral with a line drawn through it.
 */
export function handleLabelStyle(theme: Theme): ViewStyle {
  const handle = theme.spacing.md;
  return {
    position: "absolute",
    top: 0,
    left: handle + theme.spacing.xxs,
    height: handle,
    justifyContent: "center",
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
