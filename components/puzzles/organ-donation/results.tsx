import { View } from "react-native";

import { Text } from "@/components/ui";
import type { CandidateDossier, OrganDonationSummary } from "@/lib/domain/organ-donation";

export function OrganDonationResults({ summary, candidates }: { summary: OrganDonationSummary; candidates: readonly CandidateDossier[] }) {
  return (
    <View className="gap-md">
      {candidates.map((candidate, index) => (
        <View key={candidate.id} className="flex-row items-baseline justify-between gap-lg border-b-hairline border-border pb-sm">
          <Text>{`Candidate ${index + 1}`}</Text>
          <Text className="font-bodyMedium">{summary.perCandidate[candidate.id] ?? 0}</Text>
        </View>
      ))}
      {summary.errors > 0 ? <Text className="text-destructive">{summary.errors} failed decisions</Text> : null}
    </View>
  );
}
