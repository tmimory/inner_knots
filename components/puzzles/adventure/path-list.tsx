import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Badge, Separator, Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { Adventure } from "@/lib/domain/adventure";
import type { AdventurePathSummary, AdventureStepSummary } from "@/lib/domain/summary";
import { formatDuration, formatPercent, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How much of a node's question or an outcome a row shows before it trails off. */
const SUMMARY_CHARS = 90;

export type PathListProps = {
  adventure: Adventure;
  /** Every walk recorded so far, in the order the engine finished them. */
  paths: readonly AdventurePathSummary[];
  characters: readonly Character[];
  /** The walk drawn over the canvas, if the reader has picked one. */
  selected: AdventurePathSummary | undefined;
  onSelect: (path: AdventurePathSummary | undefined) => void;
};

/** A walk's identity: one character's nth run. */
export function pathKey(path: Pick<AdventurePathSummary, "characterId" | "iteration">): string {
  return `${path.characterId}#${path.iteration}`;
}

/** How a walk ended, in one word. */
function outcomeBadge(path: AdventurePathSummary): { variant: "secondary" | "destructive" | "outline"; label: string } {
  if (path.steps.some((step) => step.error !== undefined)) {
    return { variant: "destructive", label: "error" };
  }
  return path.terminal
    ? { variant: "secondary", label: "ended" }
    : { variant: "outline", label: "stopped" };
}

/** One node of a walk: what was asked, what was taken, and how surely. */
function Step({
  step,
  index,
  adventure,
}: {
  step: AdventureStepSummary;
  index: number;
  adventure: Adventure;
}) {
  const node = adventure.nodes.find((candidate) => candidate.id === step.nodeId);
  const option = node?.options.find((candidate) => candidate.id === step.optionId);
  const question = node?.decision.trim();
  const weights = step.weights ? Object.entries(step.weights) : [];

  return (
    <View className="gap-xxs border-l-thick border-border pl-md">
      <View className="flex-row items-center gap-sm">
        <Text variant="muted" className="font-mono text-xs">
          {index + 1}
        </Text>
        <Text variant="small" className="flex-1">
          {question && question.length > 0 ? truncate(question, SUMMARY_CHARS) : step.nodeId}
        </Text>
        {step.latencyMs !== undefined ? (
          <Text variant="muted" className="font-mono text-xs">
            {formatDuration(step.latencyMs)}
          </Text>
        ) : null}
      </View>

      {step.error !== undefined ? (
        <Text variant="small" className="text-destructive">
          {step.error}
        </Text>
      ) : (
        <Text variant="small" className="font-display">
          {option ? `→ ${option.label}` : "→ no option recorded"}
        </Text>
      )}

      {weights.length > 0 ? (
        <View className="flex-row flex-wrap gap-xs">
          {weights.map(([optionId, weight]) => {
            const label = node?.options.find((candidate) => candidate.id === optionId)?.label;
            return (
              <Badge key={optionId} variant="muted">
                <Text>{`${label ?? optionId} ${formatPercent(weight)}`}</Text>
              </Badge>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Every walk the run recorded, and the one the reader is looking at.
 *
 * The summary carries each walk in the order it was taken, so highlighting a
 * path on the canvas is a lookup rather than a reconstruction — which is why
 * this list hands whole `AdventurePathSummary` objects back rather than ids.
 */
export function PathList({ adventure, paths, characters, selected, onSelect }: PathListProps) {
  const byId = new Map(characters.map((character) => [character.id, character]));

  if (paths.length === 0) {
    return <Text variant="muted">No walk has been taken yet.</Text>;
  }

  return (
    <View className="gap-xs">
      {paths.map((path) => {
        const character = byId.get(path.characterId);
        const badge = outcomeBadge(path);
        const isSelected = selected !== undefined && pathKey(selected) === pathKey(path);

        return (
          <View key={pathKey(path)} className="gap-sm">
            <Pressable
              role="button"
              accessibilityLabel={`Walk ${path.iteration} by ${path.characterId}`}
              onPress={() => onSelect(isSelected ? undefined : path)}
              className={cn(
                "flex-row items-center gap-md rounded-md p-sm transition-colors duration-fast",
                isSelected ? "bg-muted" : "web:hover:bg-muted",
              )}
            >
              <Avatar
                shape={character?.avatar.shape ?? ""}
                color={character?.avatar.color ?? ""}
                size="sm"
                ring={isSelected}
              />
              <Text className="flex-1" numberOfLines={1}>
                {character ? characterDisplayName(character) : path.characterId}
              </Text>
              <Text variant="muted" className="font-mono text-xs">
                {`#${path.iteration}`}
              </Text>
              <Text variant="muted">
                {`${path.steps.length} ${path.steps.length === 1 ? "step" : "steps"}`}
              </Text>
              <Badge variant={badge.variant}>
                <Text>{badge.label}</Text>
              </Badge>
            </Pressable>

            {isSelected ? (
              <View className="gap-sm pb-sm pl-xl">
                {path.steps.map((step, index) => (
                  <Step
                    key={`${step.nodeId}-${index}`}
                    step={step}
                    index={index}
                    adventure={adventure}
                  />
                ))}
              </View>
            ) : null}

            <Separator />
          </View>
        );
      })}
    </View>
  );
}
