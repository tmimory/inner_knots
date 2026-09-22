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
 * Places every node top-to-bottom with dagre, the start node first.
 *
 * Deterministic: the same adventure always produces the same coordinates, because
 * nodes and edges are handed to dagre in the order they are stored. Safe to run on
 * a half-built graph — an option pointing at a node that is not there is simply
 * not an edge — and safe on a graph that loops back on itself.
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

  const placed = new Map<string, AdventurePoint>();
  for (const node of adventure.nodes) {
    const box = graph.node(node.id);
    if (!box || box.x === undefined || box.y === undefined) continue;
    // dagre centers a node on its coordinate; React Flow positions its top-left corner.
    placed.set(node.id, {
      x: Math.round(box.x - ADVENTURE_LAYOUT.nodeWidth / 2),
      y: Math.round(box.y - adventureNodeHeight(node) / 2),
    });
  }
  return placed;
}
