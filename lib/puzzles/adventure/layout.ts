/**
 * Automatic placement for an adventure graph.
 *
 * The domain model has no edges array — an option carries the id of the node it
 * leads to — so the layout reads the graph straight off `options[].nextNodeId`
 * and writes the result back into `node.position`, which is the only place a
 * canvas coordinate is ever stored.
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
  /** Width of a decision card, in px. */
  nodeWidth: 280,
  /** What a card takes up before its first option row: badges, context, decision. */
  nodeHeaderHeight: 132,
  /** Added per option row. */
  nodeOptionHeight: 30,
  /** Vertical gap between one rank of nodes and the next. */
  rankGap: 96,
  /** Horizontal gap between siblings. */
  nodeGap: 56,
  /** Horizontal room kept for an edge label between siblings. */
  edgeGap: spacing.xl,
  /** Margin around the laid-out graph. */
  margin: spacing["2xl"],
} as const;

/** How tall a decision card is drawn, which is what the ranking has to avoid. */
export function adventureNodeHeight(node: Pick<AdventureNode, "options">): number {
  return ADVENTURE_LAYOUT.nodeHeaderHeight + node.options.length * ADVENTURE_LAYOUT.nodeOptionHeight;
}

/**
 * Re-places every node top-to-bottom with dagre, start node first.
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
