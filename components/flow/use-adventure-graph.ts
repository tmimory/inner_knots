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
 *   node dragged          ->  node.position  (committed when the drag stops)
 *
 * — so nothing about the canvas is stored except the coordinates the author put
 * the cards at. React Flow's own node list is kept in local state rather than
 * derived on every render, because that is where it caches each card's measured
 * size; the adventure is only written to when a gesture finishes.
 */
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import type { Adventure } from "@/lib/domain/adventure";
import type { AdventurePathSummary, AdventureSummary } from "@/lib/domain/summary";
import { removeNode, setNodePositions, setOptionTarget } from "@/lib/puzzles/adventure/edits";
import type { Theme } from "@/theme";

import { edgeLabelBackgroundStyle, edgeLabelStyle, edgeStyle } from "./flow-style";
import {
  DECISION_NODE,
  NODE_TARGET_HANDLE,
  type AdventureEdgeData,
  type DecisionNodeData,
} from "./types";

export type AdventureFlowNode = Node<DecisionNodeData, typeof DECISION_NODE>;
export type AdventureFlowEdge = Edge<AdventureEdgeData>;

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

/** A count as a share of the walks recorded; zero when there are none yet. */
function share(count: number, walks: number): number {
  return walks > 0 ? count / walks : 0;
}

/** The decision cards, in the order the adventure stores them. */
export function toFlowNodes(
  adventure: Adventure,
  options: { selectedNodeId?: string | null; decoration?: GraphDecoration } = {},
): AdventureFlowNode[] {
  const { selectedNodeId, decoration } = options;
  const targets = incomingTargets(adventure);

  return adventure.nodes.map((node) => {
    const hits = decoration?.nodeHits[node.id] ?? 0;
    return {
      id: node.id,
      type: DECISION_NODE,
      position: node.position,
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

  for (const node of adventure.nodes) {
    for (const option of node.options) {
      if (option.nextNodeId === null || !known.has(option.nextNodeId)) continue;

      const id = edgeId(node.id, option.id);
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
  onNodesChange: (changes: NodeChange<AdventureFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AdventureFlowEdge>[]) => void;
  /** Commits the dragged coordinates; the drag itself is local state. */
  onNodeDragStop: () => void;
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

  const seedNodes = useMemo(
    () => toFlowNodes(adventure, { selectedNodeId, decoration }),
    [adventure, selectedNodeId, decoration],
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

  const onNodeDragStop = useCallback(() => {
    if (!onChange) return;
    const moved = setNodePositions(
      adventure,
      new Map(nodes.map((node) => [node.id, node.position])),
    );
    if (moved !== adventure) onChange(moved);
  }, [adventure, nodes, onChange]);

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
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onConnect,
    onEdgesDelete,
    onNodesDelete,
    isValidConnection,
  };
}
