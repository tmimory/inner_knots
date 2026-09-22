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
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import type { Adventure } from "@/lib/domain/adventure";
import { ADVENTURE_LAYOUT, adventureNodeHeight } from "@/lib/puzzles/adventure/layout";
import { useTheme, type Theme } from "@/theme";

import { useFlowChromeStyle } from "./chrome-style.web";
import { adventureNodeTypes } from "./decision-node.web";
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
 * `padding` is the share of the viewport left empty on each side, so the graph
 * lands on about three quarters of the canvas in each direction — enough air to
 * read as a framed drawing, not so much that the cards become thumbnails.
 * `maxZoom` of 1 is the more important half: a fitted graph is the graph as it is
 * actually read, and a card blown up past its own type sizes reads as a mistake.
 */
const FIT = { padding: 0.12, maxZoom: 1 } as const;

/** The smallest share of the full canvas height a short graph is given. */
const MIN_CANVAS_SHARE = 0.5;

/**
 * How many cards a graph needs before the mini-map earns its corner. Below this
 * the whole tree fits on screen, and the map is a sketch of what is already there
 * — drawn over the cards it duplicates.
 */
const MINIMAP_FROM_NODES = 6;

function Canvas(props: AdventureCanvasProps & { height: number }) {
  const theme = useTheme();
  const { fitView } = useReactFlow();

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

  // The screen asks for a fit by bumping a number, which survives this canvas
  // being mounted later than the toolbar that commands it.
  const { fitSignal } = props;
  useEffect(() => {
    if (fitSignal === 0) return;
    void fitView({ ...FIT, duration: theme.durations.normal });
  }, [fitSignal, fitView, theme.durations.normal]);

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
      fitView
      fitViewOptions={FIT}
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

/** The rectangle the cards occupy, in graph coordinates. */
function graphBounds(adventure: Adventure): { width: number; height: number } | undefined {
  if (adventure.nodes.length === 0) return undefined;

  const left = Math.min(...adventure.nodes.map((node) => node.position.x));
  const right = Math.max(
    ...adventure.nodes.map((node) => node.position.x + ADVENTURE_LAYOUT.nodeWidth),
  );
  const top = Math.min(...adventure.nodes.map((node) => node.position.y));
  const bottom = Math.max(
    ...adventure.nodes.map((node) => node.position.y + adventureNodeHeight(node)),
  );

  return { width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/**
 * How tall to draw the canvas for the graph it holds.
 *
 * A fit keeps the graph's proportions, so a wide, shallow tree fitted into a
 * fixed 640px box leaves two thirds of the box as empty dots — the graph reads as
 * a stamp in the corner of a sheet. Giving the canvas the height the fit actually
 * needs (down to half the full height, up to all of it) is what makes a two-card
 * adventure fill its frame instead of floating in it.
 */
function canvasHeight(theme: Theme, adventure: Adventure, paneWidth: number): number {
  const full = theme.layout.canvas;
  const bounds = graphBounds(adventure);
  if (bounds === undefined || paneWidth <= 0) return full;

  const inner = 1 - 2 * FIT.padding;
  const zoom = Math.min(FIT.maxZoom, (paneWidth * inner) / bounds.width);
  const wanted = (bounds.height * zoom) / inner;
  return Math.round(Math.min(full, Math.max(full * MIN_CANVAS_SHARE, wanted)));
}

/** The canvas, with the React Flow store it needs around it. */
export default function AdventureCanvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  const [paneWidth, setPaneWidth] = useState(0);
  const height = canvasHeight(theme, props.adventure, paneWidth);

  function measure(event: LayoutChangeEvent) {
    setPaneWidth(event.nativeEvent.layout.width);
  }

  return (
    // The canvas is an object on the page, not the page: a hairline and the
    // surface radius are what tell the graph's whitespace from the screen's.
    <View
      onLayout={measure}
      // `minHeight` rather than `height`, with `h-full` over it: the canvas asks
      // for the height its graph needs and then grows to whatever the inspector
      // beside it turns out to be, so the two columns end on one line.
      style={{ minHeight: height }}
      className="h-full w-full overflow-hidden rounded-md border-hairline border-border"
    >
      {/*
        React Flow fits the graph once, as it mounts, so it is only mounted once
        the width is known and the height that follows from it is settled. A fit
        computed against a box that is about to change is a fit that lands wrong.
      */}
      {paneWidth > 0 ? (
        <ReactFlowProvider>
          <Canvas {...props} height={height} />
        </ReactFlowProvider>
      ) : null}
    </View>
  );
}
