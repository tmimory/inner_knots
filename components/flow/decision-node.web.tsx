/**
 * One decision card on the canvas: a parchment node with a context, the question
 * it asks, and one row per option.
 *
 * Every option row carries its own source handle, whose id *is* the option id —
 * that is what lets a connection say which option leads where. A row with no
 * outgoing edge is an ending, and says so. In the outcome view the same card
 * shows how many walks came through it and how they split.
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { View } from "react-native";

import { Badge, Text } from "@/components/ui";
import { formatPercent } from "@/lib/format";
import { ADVENTURE_LAYOUT } from "@/lib/puzzles/adventure/layout";
import { useTheme } from "@/theme";

import { handleStyle, nodeCardStyle } from "./flow-style";
import type { AdventureFlowNode } from "./use-adventure-graph";
import { NODE_TARGET_HANDLE } from "./types";

/** Lines of context and of decision text a card shows before it trails off. */
const CONTEXT_LINES = 2;
const DECISION_LINES = 2;

export function DecisionNode({ data, selected }: NodeProps<AdventureFlowNode>) {
  const theme = useTheme();
  const { node, isStart, hits, share, optionHits, onPath, unvisited } = data;
  const counted = hits !== undefined;

  return (
    // No `overflow-hidden`: the option handles sit outside the card border.
    <View style={nodeCardStyle(theme, { selected, onPath, unvisited })}>
      <Handle
        type="target"
        id={NODE_TARGET_HANDLE}
        position={Position.Left}
        style={handleStyle(theme, "target")}
      />

      <View className="gap-xs px-md pb-sm pt-md">
        <View className="flex-row items-center gap-xs">
          {isStart ? (
            <Badge variant="accent">
              <Text>start</Text>
            </Badge>
          ) : null}
          {counted ? (
            <Badge variant={unvisited ? "muted" : "secondary"}>
              <Text>{`${hits} · ${formatPercent(share ?? 0)}`}</Text>
            </Badge>
          ) : null}
        </View>

        <Text variant="muted" numberOfLines={CONTEXT_LINES}>
          {node.context.trim() === "" ? "No context yet" : node.context}
        </Text>
        <Text className="font-display text-sm" numberOfLines={DECISION_LINES}>
          {node.decision.trim() === "" ? "No decision yet" : node.decision}
        </Text>
      </View>

      <View className="border-t-hairline border-border">
        {node.options.length === 0 ? (
          <View
            className="justify-center px-md"
            style={{ height: ADVENTURE_LAYOUT.nodeOptionHeight }}
          >
            <Text variant="muted" className="text-xs">
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
            <Text className="flex-1 text-sm" numberOfLines={1}>
              {option.label}
            </Text>
            {counted ? (
              <Text variant="muted" className="font-mono text-xs">
                {optionHits?.[option.id] ?? 0}
              </Text>
            ) : null}
            {option.nextNodeId === null ? (
              <Badge variant="outline">
                <Text>end</Text>
              </Badge>
            ) : null}
            <Handle
              type="source"
              id={option.id}
              position={Position.Right}
              style={handleStyle(theme, "source")}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/** React Flow's node-type registry. Module scope, so its identity never changes. */
export const adventureNodeTypes = { decision: DecisionNode } as const;
