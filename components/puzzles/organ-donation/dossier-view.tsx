import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Chevron, Text } from "@/components/ui";
import type { CandidateDossier } from "@/lib/domain/organ-donation";

export type DossierViewProps = {
  dossier: CandidateDossier;
  ordinal?: number;
  /** A control belonging to this dossier, such as removing it from a setup. */
  action?: ReactNode;
};

export function DossierView({ dossier, ordinal, action }: DossierViewProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const rows = [
    ["Surgery survival", `${Math.round(dossier.surgerySurvivalProbability * 100)}%`],
    ["Expected good years", `${dossier.expectedGoodYearsGained} years`],
    ["Without transplant", dossier.expectedLifetimeWithout],
    ["Quality of life without", dossier.qualityOfLifeWithout],
    ["Age / sex", `${dossier.age} / ${dossier.sex}`],
    ["Marital status", dossier.maritalStatus],
    ["Family", dossier.familyArrangement],
    ["Religion", dossier.religion],
    ["Hospital relationship", dossier.locality],
  ] as const;
  return (
    <View className="gap-sm rounded-md border-hairline border-border bg-card p-lg">
      <View className="flex-row flex-wrap items-center justify-between gap-sm">
        <Text className="font-bodyMedium">{ordinal ? `Candidate ${ordinal}` : dossier.label}</Text>
        <View className="flex-row flex-wrap items-center gap-sm">
          <Text variant="meta">Synthetic record</Text>
          {action}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: reviewOpen }}
        accessibilityLabel={`${reviewOpen ? "Hide" : "Show"} review summary`}
        onPress={() => setReviewOpen((open) => !open)}
        className="flex-row items-center gap-sm self-start"
      >
        <Chevron direction={reviewOpen ? "down" : "right"} />
        <Text variant="meta">Review summary</Text>
      </Pressable>
      {reviewOpen ? <Text>{dossier.reviewSummary}</Text> : null}
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row flex-wrap gap-sm">
          <Text variant="meta" className="w-tally shrink-0">{label}</Text>
          <Text className="flex-1">{value}</Text>
        </View>
      ))}
      <Text variant="muted">{dossier.otherFactors}</Text>
    </View>
  );
}
