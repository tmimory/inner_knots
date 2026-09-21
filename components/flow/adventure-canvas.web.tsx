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
import { useEffect, useMemo, type CSSProperties } from "react";
import { View } from "react-native";

import { useTheme } from "@/theme";

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

function Canvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  const { fitView } = useReactFlow();

  const builder = props.mode === "builder";
  const summary = props.mode === "outcomes" ? props.summary : undefined;
  const highlight = props.mode === "outcomes" ? props.highlight : undefined;
  const selectedNodeId = props.mode === "builder" ? props.selectedNodeId : null;
  const onChange = props.mode === "builder" ? props.onChange : undefined;
  const onSelectNode = props.mode === "builder" ? props.onSelectNode : undefined;

  const decoration = useMemo(
    () => decorationFromSummary(summary, highlight),
    [summary, highlight],
  );

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
    void fitView({ duration: theme.durations.normal });
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
      style={canvasStyle(theme) as CSSProperties}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={theme.spacing.xl}
        size={theme.borderWidths.thick}
        color={theme.colors.border}
      />
      <MiniMap
        pannable
        zoomable
        style={miniMapStyle(theme) as CSSProperties}
        nodeColor={theme.colors.muted}
        nodeStrokeColor={theme.colors.border}
        maskColor={theme.colors.background}
      />
      <Controls showInteractive={builder} />
    </ReactFlow>
  );
}

/** The canvas, with the React Flow store it needs around it. */
export default function AdventureCanvas(props: AdventureCanvasProps) {
  const theme = useTheme();
  return (
    <View style={{ height: theme.layout.canvas }} className="w-full">
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </View>
  );
}
