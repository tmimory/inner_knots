/**
 * One decision card on the canvas: a parchment node with a context, the question
 * it asks, and one row per option.
 *
 * Every option row carries its own source handle, whose id *is* the option id —
 * that is what lets a connection say which option leads where. A row with no
 * outgoing edge is an ending, and says so. In the outcome view the same card
 * shows how many walks came through it and how they split.
 *
 * The card holds itself to two type sizes: the context and the option rows in
 * the metadata size, the question in body. Where a walk begins is said by the
 * card's rubric left edge (see `nodeCardStyle`) rather than by a third one.
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
      style={nodeCardStyle(theme, { selected, onPath, unvisited, isStart })}
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
        {counted ? (
          <View className="flex-row items-center gap-sm">
            <Badge variant={unvisited ? "muted" : "secondary"}>
              <Text>{`${hits} · ${formatPercent(share ?? 0)}`}</Text>
            </Badge>
          </View>
        ) : null}

        {/*
          Two sizes on a card and no more: the question one step up, the setup and
          the option rows at body size. Nothing on a card is set at the caption
          step, because a card is drawn at whatever zoom the graph fits at and a
          caption scaled down is no longer type.
        */}
        <Text variant="muted" className="text-base" numberOfLines={CONTEXT_LINES}>
          {node.context.trim() === "" ? "No context yet" : node.context}
        </Text>
        <Text className="font-bodySemiBold text-lg" numberOfLines={DECISION_LINES}>
          {node.decision.trim() === "" ? "No decision yet" : node.decision}
        </Text>
      </View>

      <View className="border-t-hairline border-border">
        {node.options.length === 0 ? (
          <View
            className="justify-center px-md"
            style={{ height: ADVENTURE_LAYOUT.nodeOptionHeight }}
          >
            <Text variant="muted" className="text-base">
              No options yet
            </Text>
          </View>
        ) : null}

        {node.options.map((option) => (
          <View
            key={option.id}
            className="flex-row items-center gap-xs px-md"
            style={{ height: ADVENTURE_LAYOUT.nodeOptionHeight }}
          >
            <Text className="flex-1 text-base" numberOfLines={1}>
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
