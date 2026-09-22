/**
 * The trolley screen's drawing geometry.
 *
 * Track layout is a picture, not a design system: the rail spacing, the sleeper
 * pitch and the curve of the branch are one coherent drawing and would mean
 * nothing as theme tokens. They are gathered here, in viewport pixels, so the
 * board component itself holds no bare numbers and the whole drawing can be
 * retuned in one file. Colors, radii and type still come from the theme — and
 * where the drawing has to agree with the theme (a glyph's edge length, a line of
 * type, the step between two slots) the token is read here rather than copied.
 */
import { iconSizes, layout, lineHeights, spacing } from "@/theme";

/**
 * A placed object stands *on* its rail, so the vertical structure of a track is
 * three bands rather than one: the name, a hair of air, and the figure itself
 * straddling the rail. Track 1 reads name-then-figure downwards and track 2
 * figure-then-name, which is what puts every name outside the pair of rails.
 */
const GLYPH = iconSizes["icon-lg"];
const NAME_HEIGHT = lineHeights.sm;
const NAME_GAP = spacing.xs;
const LANE_HEIGHT = GLYPH + NAME_GAP + NAME_HEIGHT;

/**
 * The two rail centre lines.
 *
 * Track 1 hangs low enough for its name band and for the run caption above it;
 * track 2 sits far enough below that the two figure bands never touch and the
 * branch still descends at a readable angle.
 */
const RAIL_1_Y = 96;
const RAIL_2_Y = 228;

/** Air under track 2's names, so the drawing ends rather than being cropped. */
const FLOOR = spacing.md;

/** Everything the board is drawn from, in px. */
export const BOARD = {
  /** Total height of the drawing area. */
  height: RAIL_2_Y + GLYPH / 2 + NAME_GAP + NAME_HEIGHT + FLOOR,
  /** Never narrower than this; below it the board scrolls horizontally. */
  minWidth: 720,
  /** Where the tracks part company. The trolley waits just to its left. */
  junctionX: 108,
  /** Horizontal run of the curve that drops track 2 away from the junction. */
  branchRun: 104,
  /** Centre line of each track's rail pair. */
  rail1Y: RAIL_1_Y,
  rail2Y: RAIL_2_Y,
  /** Half the distance between the two rails of one track. */
  railHalfGap: 5,
  /** Sleeper pitch and how far a sleeper sticks out past the rails. */
  tieSpacing: 22,
  tieOverhang: spacing.xs,
  /** The edge length of an object standing on a rail. */
  glyphSize: GLYPH,
  /** One line of the name written beside a figure, and the air before it. */
  nameHeight: NAME_HEIGHT,
  nameGap: NAME_GAP,
  /** Figure plus name: the band one track's contents occupy. */
  laneHeight: LANE_HEIGHT,
  /** The step between two neighbouring slots. */
  slotGap: spacing.sm,
  /**
   * The narrowest a slot may be and still carry a name.
   *
   * Below this a name is two or three truncated words — "Suitcase w…" over a
   * figure — which says less than the drawing under it and costs a line of type
   * on every slot. The value is a little over the widest a slot gets at
   * `minWidth` (about 88px at five slots), so the board's own scroll floor is the
   * narrow case and the names come back as soon as the panel has real room.
   */
  nameMinSlot: 132,
  /** Left padding inside a lane, so a slot never sits on the branch curve. */
  laneInset: spacing.md,
  /**
   * How far short of the board's right edge the rails stop. Without it the rails
   * run under the panel border and read as clipped rather than as ended.
   */
  terminus: spacing.xl,
  /** Half the height of the buffer stop drawn across the rails at the terminus. */
  terminusHalfHeight: spacing.md,
  /**
   * The widest the popover anchored to a figure may grow. It matches the
   * `max-w-menu` the popover is capped at in classes, so the board can tell
   * before laying it out whether it would run off the right edge.
   */
  popoverMaxWidth: layout.menu,
  /**
   * How far left of the junction the trolley waits.
   *
   * It is bounded by the wagon's own half-width: at 92 the wagon was centred on
   * x=16 and the six pixels in front of it fell outside the drawing, so the thing
   * the whole screen is about sat at the edge with its nose cut off.
   */
  approachRun: 68,
  /**
   * The column left of the rails that carries the track names. It sits outside
   * the drawing, so a label never lands on a rail or on the lever.
   */
  gutter: 88,
  /** Half a gutter label's line box, for centring it on its rail. */
  labelHalfHeight: 10,
  /**
   * The palette tile's box: an `icon-md` glyph with a step of parchment above and
   * below it, derived rather than picked so the tile still frames the glyph if
   * either token moves.
   */
  chipHeight: iconSizes["icon-md"] + spacing.sm,
  /**
   * How far a palette tile may grow for its own name. It sizes to its label — an
   * equal-column grid made "Your Dog" two thirds empty box — but a tile wide
   * enough to read "Suitcase with $10,000 in It" whole would crowd the catalogue.
   * A one-off cap on one component, so it stays a number here rather than
   * becoming a layout token nothing else would use.
   */
  chipMaxWidth: 200,
} as const;

/** The trolley drawing, in its own coordinate box. */
export const TROLLEY = {
  width: 52,
  height: 38,
  /** Wheel radius; the wheels sit on the baseline of the box. */
  wheelRadius: 5,
  viewBox: "0 0 52 38",
  /** Body: a closed wagon with a sloped front, drawn on a 52×38 stage. */
  body: "M4 6 H40 L48 14 V26 H4 Z",
  /** Window on the cab. */
  window: "M30 10 H41 L45 15 H30 Z",
  /** Roof line. */
  roof: "M2 6 H42",
  /** Where the two wheels sit. */
  wheelXs: [13, 35],
  wheelY: 30,
  /**
   * The signal lever beside the junction, drawn in a 24×36 box whose bottom-left
   * corner is placed at `(junctionX + offsetX, rail1Y + offsetY)`.
   */
  lever: {
    offsetX: -34,
    offsetY: -36,
    post: "M12 36 V14",
    arm: "M12 14 L21 5",
    base: "M5 36 H19",
  },
} as const;

/**
 * The catalogue, as a count rather than a grid.
 *
 * The tiles used to be laid into a fixed grid of equal columns, which made the
 * catalogue a centred table of bare words sitting under a left-aligned board —
 * two different objects for one gesture. They wrap from the spine like words, so
 * what the palette measures is how many of them it shows, not how wide a cell is.
 */
export const PALETTE = {
  /** How many chips the palette offers before "Show more" is pressed. */
  pageSize: 18,
} as const;

export type TrackId = 1 | 2;

/** The rail centre line for a track. */
export function railY(track: TrackId): number {
  return track === 1 ? BOARD.rail1Y : BOARD.rail2Y;
}

/**
 * The band a track's contents occupy: the figures straddling the rail plus the
 * line of names, which is above the rail on track 1 and below it on track 2.
 */
export function laneTop(track: TrackId): number {
  const figureTop = railY(track) - BOARD.glyphSize / 2;
  return track === 1 ? figureTop - BOARD.nameGap - BOARD.nameHeight : figureTop;
}

/** Where a figure's own box starts, measured from the top of its lane. */
export function figureTopInLane(track: TrackId): number {
  return track === 1 ? BOARD.nameGap + BOARD.nameHeight : 0;
}

/** The leftmost x a slot may occupy, clear of the junction and the branch. */
export function laneLeft(track: TrackId): number {
  return (track === 1 ? BOARD.junctionX : BOARD.junctionX + BOARD.branchRun) + BOARD.laneInset;
}

/**
 * Where the slots of both tracks begin.
 *
 * Track 1 has room further left, but slots that start at two different x read as
 * two unrelated rows rather than as the same five places twice, so both tracks
 * queue from the later of the two.
 */
export function slotsLeft(): number {
  return laneLeft(2);
}

/** Where a rail stops: short of the board's right edge, at the buffer stop. */
export function railEnd(width: number): number {
  return width - BOARD.terminus;
}

/**
 * One slot's width, for a board `width` wide holding `max` of them.
 *
 * The slots are equal columns rather than boxes that size to their own names: a
 * thing standing on a track occupies a place, and the places are the same size
 * whether a place holds "Your Dog" or nothing at all.
 *
 * This is the only place that division is written down. The lane lays its places
 * out from this number rather than sharing the row out with `flex-1`, so the
 * width a slot has and the width the popover is anchored against cannot drift
 * apart.
 */
export function slotWidth(width: number, max: number): number {
  const places = Math.max(1, max);
  const span = railEnd(width) - slotsLeft() - BOARD.slotGap * (places - 1);
  return Math.max(0, span / places);
}

/** The left edge of slot `index`, in board coordinates. */
export function slotX(width: number, max: number, index: number): number {
  return slotsLeft() + index * (slotWidth(width, max) + BOARD.slotGap);
}

/** Whether a slot this wide has room for a name that is worth reading. */
export function showsNames(width: number, max: number): boolean {
  return slotWidth(width, max) >= BOARD.nameMinSlot;
}

/** `M x0 y H x1` for one rail of a pair. */
export function straightRail(y: number, fromX: number, toX: number): string {
  return `M${fromX} ${y} H${toX}`;
}

/**
 * The branch: a symmetric cubic from the junction down to track 2, offset by
 * `dy` so the same curve draws both rails of the pair.
 */
export function branchRail(dy: number): string {
  const x0 = BOARD.junctionX;
  const x1 = BOARD.junctionX + BOARD.branchRun;
  const y0 = BOARD.rail1Y + dy;
  const y1 = BOARD.rail2Y + dy;
  const control = BOARD.branchRun / 2;
  return `M${x0} ${y0} C${x0 + control} ${y0} ${x1 - control} ${y1} ${x1} ${y1}`;
}

/** Sleeper positions along a straight run. */
export function tieXs(fromX: number, toX: number): number[] {
  const xs: number[] = [];
  for (let x = fromX + BOARD.tieSpacing / 2; x < toX; x += BOARD.tieSpacing) xs.push(x);
  return xs;
}

/** Where the trolley waits when nothing is happening: short of the junction. */
export function restPoint(): { x: number; y: number } {
  return { x: BOARD.junctionX - BOARD.approachRun, y: BOARD.rail1Y };
}

/** The stops an animated run is built from, for a board `width` wide. */
export type Travel = {
  /** Centre-x of the wagon at rest and once it is off the right edge. */
  startX: number;
  endX: number;
  /** Fractions of the journey where track 2's descent begins and ends. */
  dropStart: number;
  dropEnd: number;
  /** Rail centre lines, repeated here so a worklet closes over plain numbers. */
  topY: number;
  bottomY: number;
  /** How far up the wagon's own box its wheels sit. */
  liftY: number;
};

/**
 * Everything the trolley animation interpolates between.
 *
 * Returned as plain numbers because it is read inside a reanimated worklet, which
 * captures values rather than calling back into this module.
 */
export function travel(width: number): Travel {
  const rest = restPoint();
  const endX = Math.max(width, BOARD.minWidth) + TROLLEY.width;
  const span = endX - rest.x;
  return {
    startX: rest.x,
    endX,
    dropStart: (BOARD.junctionX - rest.x) / span,
    dropEnd: (BOARD.junctionX + BOARD.branchRun - rest.x) / span,
    topY: BOARD.rail1Y,
    bottomY: BOARD.rail2Y,
    liftY: TROLLEY.height - TROLLEY.wheelRadius,
  };
}
