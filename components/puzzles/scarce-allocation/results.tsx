import { View } from "react-native";

import { allocationRows, allocationStatus } from "@/lib/puzzles/scarce-allocation/presentation";
import { ResultsFooter } from "@/components/puzzles/results-footer";
import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import { characterDisplayName } from "@/lib/domain/character";
import type { ScarceAllocationConfig, ScarceAllocationSummary } from "@/lib/domain/scarce-allocation";

export function ScarceAllocationResults({ summary, config, characters, runId }: {
  summary: ScarceAllocationSummary | undefined;
  config: ScarceAllocationConfig;
  characters: ReadonlyMap<string, Character>;
  runId?: string | null;
}) {
  if (!summary?.decisions.length) return null;

  return (
    <View className="gap-lg">
      {summary.decisions.map((decision) => (
        <View key={`${decision.characterId}-${decision.iteration}`} className="gap-md rounded-lg border-hairline border-border bg-card p-lg">
          <Text variant="h4">{characters.get(decision.characterId) ? characterDisplayName(characters.get(decision.characterId)!) : decision.characterId} · run {decision.iteration}</Text>
          <Text variant="small" className={decision.error ? "text-destructive" : "text-muted-foreground"}>{allocationStatus(decision)}</Text>
          {allocationRows(decision, config).map((allocation) => (
            <View key={allocation.id} className="flex-row justify-between gap-lg">
              <Text>{allocation.name}</Text><Text className="tabular">{allocation.quantity} units</Text>
            </View>
          ))}
        </View>
      ))}
      <ResultsFooter note={`${summary.decisions.filter((decision) => decision.complete).length} completed allocation decision${summary.decisions.filter((decision) => decision.complete).length === 1 ? "" : "s"} recorded`} runId={runId} />
    </View>
  );
}
