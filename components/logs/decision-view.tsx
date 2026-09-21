import { View } from "react-native";

import { Badge, Progress, Text } from "@/components/ui";
import type { DecisionRecord } from "@/lib/domain/span";
import { formatDuration, formatPercent } from "@/lib/format";

import { FieldCode } from "./field";

/**
 * Confidence is reported by TypeSafe and by nothing else, and it is not part of
 * the stored `DecisionRecord` shape, so it is read defensively rather than
 * assumed away.
 */
function readNumber(source: object, key: string): number | undefined {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** One option's share of the probability mass. */
function WeightRow({ option, weight }: { option: string; weight: number }) {
  return (
    <View className="flex-row items-center gap-sm">
      <Text variant="code" className="w-4xl text-xs" numberOfLines={1}>
        {option}
      </Text>
      <Progress className="flex-1" value={weight * 100} indicatorClassName="bg-accent" />
      <Text variant="muted" className="w-3xl text-right font-mono text-xs">
        {formatPercent(weight, 1)}
      </Text>
    </View>
  );
}

/**
 * The normalized answer: which option was chosen, how the probability mass fell
 * when the provider reports one, and what the call cost.
 */
export function DecisionView({ decision }: { decision: DecisionRecord }) {
  const weights = Object.entries(decision.weights ?? {}).sort((a, b) => b[1] - a[1]);
  const confidence = readNumber(decision, "confidence");

  return (
    <View className="gap-md">
      <View className="flex-row flex-wrap items-center gap-md">
        <Badge variant="secondary">
          <Text>{decision.choice}</Text>
        </Badge>
        {confidence === undefined ? null : (
          <Text variant="muted" className="text-xs">
            confidence {formatPercent(confidence, 1)}
          </Text>
        )}
        <Text variant="muted" className="text-xs">
          {formatDuration(decision.latencyMs)}
        </Text>
        {decision.usage ? (
          <Text variant="muted" className="text-xs">
            {decision.usage.inputTokens} in · {decision.usage.outputTokens} out
          </Text>
        ) : null}
      </View>

      {weights.length > 0 ? (
        <View className="gap-xs">
          <Text variant="muted" className="text-xs">
            weights
          </Text>
          {weights.map(([option, weight]) => (
            <WeightRow key={option} option={option} weight={weight} />
          ))}
        </View>
      ) : null}

      {decision.rationale ? <FieldCode label="rationale" value={decision.rationale} /> : null}
    </View>
  );
}
