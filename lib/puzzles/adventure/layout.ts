/**
 * Where every card of an adventure is drawn.
 *
 * The domain model has no edges array — an option carries the id of the node it
 * leads to — so the layout reads the graph straight off `options[].nextNodeId`.
 *
 * Nothing here is stored. A tree's shape *is* its picture: the same graph must
 * always draw the same way, for the author and for the reader of a run, so the
 * coordinates are derived at render time and thrown away. (`AdventureNode` still
 * carries a `position`; it is written by older drafts and read by nobody.)
 *
 * The graph flows top to bottom — a parent's options leave the bottom edge of its
 * card, one handle per option, and enter the top edge of the card they lead to —
 * so the ranks dagre builds run down the canvas and siblings spread across it.
 * That is the shape a decision tree is read in: the question at the top, the
 * branches fanning out beneath it.
 *
 * dagre orders the cards within a rank without knowing which *handle* an edge
 * leaves from: it sees one edge from a parent to a child, not "the second of
 * three dots along the bottom edge". So a card whose first option led to the node
 * dagre happened to place on the right had its two edges cross, and since cards
 * cannot be dragged there was no undoing it by hand. A sweep after dagre puts
 * that right — see `uncrossRanks` — and `optionLaneCentre` is the one formula
 * that says where along a card's bottom edge an option's handle sits, so the
 * layout and the picture (`components/flow/flow-style.ts`) cannot disagree.
 *
 * The card measurements below are graph geometry rather than design tokens: they
 * are the size React Flow draws a decision card at, down to its line clamps and
 * padding, and `components/flow` reads them from here so the picture and the
 * layout agree on how big a node is. The plain whitespace around the graph is
 * ordinary spacing, so it comes from the theme scale.
 */
import dagre from "@dagrejs/dagre";

import type { Adventure, AdventureNode } from "@/lib/domain/adventure";
import { spacing } from "@/theme/tokens";

/** A point on the canvas: React Flow's top-left corner for a card. */
export type AdventurePoint = { x: number; y: number };

/** The one place the size of a decision card and the gaps around it are decided. */
export const ADVENTURE_LAYOUT = {
  /**
   * Width of a decision card, in px.
   *
   * Twenty pixels wider than it was, because the card is now set one type step up
   * throughout: the whole graph has to fit the canvas, so what makes a card
   * legible is the size it is *drawn* at, not the zoom it is read at.
   */
  nodeWidth: 280,
  /**
   * What a card takes up before its first option row: badges, context, decision.
   *
   * Three clamped lines of setup, then the question at two lines of the step above
   * it, plus the card's own padding. The setup clamps to three rather than two
   * because two cut a sentence in half on nearly every card.
   */
  nodeHeaderHeight: 178,
  /** Added per option row. */
  nodeOptionHeight: 34,
  /**
   * Gap between one rank of cards and the next — down the canvas, now that the
   * tree grows downwards.
   *
   * The whole tree has to fit, and in a top-to-bottom tree it is height that runs
   * out first: a deep adventure is four or five ranks of a 280-pixel card, against
   * a canvas a couple of cards tall. So the gap is exactly what an edge needs to
   * leave the bottom of one card, jog sideways and turn into the top of the next:
   * the straight run `edgePathOptions` asks for at each end, and enough left over
   * that the jogs of a fork's three edges cross the gap at three visibly different
   * depths rather than as one bracket. Not a pixel more, because every pixel
   * beyond that comes off the zoom the cards are read at.
   */
  rankGap: spacing["4xl"] + spacing["2xl"],
  /**
   * Gap between siblings within a rank — across the canvas.
   *
   * Tighter than the rank gap: siblings are already 280 pixels of card apart, and
   * width is what a wide fork spends.
   */
  nodeGap: spacing["2xl"],
  /** Room kept between the edges running between two ranks. */
  edgeGap: spacing.lg,
  /** Margin around the laid-out graph. */
  margin: spacing["2xl"],
} as const;

/** How tall a decision card is drawn, which is what the ranking has to avoid. */
export function adventureNodeHeight(node: Pick<AdventureNode, "options">): number {
  return (
    ADVENTURE_LAYOUT.nodeHeaderHeight + node.options.length * ADVENTURE_LAYOUT.nodeOptionHeight
  );
}

/**
 * Where along a card's bottom edge the handle for one option sits, as a fraction
 * of the card's width: 0 is the left edge, 1 the right, 0.5 the middle.
 *
 * Options share the bottom edge in equal lanes and each handle sits at the centre
 * of its own lane, so three options give thirds at 1/6, 1/2 and 5/6. A card with
 * one option (or none) has nothing to spread, so its handle is centred.
 *
 * This is the one formula for it. `handleStyle` in `components/flow/flow-style.ts`
 * spells the fraction as a CSS percentage and the sweep below reads it as an
 * absolute x, so where the layout believes an edge leaves from is where the canvas
 * actually draws it leaving from.
 */
export function optionLaneCentre(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return (index + 0.5) / count;
}

/** How much canvas the laid-out tree covers: the far edge of its lowest and rightmost cards, plus the layout's own margin. */
export type AdventureExtent = { width: number; height: number };

/**
 * The size of the drawing `adventureLayout` produces.
 *
 * A canvas drawn under a column has no row to fill, so it is given the height the
 * tree needs to be read at full size, and this is that height: nothing about it
 * is stored, and it changes only when the tree's shape does.
 */
export function adventureExtent(adventure: Adventure): AdventureExtent {
  const placed = adventureLayout(adventure);
  let width = 0;
  let height = 0;
  for (const node of adventure.nodes) {
    const point = placed.get(node.id);
    if (!point) continue;
    width = Math.max(width, point.x + ADVENTURE_LAYOUT.nodeWidth);
    height = Math.max(height, point.y + adventureNodeHeight(node));
  }
  return { width: width + ADVENTURE_LAYOUT.margin, height: height + ADVENTURE_LAYOUT.margin };
}

/**
 * Everything the layout depends on, as one string.
 *
 * Positions follow the *shape* of a graph — which cards there are, how many
 * options each has, where each one leads — and not a word of its prose. Writing a
 * card's question must not move the tree under the author's cursor, so the canvas
 * re-runs dagre only when this changes.
 */
export function adventureShape(adventure: Adventure): string {
  return adventure.nodes
    .map((node) => `${node.id}>${node.options.map((option) => option.nextNodeId ?? "").join(",")}`)
    .join("|");
}

/**
 * Places every node top-to-bottom with dagre, the start node first, then sweeps
 * the ranks so no fork's edges cross.
 *
 * Deterministic: the same adventure always produces the same coordinates, because
 * nodes and edges are handed to dagre in the order they are stored and the sweep
 * that follows is a stable sort of what dagre returned. Safe to run on a half-built
 * graph — an option pointing at a node that is not there is simply not an edge —
 * and safe on a graph that loops back on itself.
 */
export function adventureLayout(adventure: Adventure): Map<string, AdventurePoint> {
  const known = new Set(adventure.nodes.map((node) => node.id));
  const graph = new dagre.graphlib.Graph({ multigraph: true });

  graph.setGraph({
    rankdir: "TB",
    ranksep: ADVENTURE_LAYOUT.rankGap,
    nodesep: ADVENTURE_LAYOUT.nodeGap,
    edgesep: ADVENTURE_LAYOUT.edgeGap,
    marginx: ADVENTURE_LAYOUT.margin,
    marginy: ADVENTURE_LAYOUT.margin,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of adventure.nodes) {
    graph.setNode(node.id, {
      width: ADVENTURE_LAYOUT.nodeWidth,
      height: adventureNodeHeight(node),
    });
  }

  for (const node of adventure.nodes) {
    for (const option of node.options) {
      // Two options leading to the same node are two edges, so dagre keeps room
      // for both; the option id is what tells them apart.
      if (option.nextNodeId !== null && known.has(option.nextNodeId)) {
        graph.setEdge(node.id, option.nextNodeId, {}, option.id);
      }
    }
  }

  dagre.layout(graph);

  const boxes: CardBox[] = [];
  for (const node of adventure.nodes) {
    const box = graph.node(node.id);
    if (!box || box.x === undefined || box.y === undefined) continue;
    boxes.push({ id: node.id, centreX: box.x, centreY: box.y, height: adventureNodeHeight(node) });
  }

  const centres = uncrossRanks(boxes, incomingLanes(adventure, known));

  const placed = new Map<string, AdventurePoint>();
  for (const box of boxes) {
    // dagre centers a node on its coordinate; React Flow positions its top-left corner.
    placed.set(box.id, {
      x: Math.round((centres.get(box.id) ?? box.centreX) - ADVENTURE_LAYOUT.nodeWidth / 2),
      y: Math.round(box.centreY - box.height / 2),
    });
  }
  return placed;
}

/** One card as dagre left it: centred on its coordinate, before the sweep. */
type CardBox = { id: string; centreX: number; centreY: number; height: number };

/** One edge arriving at a card, said from the handle it leaves: which lane, of how many. */
type IncomingLane = { parentId: string; index: number; count: number };

/**
 * Every edge that arrives at each card, as the lane of the handle it leaves from.
 *
 * The lane is the option's place among *all* of its card's options, not only the
 * ones that lead somewhere, because that is how the handles are drawn: an ending
 * still takes up its lane along the bottom edge.
 */
function incomingLanes(
  adventure: Adventure,
  known: ReadonlySet<string>,
): Map<string, IncomingLane[]> {
  const arriving = new Map<string, IncomingLane[]>();
  for (const node of adventure.nodes) {
    const count = node.options.length;
    node.options.forEach((option, index) => {
      const target = option.nextNodeId;
      if (target === null || !known.has(target)) return;
      const lanes = arriving.get(target);
      const lane: IncomingLane = { parentId: node.id, index, count };
      if (lanes) lanes.push(lane);
      else arriving.set(target, [lane]);
    });
  }
  return arriving;
}

/** The cards of a graph grouped into ranks, top rank first. */
function ranksOf(boxes: readonly CardBox[]): CardBox[][] {
  // dagre gives every card in a rank the same centre y, so that is the grouping.
  const byDepth = new Map<number, CardBox[]>();
  for (const box of boxes) {
    const rank = byDepth.get(box.centreY);
    if (rank) rank.push(box);
    else byDepth.set(box.centreY, [box]);
  }
  return [...byDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, rank]) => rank);
}

/**
 * Re-orders each rank so its cards sit in the order their edges leave the rank
 * above, which is what stops two edges of one fork crossing.
 *
 * A top-down sweep: rank by rank, every card is given a wanted x — the mean of the
 * absolute x of the source handles pointing at it from cards already placed — the
 * rank is sorted by that, and the rank's own x slots (the coordinates dagre gave
 * it, in ascending order) are handed out in that order. Every card is one width,
 * so swapping slots keeps the rank's spacing, its margins and its total width
 * exactly as dagre computed them.
 *
 * A card nothing above points at (the start, an orphan, the target of a back edge
 * only) keeps its dagre x as its wanted x, so it holds its place among the rest.
 */
function uncrossRanks(
  boxes: readonly CardBox[],
  arriving: ReadonlyMap<string, IncomingLane[]>,
): Map<string, number> {
  const centres = new Map<string, number>();

  for (const rank of ranksOf(boxes)) {
    // Placed already, so a parent on this rank or below it does not pull on
    // anything: only the ranks above have a say.
    const wanted = rank.map((box) => wantedCentre(box, arriving.get(box.id), centres));
    const slots = rank.map((box) => box.centreX).sort((left, right) => left - right);
    const order = rank
      .map((_, index) => index)
      // Stable: cards wanting the same x keep the order dagre gave them.
      .sort((left, right) => wanted[left]! - wanted[right]! || left - right);

    order.forEach((index, slot) => {
      centres.set(rank[index]!.id, slots[slot]!);
    });
  }

  return centres;
}

/** Where a card would like its centre to be: under the handles that point at it. */
function wantedCentre(
  box: CardBox,
  arriving: readonly IncomingLane[] | undefined,
  placed: ReadonlyMap<string, number>,
): number {
  let total = 0;
  let count = 0;
  for (const lane of arriving ?? []) {
    const parentCentre = placed.get(lane.parentId);
    if (parentCentre === undefined) continue;
    total +=
      parentCentre -
      ADVENTURE_LAYOUT.nodeWidth / 2 +
      optionLaneCentre(lane.index, lane.count) * ADVENTURE_LAYOUT.nodeWidth;
    count += 1;
  }
  return count === 0 ? box.centreX : total / count;
}
