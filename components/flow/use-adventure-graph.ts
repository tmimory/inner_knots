/**
 * The one translator between an `Adventure` and what React Flow draws.
 *
 * The domain model has no edges array: an option *is* an edge, because it carries
 * the id of the node it leads to (`null` when taking it ends the adventure). So
 * this hook converts in both directions —
 *
 *   options[].nextNodeId  ->  edges          (one edge per option that leads on)
 *   edge connected        ->  nextNodeId     (the target node's id)
 *   edge deleted          ->  nextNodeId     (back to null: an ending)
 *
 * — so nothing about the canvas is stored at all. Where a card sits is not the
 * author's to decide: `adventureLayout` derives the whole tree from its shape on
 * every structural change, which is why the cards do not drag. React Flow's own
 * node list is still kept in local state rather than derived on every render,
 * because that is where it caches each card's measured size; the adventure is
 * only written to when a gesture finishes.
 */
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  SmoothStepPathOptions,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import type { Adventure } from "@/lib/domain/adventure";
import type { AdventurePathSummary, AdventureSummary } from "@/lib/domain/summary";
import { removeNode, setOptionTarget } from "@/lib/puzzles/adventure/edits";
import {
  adventureLayout,
  adventureShape,
  type AdventurePoint,
} from "@/lib/puzzles/adventure/layout";
import type { Theme } from "@/theme";

import { edgePathOptions, edgeLabelBackgroundStyle, edgeLabelStyle, edgeStyle } from "./flow-style";
import {
  DECISION_NODE,
  NODE_TARGET_HANDLE,
  type AdventureEdgeData,
  type DecisionNodeData,
} from "./types";

export type AdventureFlowNode = Node<DecisionNodeData, typeof DECISION_NODE>;
/**
 * One option, as React Flow draws it. `pathOptions` is carried on the type because
 * every edge here is a smooth step and each one is bent differently, so that the
 * bundle leaving one card reads as several lines rather than one.
 */
export type AdventureFlowEdge = Edge<AdventureEdgeData> & {
  pathOptions?: SmoothStepPathOptions;
};

/** An edge's id: the option it stands for, qualified by the node it leaves. */
export function edgeId(nodeId: string, optionId: string): string {
  return `${nodeId}::${optionId}`;
}

/** Everything the outcome view overlays on the graph. Absent in the builder. */
export type GraphDecoration = {
  /** Walks recorded so far — the denominator behind every share. */
  walks: number;
  nodeHits: Record<string, number>;
  optionHits: Record<string, Record<string, number>>;
  /** The nodes of the walk the reader selected. */
  pathNodeIds: ReadonlySet<string>;
  /** The edges of that walk, keyed by {@link edgeId}. */
  pathEdgeIds: ReadonlySet<string>;
};

/** Folds a summary (and optionally one selected walk) into canvas decoration. */
export function decorationFromSummary(
  summary: AdventureSummary | undefined,
  highlight?: AdventurePathSummary,
): GraphDecoration | undefined {
  if (!summary) return undefined;

  const pathNodeIds = new Set<string>();
  const pathEdgeIds = new Set<string>();
  for (const step of highlight?.steps ?? []) {
    pathNodeIds.add(step.nodeId);
    if (step.optionId !== undefined) pathEdgeIds.add(edgeId(step.nodeId, step.optionId));
  }

  return {
    walks: summary.paths.length,
    nodeHits: summary.nodeHits,
    optionHits: summary.optionHits,
    pathNodeIds,
    pathEdgeIds,
  };
}

/**
 * How many edges leave each node: the size of every bundle, counted at the fork.
 *
 * Lanes used to be handed out by target, which left the three options of one card
 * — "The stranger", "The donor", "Split the dose" — sharing a single trunk across
 * the rank whenever they led to different places, because each was the only edge
 * arriving where it went. A fork is a property of the card the edges leave, so
 * that is what the bundle is counted over.
 */
function outgoingBundles(adventure: Adventure, known: ReadonlySet<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of adventure.nodes) {
    for (const option of node.options) {
      if (option.nextNodeId === null || !known.has(option.nextNodeId)) continue;
      counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Every node some option leads to: the cards that need a place for an edge to land. */
function incomingTargets(adventure: Adventure): Set<string> {
  const targets = new Set<string>();
  for (const node of adventure.nodes) {
    for (const option of node.options) {
      if (option.nextNodeId !== null) targets.add(option.nextNodeId);
    }
  }
  return targets;
}

/** Where a card goes when the layout has nothing to say about it. */
const ORIGIN = { x: 0, y: 0 } as const;

/** A count as a share of the walks recorded; zero when there are none yet. */
function share(count: number, walks: number): number {
  return walks > 0 ? count / walks : 0;
}

/**
 * The decision cards, in the order the adventure stores them, at the coordinates
 * the layout derived for them. A card the layout could not place (it is not in
 * `positions` at all) falls back to the origin rather than disappearing.
 */
export function toFlowNodes(
  adventure: Adventure,
  positions: ReadonlyMap<string, AdventurePoint>,
  options: { selectedNodeId?: string | null; decoration?: GraphDecoration } = {},
): AdventureFlowNode[] {
  const { selectedNodeId, decoration } = options;
  const targets = incomingTargets(adventure);

  return adventure.nodes.map((node) => {
    const hits = decoration?.nodeHits[node.id] ?? 0;
    return {
      id: node.id,
      type: DECISION_NODE,
      position: positions.get(node.id) ?? ORIGIN,
      selected: selectedNodeId === node.id,
      data: {
        node,
        isStart: node.id === adventure.startNodeId,
        isTarget: targets.has(node.id),
        hits: decoration ? hits : undefined,
        share: decoration ? share(hits, decoration.walks) : undefined,
        optionHits: decoration?.optionHits[node.id],
        onPath: decoration?.pathNodeIds.has(node.id) ?? false,
        unvisited: decoration !== undefined && decoration.walks > 0 && hits === 0,
      },
    } satisfies AdventureFlowNode;
  });
}

/** One edge per option that leads somewhere the graph actually has. */
export function toFlowEdges(
  adventure: Adventure,
  theme: Theme,
  options: { decoration?: GraphDecoration } = {},
): AdventureFlowEdge[] {
  const { decoration } = options;
  const known = new Set(adventure.nodes.map((node) => node.id));
  const edges: AdventureFlowEdge[] = [];

  // Every fork is a corridor its own edges would otherwise share, so each edge is
  // told its place in the bundle leaving its card before it is drawn.
  const bundles = outgoingBundles(adventure, known);
  const placed = new Map<string, number>();

  for (const node of adventure.nodes) {
    for (const option of node.options) {
      if (option.nextNodeId === null || !known.has(option.nextNodeId)) continue;

      const id = edgeId(node.id, option.id);
      const index = placed.get(node.id) ?? 0;
      placed.set(node.id, index + 1);
      const hits = decoration?.optionHits[node.id]?.[option.id] ?? 0;
      const onPath = decoration?.pathEdgeIds.has(id) ?? false;
      const tone = {
        share: decoration ? share(hits, decoration.walks) : undefined,
        onPath,
      };

      edges.push({
        id,
        source: node.id,
        sourceHandle: option.id,
        target: option.nextNodeId,
        targetHandle: NODE_TARGET_HANDLE,
        type: "smoothstep",
        pathOptions: edgePathOptions(theme, index, bundles.get(node.id) ?? 1),
        // An edge leaves from the row of the option it stands for, so repeating
        // that option's name on the edge says nothing the picture has not said —
        // and on a forked graph the plaques land on top of the cards. What the
        // edge cannot say for itself is how many walks took it, so that, and only
        // that, is written on it.
        label: decoration ? `×${hits}` : undefined,
        labelShowBg: true,
        labelStyle: edgeLabelStyle(theme),
        labelBgStyle: edgeLabelBackgroundStyle(theme),
        labelBgPadding: [theme.spacing.xs, theme.spacing.xxs],
        labelBgBorderRadius: theme.radii.sm,
        style: edgeStyle(theme, tone),
        // No arrowhead: the edge already terminates in the target card's handle,
        // and a barb drawn on top of that ring is two endings in one place. What
        // the edge leaves from (a filled dot) and what it arrives at (a hollow
        // ring) is the whole of the direction key.
        animated: onPath,
        data: { nodeId: node.id, optionId: option.id, hits: decoration ? hits : undefined, onPath },
      });
    }
  }

  return edges;
}

/** Keeps what React Flow measured for a card that is still the same card. */
function carryMeasurements(
  seed: readonly AdventureFlowNode[],
  current: readonly AdventureFlowNode[],
): AdventureFlowNode[] {
  const measured = new Map(current.map((node) => [node.id, node.measured]));
  return seed.map((node) => ({ ...node, measured: measured.get(node.id) }));
}

/** True when the option an edge would leave from already leads somewhere. */
function optionIsTaken(adventure: Adventure, nodeId: string, optionId: string): boolean {
  const node = adventure.nodes.find((candidate) => candidate.id === nodeId);
  return node?.options.find((option) => option.id === optionId)?.nextNodeId != null;
}

export type UseAdventureGraphInput = {
  adventure: Adventure;
  theme: Theme;
  selectedNodeId?: string | null;
  decoration?: GraphDecoration;
  /** Absent in the outcome view, which never writes back. */
  onChange?: (next: Adventure) => void;
};

export type UseAdventureGraph = {
  nodes: AdventureFlowNode[];
  edges: AdventureFlowEdge[];
  /**
   * The shape the current positions were laid out from. It changes only when a
   * card, an option or a target does, so the canvas can re-frame the tree on a
   * structural edit without fighting the reader's pan on every keystroke.
   */
  layoutKey: string;
  onNodesChange: (changes: NodeChange<AdventureFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AdventureFlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  /** Deleting an edge is the option it stood for going back to being an ending. */
  onEdgesDelete: (removed: AdventureFlowEdge[]) => void;
  /** Deleting a card takes every reference to it with it. */
  onNodesDelete: (removed: AdventureFlowNode[]) => void;
  /** Refuses a second edge out of one option: an option leads to one node or none. */
  isValidConnection: (connection: Connection | Edge) => boolean;
};

/** Holds React Flow's view of one adventure and writes every gesture back. */
export function useAdventureGraph(input: UseAdventureGraphInput): UseAdventureGraph {
  const { adventure, theme, selectedNodeId = null, decoration, onChange } = input;

  // Dagre is re-run only when the tree's shape changes, not when its prose does:
  // writing a question must not shuffle the cards under the author's cursor.
  const layoutKey = adventureShape(adventure);
  const positions = useMemo(
    () => adventureLayout(adventure),
    // The shape is what the layout reads; the adventure object changes on every
    // keystroke and would otherwise re-place the whole tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  );

  const seedNodes = useMemo(
    () => toFlowNodes(adventure, positions, { selectedNodeId, decoration }),
    [adventure, positions, selectedNodeId, decoration],
  );
  const seedEdges = useMemo(
    () => toFlowEdges(adventure, theme, { decoration }),
    [adventure, theme, decoration],
  );

  const [nodes, setNodes] = useState<AdventureFlowNode[]>(seedNodes);
  const [edges, setEdges] = useState<AdventureFlowEdge[]>(seedEdges);
  const [seeded, setSeeded] = useState({ nodes: seedNodes, edges: seedEdges });

  // Resetting derived state during render rather than in an effect: React throws
  // this render away and redoes it, so the canvas never paints the stale graph.
  if (seeded.nodes !== seedNodes || seeded.edges !== seedEdges) {
    setSeeded({ nodes: seedNodes, edges: seedEdges });
    // Re-seeding would otherwise throw away the sizes React Flow measured for
    // each card, so they are carried across by id.
    if (seeded.nodes !== seedNodes) setNodes(carryMeasurements(seedNodes, nodes));
    if (seeded.edges !== seedEdges) setEdges(seedEdges);
  }

  const onNodesChange = useCallback((changes: NodeChange<AdventureFlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<AdventureFlowEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!onChange || connection.sourceHandle === null) return;
      if (optionIsTaken(adventure, connection.source, connection.sourceHandle)) return;
      onChange(
        setOptionTarget(adventure, connection.source, connection.sourceHandle, connection.target),
      );
    },
    [adventure, onChange],
  );

  const onEdgesDelete = useCallback(
    (removed: AdventureFlowEdge[]) => {
      if (!onChange) return;
      let next = adventure;
      for (const edge of removed) {
        if (edge.sourceHandle === null || edge.sourceHandle === undefined) continue;
        next = setOptionTarget(next, edge.source, edge.sourceHandle, null);
      }
      if (next !== adventure) onChange(next);
    },
    [adventure, onChange],
  );

  const onNodesDelete = useCallback(
    (removed: AdventureFlowNode[]) => {
      if (!onChange) return;
      let next = adventure;
      for (const node of removed) next = removeNode(next, node.id);
      if (next !== adventure) onChange(next);
    },
    [adventure, onChange],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const handle = connection.sourceHandle;
      if (handle === null || handle === undefined) return false;
      return !optionIsTaken(adventure, connection.source, handle);
    },
    [adventure],
  );

  return {
    nodes,
    edges,
    layoutKey,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
    onNodesDelete,
    isValidConnection,
  };
}
