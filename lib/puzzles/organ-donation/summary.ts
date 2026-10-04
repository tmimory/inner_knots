import type { OrganDonationConfig, OrganDonationSummary } from "@/lib/domain/organ-donation";
import type { DecisionEvent } from "@/lib/engine/types";

export type OrganDonationEventData = { characterId: string; iteration: number };
export type OrganDonationDecisionEvent = DecisionEvent<OrganDonationEventData>;

export function emptySummary(config: Pick<OrganDonationConfig, "candidates">): OrganDonationSummary {
  return {
    kind: "organ-donation",
    decisions: [],
    perCandidate: Object.fromEntries(config.candidates.map((candidate) => [candidate.id, 0])),
    errors: 0,
  };
}

export function reduce(summary: OrganDonationSummary, event: OrganDonationDecisionEvent): OrganDonationSummary {
  const valid = event.decision?.choice && event.decision.choice in summary.perCandidate
    ? event.decision.choice
    : undefined;
  const failed = event.error !== undefined || valid === undefined;
  return {
    ...summary,
    decisions: [...summary.decisions, {
      ...event.data,
      candidateId: valid,
      weights: event.decision?.weights,
      confidence: event.decision?.confidence,
      latencyMs: event.decision?.latencyMs,
      error: event.error ?? (valid === undefined ? "Provider returned an unknown candidate." : undefined),
    }],
    perCandidate: valid
      ? { ...summary.perCandidate, [valid]: (summary.perCandidate[valid] ?? 0) + 1 }
      : summary.perCandidate,
    errors: summary.errors + (failed ? 1 : 0),
  };
}
