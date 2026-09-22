/**
 * The props the React Flow canvases take, kept apart from the canvases themselves
 * so the `.native.tsx` fallbacks and the screens can name them without pulling
 * React Flow into a bundle that has no DOM to draw on.
 */
import type { Adventure, AdventureNode } from "@/lib/domain/adventure";
import type { AdventurePathSummary, AdventureSummary } from "@/lib/domain/summary";

/** React Flow's node type name for a decision card. */
export const DECISION_NODE = "decision";

/** The id of the single target handle every node has, centred on its top edge. */
export const NODE_TARGET_HANDLE = "in";

/** What one decision card needs to draw itself, in either mode. */
export type DecisionNodeData = {
  node: AdventureNode;
  isStart: boolean;
  /** True when some option in the graph leads here, so the card needs a target handle. */
  isTarget: boolean;
  /** How many walks visited this node. Only the outcome view fills these in. */
  hits?: number;
  /** That count as a share of every recorded walk, 0..1. */
  share?: number;
  /** How many walks took each option of this node. */
  optionHits?: Record<string, number>;
  /** True when the node lies on the walk the reader has selected. */
  onPath?: boolean;
  /** True when walks were recorded and none of them came here. */
  unvisited?: boolean;
};

/** What one edge needs to draw itself: the option it stands for, and how busy it was. */
export type AdventureEdgeData = {
  nodeId: string;
  optionId: string;
  hits?: number;
  share?: number;
  onPath?: boolean;
};

export type AdventureBuilderProps = {
  adventure: Adventure;
  /** Called for every gesture that changes the graph: connect, disconnect, delete. */
  onChange: (next: Adventure) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  /**
   * Bumped by the screen to fit the whole graph into view. An incrementing number
   * rather than a ref, so the command survives the canvas being lazily mounted.
   */
  fitSignal: number;
};

export type AdventureOutcomesProps = {
  adventure: Adventure;
  /** Rewritten by the engine after every step, so this fills in while a run goes. */
  summary?: AdventureSummary;
  /** The one walk drawn in the accent color, when the reader has picked one. */
  highlight?: AdventurePathSummary;
  fitSignal: number;
};

/** One canvas serves both screens; the mode says which chrome it wears. */
export type AdventureCanvasProps =
  | ({ mode: "builder" } & AdventureBuilderProps)
  | ({ mode: "outcomes" } & AdventureOutcomesProps);
