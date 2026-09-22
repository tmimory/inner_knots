/**
 * The one translator between an `Adventure` and what React Flow draws.
 *
 * The domain model has no edges array: an option *is* an edge, because it carries
 * the id of the node it leads to (`null` when taking it ends the adventure). So
 * this hook converts in both directions —
 *
 *   options[].nextNodeId  ->  edges          (one edge per option that leads on)
 *   edge connected        ->  nextNodeId     (the target node's id)
 *   edge rewired          ->  nextNodeId     (twice: the option it left, the one it landed on)
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
import { useCallback, useMemo, useRef, useState } from "react";

import type { Adventure } from "@/lib/domain/adventure";
import type { AdventurePathSummary, AdventureSummary } from "@/lib/domain/summary";
import { removeNode, setOptionTarget } from "@/lib/puzzles/adventure/edits";
import {
  adventureLayout,
  adventureShape,
  type AdventurePoint,
} from "@/lib/puzzles/adventure/layout";
import type { Theme } from "@/theme";

import { isFocused, type FlowFocus } from "./flow-focus";
import { edgePathOptions, edgeLabelBackgroundStyle, edgeLabelStyle, edgeStyle } from "./flow-style";
import {
  DECISION_NODE,
  NODE_TARGET_HANDLE,
  OPTION_EDGE,
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

/**
 * One edge per option that leads somewhere the graph actually has.
 *
 * `focus` is the one option the reader is on — from a row of a card, or from the
 * edge itself. Its edge is drawn in the primary ink at the width `edgeStyle`
 * raises it to, and lifted above the rest, because the line worth following is
 * the one that has to be followable where it crosses the others.
 *
 * `builder` picks the edge component: the builder's own `option` edge, which
 * carries a delete button where a label would go, or React Flow's `smoothstep`,
 * whose label is how the outcome view writes a line's traffic on it.
 */
export function toFlowEdges(
  adventure: Adventure,
  theme: Theme,
  options: { decoration?: GraphDecoration; focus?: FlowFocus | null; builder?: boolean } = {},
): AdventureFlowEdge[] {
  const { decoration, focus = null, builder = false } = options;
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
      const focused = isFocused(focus, node.id, option.id);
      const tone = {
        share: decoration ? share(hits, decoration.walks) : undefined,
        onPath,
        focused,
      };

      edges.push({
        id,
        source: node.id,
        sourceHandle: option.id,
        target: option.nextNodeId,
        targetHandle: NODE_TARGET_HANDLE,
        type: builder ? OPTION_EDGE : "smoothstep",
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
        // Above the bundle it is in, so the followed line is not buried under the
        // three it crosses on its way down the rank gap.
        zIndex: focused ? theme.zIndex.menu : theme.zIndex.base,
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

/** True when a connection would put an edge back where the one it came from was. */
function isSameWiring(edge: AdventureFlowEdge, connection: Connection): boolean {
  return (
    edge.source === connection.source &&
    edge.sourceHandle === connection.sourceHandle &&
    edge.target === connection.target
  );
}

export type UseAdventureGraphInput = {
  adventure: Adventure;
  theme: Theme;
  selectedNodeId?: string | null;
  decoration?: GraphDecoration;
  /**
   * The option the reader is on, from `FlowFocusProvider`. The canvas reads it
   * here and the cards read it for themselves, so the row and its edge light
   * together whichever end the pointer came in at.
   */
  focus?: FlowFocus | null;
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
  /** A new edge out of an option, which re-points it when it already led somewhere. */
  onConnect: (connection: Connection) => void;
  /** Either end of an existing edge dragged onto a new handle. */
  onReconnect: (edge: AdventureFlowEdge, connection: Connection) => void;
  /** The end of that drag: let go of over nothing, the edge is cut. */
  onReconnectEnd: (event: MouseEvent | TouchEvent, edge: AdventureFlowEdge) => void;
  /** Deleting an edge is the option it stood for going back to being an ending. */
  onEdgesDelete: (removed: AdventureFlowEdge[]) => void;
  /** The same thing said about one option rather than about a drawn edge. */
  disconnectOption: (nodeId: string, optionId: string) => void;
  /** Deleting a card takes every reference to it with it. */
  onNodesDelete: (removed: AdventureFlowNode[]) => void;
  /** Refuses only what the model cannot hold: a card leading to itself. */
  isValidConnection: (connection: Connection | Edge) => boolean;
};

/** Holds React Flow's view of one adventure and writes every gesture back. */
export function useAdventureGraph(input: UseAdventureGraphInput): UseAdventureGraph {
  const { adventure, theme, selectedNodeId = null, decoration, focus = null, onChange } = input;

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
  // A boolean rather than `onChange` itself: the screen may well hand down a new
  // closure on every render, and this memo re-seeding on every render is the one
  // thing that would spin the render loop that keeps the two states in step.
  const builder = onChange !== undefined;
  const seedEdges = useMemo(
    () => toFlowEdges(adventure, theme, { decoration, focus, builder }),
    [adventure, theme, decoration, focus, builder],
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

  // An option leads to one node or none, so a second edge dragged out of a handle
  // that already has one *moves* it: the newest target wins. Refusing the gesture
  // meant the author had to find and cut the old line before drawing the new one,
  // which is two edits for what reads as one.
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!onChange || connection.sourceHandle === null) return;
      onChange(
        setOptionTarget(adventure, connection.source, connection.sourceHandle, connection.target),
      );
    },
    [adventure, onChange],
  );

  /**
   * Whether the drag that is ending put the edge down on a handle.
   *
   * React Flow reports a reconnection and the end of the drag separately, and
   * only the pair of them says what happened: an end with no reconnection before
   * it is the edge let go of over the pane, which is how a line is cut by hand.
   * The flag is cleared at the end rather than set at the start — `onReconnectEnd`
   * fires whether or not the edge moved, so it is the one place both readings
   * pass through.
   */
  const reconnected = useRef(false);

  const onReconnect = useCallback(
    (edge: AdventureFlowEdge, connection: Connection) => {
      reconnected.current = true;
      if (!onChange || connection.sourceHandle === null) return;
      // The same wiring redrawn: React Flow reports it, and writing it back would
      // be a change to the adventure that changed nothing in it.
      if (isSameWiring(edge, connection)) return;

      // Dragging the *source* end onto another option hands the line to that
      // option, so the one it left is an ending again. Dragging the target end
      // leaves the option alone and only moves where it leads.
      const movedSource =
        edge.source !== connection.source || edge.sourceHandle !== connection.sourceHandle;
      let next = adventure;
      if (movedSource && edge.sourceHandle != null) {
        next = setOptionTarget(next, edge.source, edge.sourceHandle, null);
      }
      onChange(
        setOptionTarget(next, connection.source, connection.sourceHandle, connection.target),
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

  const onReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, edge: AdventureFlowEdge) => {
      if (!reconnected.current) onEdgesDelete([edge]);
      reconnected.current = false;
    },
    [onEdgesDelete],
  );

  const disconnectOption = useCallback(
    (nodeId: string, optionId: string) => {
      if (!onChange) return;
      onChange(setOptionTarget(adventure, nodeId, optionId, null));
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

  // The only wiring the model cannot hold: an edge has to leave a known option,
  // and a card cannot lead to itself — the walk would never get past it. An
  // option that already leads somewhere is *not* refused any more; the new
  // connection re-points it.
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (connection.sourceHandle === null || connection.sourceHandle === undefined) return false;
    return connection.target !== connection.source;
  }, []);

  return {
    nodes,
    edges,
    layoutKey,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    onReconnectEnd,
    onEdgesDelete,
    disconnectOption,
    onNodesDelete,
    isValidConnection,
  };
}
