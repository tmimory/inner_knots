import { decisionStyleFor } from "@/lib/domain/enums";
import type { Character } from "@/lib/domain/character";
import type { ScarceAllocationSummary } from "@/lib/domain/scarce-allocation";
import type { ScarceAllocationPlan } from "@/lib/engine/setup";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import { characterIterationPath, type PuzzleRunner, type RunnerContext } from "@/lib/engine/types";

import { buildScarceAllocationQuantityPrompt, buildScarceAllocationStrategyPrompt, parseRangeChoice, partitionIntegerRange } from "./prompt";
import { emptySummary, reduce, type ScarceAllocationDecisionEvent, type ScarceAllocationEventData } from "./summary";


function stepPath(characterId: string, iteration: number, key: string) {
  return [...characterIterationPath(characterId, iteration), { key, name: "node" as const, characterId, iteration, nodeId: key }];
}

function snapshot(allocations: readonly { customerId: string; quantity: number }[]) {
  return allocations.map((allocation) => ({ ...allocation }));
}

export async function* allocationEvents(plan: ScarceAllocationPlan, character: Character, iteration: number, ctx: RunnerContext): AsyncGenerator<ScarceAllocationDecisionEvent> {
  const style = decisionStyleFor(character.provider, character.outputMode);
  const startedAt = new Date().toISOString();
  if (ctx.signal.aborted) return;
  const strategy = await collectDecision({ character, prompt: await buildScarceAllocationStrategyPrompt(plan.config, style), signal: ctx.signal });
  if (strategy.error || !strategy.record || !["allocate", "raise-prices"].includes(strategy.record.choice)) {
    const error = strategy.error ?? "The model returned an invalid allocation strategy.";
    yield { path: stepPath(character.id, iteration, "strategy"), calls: strategy.calls, error, startedAt, endedAt: new Date().toISOString(), progress: 1, data: { characterId: character.id, iteration, allocations: [], allocatedQuantity: 0, unallocatedQuantity: plan.config.availableQuantity, complete: false, error } };
    return;
  }

  if (strategy.record.choice === "raise-prices") {
    yield { path: stepPath(character.id, iteration, "strategy"), calls: strategy.calls, decision: strategy.record, startedAt, endedAt: new Date().toISOString(), progress: 1, data: { characterId: character.id, iteration, strategy: "raise-prices", allocations: [], allocatedQuantity: 0, unallocatedQuantity: plan.config.availableQuantity, complete: true, latencyMs: strategy.record.latencyMs } };
    return;
  }

  const allocations: { customerId: string; quantity: number }[] = [];
  let remaining = plan.config.availableQuantity;
  let latencyMs = strategy.record.latencyMs;
  yield { path: stepPath(character.id, iteration, "strategy"), calls: strategy.calls, decision: strategy.record, startedAt, endedAt: new Date().toISOString(), progress: 0, data: { characterId: character.id, iteration, strategy: "allocate", allocations: snapshot(allocations), allocatedQuantity: 0, unallocatedQuantity: remaining, complete: false, latencyMs } };
  for (const [customerIndex, customer] of plan.config.customers.entries()) {
    if (ctx.signal.aborted) return;
    const laterDemand = plan.config.customers.slice(customerIndex + 1)
      .reduce((sum, later) => sum + later.orderedQuantity, 0);
    // Every feasible full-stock allocation remains reachable. The lower bound
    // only prevents leaving more stock than later orders can absorb.
    let range = {
      min: Math.max(0, remaining - laterDemand),
      max: Math.min(customer.orderedQuantity, remaining),
    };
    const forcedQuantity = range.min === range.max;
    let step = 0;
    while (range.min < range.max) {
      if (ctx.signal.aborted) return;
      step += 1;
      const ranges = partitionIntegerRange(range.min, range.max);
      const prompt = await buildScarceAllocationQuantityPrompt({ config: plan.config, customer, allocated: allocations, remaining, ranges, decisionStyle: style });
      const outcome = await collectDecision({ character, prompt, signal: ctx.signal });
      if (outcome.error || !outcome.record) {
        const error = outcome.error ?? `No quantity was returned for ${customer.name}.`;
        yield { path: stepPath(character.id, iteration, `quantity-${customer.id}-${step}`), calls: outcome.calls, error, startedAt: outcome.startedAt, endedAt: outcome.endedAt, progress: 1, data: { characterId: character.id, iteration, strategy: "allocate", allocations: snapshot(allocations), allocatedQuantity: plan.config.availableQuantity - remaining, unallocatedQuantity: remaining, complete: false, latencyMs, error } };
        return;
      }
      latencyMs += outcome.record.latencyMs;
      const selected = parseRangeChoice(outcome.record.choice, ranges);
      if (!selected) {
        const error = `The model returned an invalid quantity range for ${customer.name}.`;
        yield { path: stepPath(character.id, iteration, `quantity-${customer.id}-${step}`), calls: outcome.calls, decision: outcome.record, error, startedAt: outcome.startedAt, endedAt: outcome.endedAt, progress: 1, data: { characterId: character.id, iteration, strategy: "allocate", allocations: snapshot(allocations), allocatedQuantity: plan.config.availableQuantity - remaining, unallocatedQuantity: remaining, complete: false, latencyMs, error } };
        return;
      }
      range = selected;
      if (range.min === range.max) {
        allocations.push({ customerId: customer.id, quantity: range.min });
        remaining -= range.min;
      }
      yield { path: stepPath(character.id, iteration, `quantity-${customer.id}-${step}`), calls: outcome.calls, decision: outcome.record, startedAt: outcome.startedAt, endedAt: outcome.endedAt, progress: 0, data: { characterId: character.id, iteration, strategy: "allocate", allocations: snapshot(allocations), allocatedQuantity: plan.config.availableQuantity - remaining, unallocatedQuantity: remaining, complete: false, latencyMs } };
    }
    if (forcedQuantity) {
      allocations.push({ customerId: customer.id, quantity: range.min });
      remaining -= range.min;
    }
  }
  yield { path: stepPath(character.id, iteration, "complete"), calls: [], startedAt, endedAt: new Date().toISOString(), progress: 1, data: { characterId: character.id, iteration, strategy: "allocate", allocations: snapshot(allocations), allocatedQuantity: plan.config.availableQuantity - remaining, unallocatedQuantity: remaining, complete: true, latencyMs } };
}

export function createScarceAllocationRunner(plan: ScarceAllocationPlan): PuzzleRunner<ScarceAllocationEventData, ScarceAllocationSummary> {
  return { total: plan.total, emptySummary: () => emptySummary(plan.config), reduce, async *decisions(ctx) {
    const sources: Source<ScarceAllocationDecisionEvent>[] = [];
    for (const { character, runs } of plan.roster) for (let iteration = 1; iteration <= runs; iteration += 1) sources.push(async function* () { yield* allocationEvents(plan, character, iteration, ctx); });
    yield* mergePool(sources, ctx.concurrency, ctx.signal);
  } };
}
