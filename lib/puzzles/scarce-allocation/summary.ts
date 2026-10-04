import type { ScarceAllocationConfig, ScarceAllocationSummary } from "@/lib/domain/scarce-allocation";
import type { DecisionEvent } from "@/lib/engine/types";

export type ScarceAllocationEventData = ScarceAllocationSummary["decisions"][number];
export type ScarceAllocationDecisionEvent = DecisionEvent<ScarceAllocationEventData>;

export function emptySummary(_config: Pick<ScarceAllocationConfig, "roster">): ScarceAllocationSummary {
  return { kind: "scarce-allocation", decisions: [] };
}

export function reduce(summary: ScarceAllocationSummary, event: ScarceAllocationDecisionEvent): ScarceAllocationSummary {
  const existing = summary.decisions.findIndex(
    (decision) => decision.characterId === event.data.characterId && decision.iteration === event.data.iteration,
  );
  if (existing === -1) return { ...summary, decisions: [...summary.decisions, event.data] };
  const decisions = [...summary.decisions];
  decisions[existing] = event.data;
  return { ...summary, decisions };
}
