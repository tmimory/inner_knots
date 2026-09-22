/**
 * The React Flow canvas, in the two moods an adventure is ever looked at in:
 * `builder`, where the graph is edited, and `outcomes`, where it is read.
 *
 * It is one component rather than two because the picture is the same picture —
 * the same cards, the same option-to-node edges — and only the chrome and the
 * writability differ. Everything it needs to draw comes from `useAdventureGraph`,
 * and every color it uses comes from `useTheme()` via `flow-style`.
 *
 * This module is the only one that imports React Flow at runtime, and it is
 * reached through a lazy import, so a server render never evaluates it.
 */
import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, type CSSProperties } from "react";
import { View, useWindowDimensions } from "react-native";

import { adventureExtent, adventureShape } from "@/lib/puzzles/adventure/layout";
import { useTheme } from "@/theme";

import { useFlowChromeStyle } from "./chrome-style.web";
import { adventureNodeTypes } from "./decision-node.web";
import { FlowFocusProvider, useFlowFocus, type FlowFocus } from "./flow-focus";
import { canvasStyle, miniMapStyle } from "./flow-style";
import type { AdventureCanvasProps } from "./types";
import {
  decorationFromSummary,
  useAdventureGraph,
  type AdventureFlowEdge,
  type AdventureFlowNode,
} from "./use-adventure-graph";

/** How far the reader may zoom out before the cards stop being cards. */
const ZOOM = { min: 0.15, max: 2 } as const;

/**
 * How the whole graph is framed when the canvas opens, and every time the reader
 * asks for a fit.
 *
 * `maxZoom` of 1: a card blown up past its own type sizes reads as a mistake.
 *
 * The margin round the tree is a fixed number of pixels rather than a share of the
 * drawing's own size. A share cost the most on exactly the graph that could least
 * afford it — a tenth of a tree that runs four ranks down the canvas is a hundred
 * and forty pixels of nothing, taken off the zoom the cards are read at — and the
 * layout already leaves its own margin inside the bounds. So the frame asks only
 * for enough room that the drawing is not against the canvas edge.
 *
 * There is no floor. The canvas used to refuse to zoom out past the point where a
 * card's smallest line hit the app's type floor, and then re-frame on the opening
 * card — which is how a three-card tree came to be drawn with its third card cut
 * off by the inspector while the grid above and below it stood empty. A graph you
 * cannot see all of is not a graph, so the whole tree is fitted, and legibility is
 * bought where it is actually paid for: in the size the cards are drawn at.
 */
const FIT = { maxZoom: 1 } as const;

/**
 * How many cards a graph needs before the mini-map earns its corner. Below this
 * the whole tree fits on screen, and the map is a sketch of what is already there
 * — drawn over the cards it duplicates.
 */
const MINIMAP_FROM_NODES = 6;

/** Which option an edge stands for, or nothing when it carries no data. */
function focusOfEdge(edge: AdventureFlowEdge): FlowFocus | null {
  return edge.data ? { nodeId: edge.data.nodeId, optionId: edge.data.optionId } : null;
}

function Canvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  const { fitView } = useReactFlow();
  const nodesReady = useNodesInitialized();
  // The option the reader is on. The cards set it from their rows and read it
  // back for themselves; the canvas sets it from the edges and hands it to the
  // graph, so both ends of an option light at once.
  const { focus, hover, pin } = useFlowFocus();

  // React Flow's own chrome is CSS, not props: this puts the themed sheet in.
  useFlowChromeStyle(theme);

  const builder = props.mode === "builder";
  const summary = props.mode === "outcomes" ? props.summary : undefined;
  const highlight = props.mode === "outcomes" ? props.highlight : undefined;
  const selectedNodeId = props.mode === "builder" ? props.selectedNodeId : null;
  const onChange = props.mode === "builder" ? props.onChange : undefined;
  const onSelectNode = props.mode === "builder" ? props.onSelectNode : undefined;

  const decoration = useMemo(() => decorationFromSummary(summary, highlight), [summary, highlight]);

  const graph = useAdventureGraph({
    adventure: props.adventure,
    theme,
    selectedNodeId,
    decoration,
    focus,
    onChange,
  });

  /**
   * Frames the whole graph, centred, at whatever zoom that takes.
   *
   * One call and no second guess: `fitView` centres the tree's own bounding box in
   * the pane, which is the framing a drawing wants, and `minZoom` lets it go as
   * far out as the canvas allows rather than stopping half way and leaving the
   * last branch outside the frame.
   */
  const frame = useCallback(async () => {
    await fitView({
      ...FIT,
      padding: `${theme.spacing.md}px`,
      minZoom: ZOOM.min,
      duration: theme.durations.normal,
    });
  }, [fitView, theme]);

  // The opening frame, once React Flow has measured the cards — before that a fit
  // is computed against zero-sized nodes and lands wherever — and again whenever
  // the tree's shape changes, because the layout has just moved every card and a
  // new branch would otherwise be laid out somewhere off screen. Prose edits do
  // not change the shape, so writing a card never fights the reader's own pan.
  useEffect(() => {
    if (!nodesReady) return;
    void frame();
    // `frame` changes with the theme, which is not a reason to re-frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesReady, graph.layoutKey]);

  // The screen asks for a fit by bumping a number, which survives this canvas
  // being mounted later than the toolbar that commands it.
  const { fitSignal } = props;
  useEffect(() => {
    if (fitSignal === 0) return;
    void frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  return (
    <ReactFlow<AdventureFlowNode, AdventureFlowEdge>
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={adventureNodeTypes}
      onNodesChange={graph.onNodesChange}
      onEdgesChange={graph.onEdgesChange}
      onConnect={graph.onConnect}
      onEdgesDelete={graph.onEdgesDelete}
      onNodesDelete={graph.onNodesDelete}
      isValidConnection={graph.isValidConnection}
      onNodeClick={(_event, node) => onSelectNode?.(node.id)}
      onPaneClick={() => {
        onSelectNode?.(null);
        // The pane is where a selection is let go of, so it is where a pinned
        // option is let go of too.
        pin(null);
      }}
      // Hovering an edge lights the row it leaves; clicking it pins that, because
      // reading a card at the far end of the canvas means moving off the line.
      onEdgeMouseEnter={(_event, edge) => hover(focusOfEdge(edge))}
      onEdgeMouseLeave={() => hover(null)}
      onEdgeClick={(_event, edge) => pin(focusOfEdge(edge))}
      onEdgeDoubleClick={(_event, edge) => graph.onEdgesDelete([edge])}
      // Cards are placed by the layout, never by hand: an adventure's picture is
      // its shape, so the same tree draws the same way for the author and for the
      // reader of a run. Dragging one would only desynchronise the two.
      nodesDraggable={false}
      nodesConnectable={builder}
      elementsSelectable={builder}
      edgesReconnectable={false}
      minZoom={ZOOM.min}
      maxZoom={ZOOM.max}
      style={canvasStyle(theme) as CSSProperties}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={theme.spacing.xl}
        size={theme.borderWidths.hairline}
        color={theme.colors.border}
      />
      {props.adventure.nodes.length > MINIMAP_FROM_NODES ? (
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          style={miniMapStyle(theme) as CSSProperties}
          nodeColor={theme.colors.muted}
          nodeStrokeColor={theme.colors.border}
          maskColor={theme.colors.background}
        />
      ) : null}
      {/*
        Zoom, zoom out, fit — and nothing else. The interactivity lock is a
        fourth glyph nobody reaches for, and a padlock beside two magnifiers
        reads as a warning rather than as a toggle.
      */}
      <Controls showInteractive={false} showZoom showFitView position="bottom-left" />
    </ReactFlow>
  );
}

/** The canvas, with the React Flow store it needs around it. */
export default function AdventureCanvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  // The tree's own height at full size, re-measured only when its shape changes:
  // the prose on a card does not move the cards.
  const shape = adventureShape(props.adventure);
  const treeHeight = useMemo(
    () => adventureExtent(props.adventure).height,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shape],
  );

  /*
    How tall the canvas is: as tall as the tree needs to be read at full size,
    plus the frame's own padding at each end, so the opening fit lands at 1:1.
    Never shorter than the theme's canvas — a two-card tree still wants a field
    to be dragged onto — and never taller than the window, since a canvas that
    outgrows the window can only be scrolled past, not looked at; past that the
    fit does its work.

    A fixed height rather than `h-full`: the canvas now sits in a column with the
    inspector under it, and a full-height box in a column that is only as tall as
    its contents resolved to the height of the page itself — twelve hundred pixels
    of dots with the tree floating in the top third of them.
  */
  const height = Math.min(
    Math.max(treeHeight + theme.spacing.md * 2, theme.layout.canvas),
    windowHeight,
  );

  return (
    /*
      The canvas has no frame of its own.

      It used to wear the same hairline an Input wears, which made a 1000px box of
      dots read as a giant text field. What tells the graph's whitespace from the
      page's is the dotted ground and the cards on it.
    */
    <View style={{ height }} className="w-full overflow-hidden">
      {/*
        The focus wraps the React Flow store rather than sitting inside it,
        because both halves of the coupling need it: the cards, which React Flow
        renders, and the canvas itself, which hands it to `useAdventureGraph` so
        the focused edge is toned.
      */}
      <FlowFocusProvider>
        <ReactFlowProvider>
          <Canvas {...props} />
        </ReactFlowProvider>
      </FlowFocusProvider>
    </View>
  );
}
