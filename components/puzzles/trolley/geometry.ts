/**
 * The trolley screen's drawing geometry.
 *
 * Track layout is a picture, not a design system: the rail spacing, the sleeper
 * pitch and the curve of the branch are one coherent drawing and would mean
 * nothing as theme tokens. They are gathered here, in viewport pixels, so the
 * board component itself holds no bare numbers and the whole drawing can be
 * retuned in one file. Colors, radii and type still come from the theme.
 */

/** Everything the board is drawn from, in px. */
export const BOARD = {
  /** Total height of the drawing area. */
  height: 236,
  /** Never narrower than this; below it the board scrolls horizontally. */
  minWidth: 640,
  /** Where the tracks part company. The trolley waits just to its left. */
  junctionX: 108,
  /** Horizontal run of the curve that drops track 2 away from the junction. */
  branchRun: 84,
  /** Centre line of each track's rail pair. */
  rail1Y: 92,
  rail2Y: 208,
  /** Half the distance between the two rails of one track. */
  railHalfGap: 5,
  /** Sleeper pitch and how far a sleeper sticks out past the rails. */
  tieSpacing: 22,
  tieOverhang: 4,
  /** The band above a rail that its objects stand in. */
  laneHeight: 76,
  /** Left padding inside a lane, so a chip never sits on the branch curve. */
  laneInset: 12,
  /**
   * How far short of the board's right edge the rails stop. Without it the rails
   * run under the panel border and read as clipped rather than as ended.
   */
  terminus: 24,
  /** Half the height of the buffer stop drawn across the rails at the terminus. */
  terminusHalfHeight: 12,
  /** One slot on a track: the box a single object stands in. */
  slotHeight: 32,
  /**
   * How wide a placed chip may grow. It sizes to its own label — a five-column
   * grid made "Your Dog" two thirds empty box — but a chip wide enough to read
   * "Suitcase with $10,000 in It" whole would crowd the four beside it.
   */
  chipMaxWidth: 200,
  /** The approach rail the trolley rolls in along, left of the junction. */
  approachRun: 92,
  /**
   * The column left of the rails that carries the track names. It sits outside
   * the drawing, so a label never lands on a rail or on the lever.
   */
  gutter: 88,
  /** Half a gutter label's line box, for centring it on its rail. */
  labelHalfHeight: 10,
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
 * The palette flow, in px.
 *
 * The tiles wrap like words rather than filling a rigid grid — eleven equal
 * columns made "Stranger" and "Suitcase with $10,000 in It" the same object — so
 * only the bounds of one tile are fixed here, plus the rough cost of a tile used
 * to clip the flow to about two rows.
 */
export const PALETTE = {
  /**
   * One tile's height, fixed: glyph, two lines of label, and the air around them.
   * Fixed so a one-word tile and a three-word tile leave the row on the same
   * baseline rather than making every row a different height.
   */
  tileHeight: 72,
  /**
   * The label's own box: two lines of the `xs` step, reserved whether the label
   * needs one line or two, so the glyph above it sits at the same height in every
   * tile of a row instead of drifting with the label's depth.
   */
  labelHeight: 32,
  /** A tile is never narrower than this, so a one-word label still reads as a tile. */
  minTileWidth: 80,
  /** Nor wider: past this the label wraps to its second line instead of stretching. */
  maxTileWidth: 152,
  /** What one tile costs a row on average, for clipping the flow to whole rows. */
  averageTileWidth: 118,
  /** How many rows of tiles the palette shows before "Show more" is pressed. */
  visibleRows: 2,
} as const;

/**
 * Roughly how many tiles fill `rows` rows of a flow `width` across.
 *
 * A wrapped flow of variable-width tiles has no row count until it has been laid
 * out, so the clip is an estimate from the average tile: two rows of chips, give
 * or take one, which is what "two rows" means to the eye.
 */
export function paletteBudget(width: number, rows: number): number {
  const perRow = Math.max(1, Math.round(width / PALETTE.averageTileWidth));
  return perRow * Math.max(1, rows);
}

export type TrackId = 1 | 2;

/** The rail centre line for a track. */
export function railY(track: TrackId): number {
  return track === 1 ? BOARD.rail1Y : BOARD.rail2Y;
}

/** Where a track's objects stand: the band immediately above its rail. */
export function laneTop(track: TrackId): number {
  return railY(track) - BOARD.railHalfGap - BOARD.laneHeight;
}

/** The leftmost x a chip may occupy, clear of the junction and the branch. */
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
