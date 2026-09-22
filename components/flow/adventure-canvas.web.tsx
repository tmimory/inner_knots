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
  useStore,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, type CSSProperties } from "react";
import { View } from "react-native";

import type { Adventure } from "@/lib/domain/adventure";
import { ADVENTURE_LAYOUT, adventureNodeHeight } from "@/lib/puzzles/adventure/layout";
import { useTheme } from "@/theme";

import { useFlowChromeStyle } from "./chrome-style.web";
import { adventureNodeTypes } from "./decision-node.web";
import { canvasStyle, miniMapStyle, zoomFloor } from "./flow-style";
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
 * `padding` is the share of the viewport left empty on each side, so the graph
 * lands on about three quarters of the canvas in each direction — enough air to
 * read as a framed drawing, not so much that the cards become thumbnails.
 * `maxZoom` of 1 is the more important half: a fitted graph is the graph as it is
 * actually read, and a card blown up past its own type sizes reads as a mistake.
 */
const FIT = { padding: 0.12, maxZoom: 1 } as const;

/**
 * The smallest zoom the canvas will settle at.
 *
 * A fit is only worth having while what it fits is still readable. The smallest
 * type on a card is the metadata size, so the floor is whatever keeps that at or
 * above the type floor of the app — below it the cards stop being cards and the
 * graph becomes a diagram of itself. When the whole graph will not fit at that
 * zoom, the canvas frames the start of the adventure instead and lets the reader
 * pan: a legible corner of the tree beats an illegible whole of it.
 */

/**
 * How many cards a graph needs before the mini-map earns its corner. Below this
 * the whole tree fits on screen, and the map is a sketch of what is already there
 * — drawn over the cards it duplicates.
 */
const MINIMAP_FROM_NODES = 6;

/** How close to the floor a fitted zoom counts as having hit it. */
const CLAMPED = 0.001;

/** The rectangle the cards occupy, in graph coordinates. */
function graphBounds(
  adventure: Adventure,
): { left: number; top: number; width: number; height: number } | undefined {
  if (adventure.nodes.length === 0) return undefined;

  const left = Math.min(...adventure.nodes.map((node) => node.position.x));
  const right = Math.max(
    ...adventure.nodes.map((node) => node.position.x + ADVENTURE_LAYOUT.nodeWidth),
  );
  const top = Math.min(...adventure.nodes.map((node) => node.position.y));
  const bottom = Math.max(
    ...adventure.nodes.map((node) => node.position.y + adventureNodeHeight(node)),
  );

  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

function Canvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  const { fitView, getZoom, setViewport } = useReactFlow();
  const nodesReady = useNodesInitialized();
  const paneHeight = useStore((state) => state.height);
  const floor = zoomFloor(theme);

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
    onChange,
  });

  /**
   * Frames the graph, and refuses to go below the floor to do it.
   *
   * `fitView` is asked for the whole tree with `minZoom`, so a graph that fits
   * legibly simply fits. When it does not, the fit comes back clamped at the
   * floor and centred on the middle of the tree, which for a left-to-right
   * adventure is the middle of nowhere: the first card is half off one edge and
   * the last half off the other. So the canvas re-frames it the way the graph is
   * read — the opening card against the left margin, the tree centred on the
   * height, and the branches running off the right edge for the reader to follow.
   */
  const { adventure } = props;
  const frame = useCallback(async () => {
    const duration = theme.durations.normal;
    await fitView({ ...FIT, minZoom: floor, duration });

    // "Did the fit come back clamped?", asked of a float: the fit and the floor
    // are computed by different arithmetic and land a rounding apart.
    if (getZoom() - floor > CLAMPED) return;
    const bounds = graphBounds(adventure);
    if (bounds === undefined) return;

    const margin = theme.spacing["2xl"];
    await setViewport(
      {
        zoom: floor,
        x: margin - bounds.left * floor,
        y: Math.max(margin, (paneHeight - bounds.height * floor) / 2) - bounds.top * floor,
      },
      { duration },
    );
  }, [adventure, fitView, floor, getZoom, paneHeight, setViewport, theme]);

  // The opening frame, once React Flow has measured the cards: before that a fit
  // is computed against zero-sized nodes and lands wherever.
  useEffect(() => {
    if (!nodesReady) return;
    void frame();
    // Only on the first measurement: re-framing on every edit would fight the
    // reader's own pan. `frame` changes with the draft, which is exactly what
    // must not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesReady]);

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
      onNodeDragStop={graph.onNodeDragStop}
      onConnect={graph.onConnect}
      onEdgesDelete={graph.onEdgesDelete}
      onNodesDelete={graph.onNodesDelete}
      isValidConnection={graph.isValidConnection}
      onNodeClick={(_event, node) => onSelectNode?.(node.id)}
      onPaneClick={() => onSelectNode?.(null)}
      onEdgeDoubleClick={(_event, edge) => graph.onEdgesDelete([edge])}
      nodesDraggable={builder}
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

  return (
    /*
      The canvas has no frame of its own.

      It used to wear the same hairline an Input wears, which made a 1000px box of
      dots read as a giant text field, and put a second edge a few pixels from the
      rule that already divides it from the inspector. What tells the graph's
      whitespace from the page's now is the dotted ground and the cards on it.

      `h-full` with a floor: the canvas takes the whole height its row is given —
      the screen hands that row the viewport's remainder — so the page ends where
      the window does rather than trailing off into three hundred pixels of
      parchment.
    */
    <View
      style={{ minHeight: theme.layout.canvas }}
      className="h-full w-full overflow-hidden"
    >
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </View>
  );
}
