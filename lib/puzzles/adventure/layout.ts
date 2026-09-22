/**
 * Automatic placement for an adventure graph.
 *
 * The domain model has no edges array — an option carries the id of the node it
 * leads to — so the layout reads the graph straight off `options[].nextNodeId`
 * and writes the result back into `node.position`, which is the only place a
 * canvas coordinate is ever stored.
 *
 * The graph flows left to right — a parent's options leave the right edge of its
 * card and enter the left edge of the card they lead to — so the ranks dagre
 * builds run across the canvas and siblings stack down it.
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
   * Gap between one rank of nodes and the next, across the flow.
   *
   * The whole tree has to fit the canvas — a cropped third card is not a graph —
   * and the canvas is only as wide as the page has left beside the inspector. So
   * the gap is exactly as wide as an edge needs to leave a card, take its own
   * lane and turn back in: every pixel beyond that is a pixel off the zoom the
   * cards are read at.
   */
  rankGap: spacing["4xl"] + spacing["2xl"],
  /** Gap between siblings within a rank. */
  nodeGap: spacing["4xl"],
  /** Room kept for an edge label between siblings. */
  edgeGap: spacing.xl,
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
 * Re-places every node left-to-right with dagre, start node first.
 *
 * Deterministic: the same adventure always produces the same coordinates, because
 * nodes and edges are handed to dagre in the order they are stored. Everything but
 * `position` is returned untouched, so this is safe to run on a half-built graph —
 * an option pointing at a node that is not there is simply not an edge.
 */
export function layoutAdventure(adventure: Adventure): Adventure {
  const known = new Set(adventure.nodes.map((node) => node.id));
  const graph = new dagre.graphlib.Graph({ multigraph: true });

  graph.setGraph({
    rankdir: "LR",
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
      // for both labels; the option id is what tells them apart.
      if (option.nextNodeId !== null && known.has(option.nextNodeId)) {
        graph.setEdge(node.id, option.nextNodeId, {}, option.id);
      }
    }
  }

  dagre.layout(graph);

  return {
    ...adventure,
    nodes: adventure.nodes.map((node) => {
      const placed = graph.node(node.id);
      if (!placed || placed.x === undefined || placed.y === undefined) return node;
      // dagre centers a node on its coordinate; React Flow positions its top-left corner.
      return {
        ...node,
        position: {
          x: Math.round(placed.x - ADVENTURE_LAYOUT.nodeWidth / 2),
          y: Math.round(placed.y - adventureNodeHeight(node) / 2),
        },
      };
    }),
  };
}
