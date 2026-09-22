/**
 * One decision card on the canvas: a parchment node with a context, the question
 * it asks, and one row per option.
 *
 * Every option row carries its own source handle, whose id *is* the option id —
 * that is what lets a connection say which option leads where. A row with no
 * outgoing edge is an ending, and says so. In the outcome view the same card
 * shows how many walks came through it and how they split.
 *
 * The whole tree is fitted into the canvas, which means a card is read at
 * something near two-thirds of the size it is drawn at. So the card is set a step
 * up throughout — the question at `xl`, the options at `lg`, the setup at the
 * body step — and what a reader sees is ordinary type rather than a diagram of
 * type. Where a walk begins is a small-caps "Start" in the card's own header; the
 * coloured left edge is reserved for the card the author has selected.
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { View } from "react-native";

import { Badge, Text } from "@/components/ui";
import { formatPercent } from "@/lib/format";
import { ADVENTURE_LAYOUT } from "@/lib/puzzles/adventure/layout";
import { useTheme } from "@/theme";

import { TERMINAL_HANDLE_CLASS } from "./chrome-style.web";
import { handleStyle, nodeCardStyle } from "./flow-style";
import type { AdventureFlowNode } from "./use-adventure-graph";
import { NODE_TARGET_HANDLE } from "./types";

/**
 * Lines of context and of decision text a card shows before it trails off.
 *
 * Three of context rather than two: two clipped a setup mid-sentence on almost
 * every card, and the third line is what turns a fragment back into a sentence.
 * The full text is on the card's accessibility label — React Native Web has no
 * `title` attribute to hang a tooltip from, and the label is what a screen reader
 * and a hover-capable browser both reach.
 */
const CONTEXT_LINES = 3;
const DECISION_LINES = 2;

export function DecisionNode({ data, selected }: NodeProps<AdventureFlowNode>) {
  const theme = useTheme();
  const { node, isStart, isTarget, hits, share, optionHits, onPath, unvisited } = data;
  const counted = hits !== undefined;

  return (
    // No `overflow-hidden`: the option handles sit outside the card border.
    <View
      accessibilityLabel={`${node.decision.trim()} — ${node.context.trim()}`}
      style={nodeCardStyle(theme, { selected, onPath, unvisited })}
    >
      {/*
        Nothing arrives at the start of an adventure, so it is drawn with no place
        for anything to arrive. A node that is both the start and the target of
        some option keeps its handle — otherwise that edge would have nowhere to
        land — which is the one case where the two readings disagree.
      */}
      {isStart && isTarget !== true ? null : (
        <Handle
          type="target"
          id={NODE_TARGET_HANDLE}
          position={Position.Left}
          style={handleStyle(theme, "target")}
        />
      )}

      <View className="gap-xs px-md pb-sm pt-md">
        {isStart || counted ? (
          <View className="flex-row items-center gap-sm">
            {/*
              Where the walk begins, said in the card's own header rather than
              with a rubric bar down its left edge. That bar is the same mark the
              active page wears in the menu, so on the canvas it read as "this
              card is selected" — which is exactly what it now means.
            */}
            {isStart ? <Text className="font-display text-lg text-primary">Start</Text> : null}
            {counted ? (
              <Badge variant={unvisited ? "muted" : "secondary"}>
                <Text>{`${hits} · ${formatPercent(share ?? 0)}`}</Text>
              </Badge>
            ) : null}
          </View>
        ) : null}

        {/*
          Two steps, both one up from where they were: the question at `xl`, the
          setup and the option rows at `lg`. The whole graph is fitted into the
          canvas, so a card is read at about two thirds of the size it is drawn —
          type picked for 1:1 arrives as a caption, and the setup, being the
          smallest line on the card, was arriving at ten pixels. What separates it
          from the question is its ink, not a third size.
        */}
        <Text variant="muted" className="text-lg" numberOfLines={CONTEXT_LINES}>
          {node.context.trim() === "" ? "No context yet" : node.context}
        </Text>
        <Text className="font-bodySemiBold text-xl" numberOfLines={DECISION_LINES}>
          {node.decision.trim() === "" ? "No decision yet" : node.decision}
        </Text>
      </View>

      <View className="border-t-hairline border-border">
        {node.options.length === 0 ? (
          <View
            className="justify-center px-md"
            style={{ height: ADVENTURE_LAYOUT.nodeOptionHeight }}
          >
            <Text variant="muted" className="text-lg">
              No options yet
            </Text>
          </View>
        ) : null}

        {node.options.map((option) => (
          <View
            key={option.id}
            // The row an option's edge leaves from is also the row you aim at to
            // drag one, so it answers the cursor.
            className="flex-row items-center gap-xs px-md transition-colors duration-fast web:hover:bg-muted/subtle"
            style={{ height: ADVENTURE_LAYOUT.nodeOptionHeight }}
          >
            <Text className="flex-1 text-lg" numberOfLines={1}>
              {option.label}
            </Text>
            {counted ? (
              <Text variant="muted" className="font-mono text-base tabular">
                {optionHits?.[option.id] ?? 0}
              </Text>
            ) : null}
            {/*
              An option that ends the adventure used to say "end" in a seven-pixel
              word beside its handle — a third type size on the card, unreadable at
              any zoom a whole graph is read at. The ending is now the handle
              itself: a filled square where every other option has a round dot, so
              the terminals of a tree are countable at a glance and the card keeps
              its two sizes.
            */}
            <Handle
              type="source"
              id={option.id}
              position={Position.Right}
              className={option.nextNodeId === null ? TERMINAL_HANDLE_CLASS : undefined}
              style={handleStyle(theme, option.nextNodeId === null ? "terminal" : "source")}
              aria-label={option.nextNodeId === null ? "ends the adventure" : undefined}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/** React Flow's node-type registry. Module scope, so its identity never changes. */
export const adventureNodeTypes = { decision: DecisionNode } as const;
