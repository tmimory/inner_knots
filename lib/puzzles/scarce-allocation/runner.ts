import { decisionStyleFor } from "@/lib/domain/enums";
import type { Character } from "@/lib/domain/character";
import { validateAllocation, type ScarceAllocationSummary } from "@/lib/domain/scarce-allocation";
import type { ScarceAllocationPlan } from "@/lib/engine/setup";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import { characterIterationPath, type PuzzleRunner, type RunnerContext } from "@/lib/engine/types";
import { buildScarceAllocationPrompt } from "./prompt";
import { emptySummary, reduce, type ScarceAllocationDecisionEvent, type ScarceAllocationEventData } from "./summary";

export async function* allocationEvents(plan: ScarceAllocationPlan, character: Character, iteration: number, ctx: RunnerContext): AsyncGenerator<ScarceAllocationDecisionEvent> {
  if (ctx.signal.aborted) return;
  const { config } = plan;
  const path = [...characterIterationPath(character.id, iteration), { key: "allocation", name: "node" as const, characterId: character.id, iteration, nodeId: "allocation" }];
  const base: ScarceAllocationEventData = { characterId: character.id, iteration, allocations: [], allocatedQuantity: 0, unallocatedQuantity: config.availableQuantity, complete: false };
  if (config.mode === "free" && character.provider === "typesafe") {
    const error = "TypeSafe is unavailable for free allocation.";
    const stamp = new Date().toISOString();
    yield { path, calls: [], startedAt: stamp, endedAt: stamp, progress: 1, error, data: { ...base, error } };
    return;
  }
  const outcome = await collectDecision({ character, prompt: await buildScarceAllocationPrompt(config, decisionStyleFor(character.provider, character.outputMode)), signal: ctx.signal });
  const { record, calls, startedAt, endedAt } = outcome;
  let error = outcome.error;
  let data = base;
  if (record && !error) {
    if (record.choice === "raise-prices") {
      if (config.mode === "free" && record.allocations?.length) error = "Raise prices must return an empty allocation.";
      else data = { ...base, strategy: "raise-prices", complete: true, latencyMs: record.latencyMs };
    } else {
      const selected = config.mode === "plans" ? config.plans.find((option) => `plan:${option.id}` === record.choice) : undefined;
      const allocations = selected?.allocations ?? (config.mode === "free" && record.choice === "allocate" ? record.allocations : undefined);
      error = allocations ? validateAllocation(allocations, config) ?? undefined : "The model returned an invalid allocation decision.";
      if (!error && allocations) data = {
        ...base, strategy: "allocate", allocations: allocations.map((entry) => ({ ...entry })),
        allocatedQuantity: config.availableQuantity, unallocatedQuantity: 0, complete: true, latencyMs: record.latencyMs,
        ...(selected ? { selectedPlanId: selected.id, selectedPlanName: selected.name } : {}),
      };
    }
  } else error ??= "No allocation decision was returned.";
  yield { path, calls, decision: record, startedAt, endedAt, progress: 1, ...(error ? { error } : {}), data: error ? { ...base, error } : data };
}

export function createScarceAllocationRunner(plan: ScarceAllocationPlan): PuzzleRunner<ScarceAllocationEventData, ScarceAllocationSummary> {
  return { total: plan.total, emptySummary: () => emptySummary(plan.config), reduce, async *decisions(ctx) {
    const sources: Source<ScarceAllocationDecisionEvent>[] = [];
    for (const { character, runs } of plan.roster) for (let iteration = 1; iteration <= runs; iteration += 1) sources.push(async function* () { yield* allocationEvents(plan, character, iteration, ctx); });
    yield* mergePool(sources, ctx.concurrency, ctx.signal);
  } };
}
