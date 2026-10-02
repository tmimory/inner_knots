import { useState } from "react";
import { View } from "react-native";

import { Button, Field, Input, Segmented, Text, Textarea } from "@/components/ui";
import { ORGAN_DONATION_LIMITS, candidateDossierSchema, type CandidateDossier } from "@/lib/domain/organ-donation";

export type DossierDraft = Omit<CandidateDossier, "synthetic">;

export const EMPTY_DOSSIER: DossierDraft = {
  id: "", label: "Custom anonymous dossier", reviewSummary: "",
  surgerySurvivalProbability: 0.9, expectedGoodYearsGained: 20,
  expectedLifetimeWithout: "", qualityOfLifeWithout: "", age: 40, sex: "female",
  maritalStatus: "Not stated", familyArrangement: "Not stated", religion: "Not stated",
  locality: "local", otherFactors: "",
};

export function DossierEditor({ value, onChange, onSave, onCancel }: {
  value: DossierDraft; onChange: (value: DossierDraft) => void; onSave: (value: CandidateDossier) => void; onCancel: () => void;
}) {
  const [generatedId] = useState(() => `custom-${Date.now()}`);
  const patch = (changes: Partial<DossierDraft>) => onChange({ ...value, ...changes });
  const parsed = candidateDossierSchema.safeParse({ ...value, id: value.id || generatedId, synthetic: true });
  const number = (text: string, fallback: number) => Number.isFinite(Number(text)) ? Number(text) : fallback;
  return (
    <View className="gap-lg rounded-md border-hairline border-border bg-card p-lg">
      <Text variant="h4">New synthetic dossier</Text>
      <Field label="Review summary"><Textarea accessibilityLabel="Review summary" value={value.reviewSummary} maxLength={ORGAN_DONATION_LIMITS.summary} onChangeText={(reviewSummary) => patch({ reviewSummary })} /></Field>
      <View className="flex-row flex-wrap gap-lg">
        <Field label="Surgery survival (0–100%)" className="min-w-field flex-1"><Input keyboardType="decimal-pad" accessibilityLabel="Surgery survival percent" value={String(Math.round(value.surgerySurvivalProbability * 100))} onChangeText={(text) => patch({ surgerySurvivalProbability: number(text, 0) / 100 })} /></Field>
        <Field label="Expected good years" className="min-w-field flex-1"><Input keyboardType="decimal-pad" accessibilityLabel="Expected good years" value={String(value.expectedGoodYearsGained)} onChangeText={(text) => patch({ expectedGoodYearsGained: number(text, 0) })} /></Field>
        <Field label="Age" className="min-w-field flex-1"><Input keyboardType="number-pad" accessibilityLabel="Age" value={String(value.age)} onChangeText={(text) => patch({ age: number(text, 0) })} /></Field>
      </View>
      <Field label="Expected lifetime without transplant"><Input accessibilityLabel="Expected lifetime without transplant" value={value.expectedLifetimeWithout} maxLength={ORGAN_DONATION_LIMITS.shortText} onChangeText={(expectedLifetimeWithout) => patch({ expectedLifetimeWithout })} /></Field>
      <Field label="Quality of life without transplant"><Input accessibilityLabel="Quality of life without transplant" value={value.qualityOfLifeWithout} maxLength={ORGAN_DONATION_LIMITS.shortText} onChangeText={(qualityOfLifeWithout) => patch({ qualityOfLifeWithout })} /></Field>
      <Field label="Sex"><Segmented label="Sex" value={value.sex} onChange={(sex) => patch({ sex })} options={[{value:"female",label:"Female"},{value:"male",label:"Male"},{value:"intersex",label:"Intersex"}]} /></Field>
      <Field label="Marital status"><Input accessibilityLabel="Marital status" value={value.maritalStatus} maxLength={ORGAN_DONATION_LIMITS.shortText} onChangeText={(maritalStatus) => patch({ maritalStatus })} /></Field>
      <Field label="Family arrangement"><Input accessibilityLabel="Family arrangement" value={value.familyArrangement} maxLength={ORGAN_DONATION_LIMITS.shortText} onChangeText={(familyArrangement) => patch({ familyArrangement })} /></Field>
      <Field label="Religion"><Input accessibilityLabel="Religion" value={value.religion} maxLength={ORGAN_DONATION_LIMITS.shortText} onChangeText={(religion) => patch({ religion })} /></Field>
      <Field label="Relationship to hospital"><Segmented label="Relationship to hospital" value={value.locality} onChange={(locality) => patch({ locality })} options={[{value:"local",label:"Local"},{value:"regional",label:"Regional"},{value:"international",label:"International"}]} /></Field>
      <Field label="Other reviewed factors"><Textarea accessibilityLabel="Other reviewed factors" value={value.otherFactors} maxLength={ORGAN_DONATION_LIMITS.otherFactors} onChangeText={(otherFactors) => patch({ otherFactors })} /></Field>
      <View className="flex-row justify-end gap-sm"><Button variant="outline" onPress={onCancel}><Text>Cancel</Text></Button><Button disabled={!parsed.success} onPress={() => parsed.success && onSave(parsed.data)}><Text>Save dossier</Text></Button></View>
    </View>
  );
}
