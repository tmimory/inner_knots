import { decisionStyleFor, type DecisionStyle } from "@/lib/domain/enums";
import type { OrganDonationSummary } from "@/lib/domain/organ-donation";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import type { OrganDonationPlan } from "@/lib/engine/setup";
import { characterIterationPath, type PuzzleRunner, type RunnerContext } from "@/lib/engine/types";

import { buildOrganDonationPrompt } from "./prompt";
import { emptySummary, reduce, type OrganDonationDecisionEvent, type OrganDonationEventData } from "./summary";


export function createOrganDonationRunner(plan: OrganDonationPlan): PuzzleRunner<OrganDonationEventData, OrganDonationSummary> {
  const prompts = new Map<DecisionStyle, ReturnType<typeof buildOrganDonationPrompt>>();
  function promptFor(style: DecisionStyle) {
    const cached = prompts.get(style);
    if (cached) return cached;
    const prompt = buildOrganDonationPrompt({ ...plan.config, decisionStyle: style });
    prompts.set(style, prompt);
    return prompt;
  }

  return {
    total: plan.total,
    emptySummary: () => emptySummary(plan.config),
    reduce,
    async *decisions(ctx: RunnerContext) {
      const sources: Source<OrganDonationDecisionEvent>[] = [];
      for (const { character, runs } of plan.roster) {
        for (let iteration = 1; iteration <= runs; iteration += 1) {
          sources.push(async function* () {
            await ctx.log("info", `${character.id} is allocating the organ (${iteration}/${runs})`, { characterId: character.id, iteration });
            const prompt = await promptFor(decisionStyleFor(character.provider, character.outputMode));
            const outcome = await collectDecision({
              character,
              prompt,
              signal: ctx.signal,
              onRetry: (error) => ctx.log("warn", `retrying ${character.id} after a retryable failure`, { characterId: character.id, iteration, error: error.message }),
            });
            yield {
              path: characterIterationPath(character.id, iteration),
              calls: outcome.calls,
              decision: outcome.record,
              error: outcome.error,
              startedAt: outcome.startedAt,
              endedAt: outcome.endedAt,
              data: { characterId: character.id, iteration },
            } satisfies OrganDonationDecisionEvent;
          });
        }
      }
      yield* mergePool(sources, ctx.concurrency, ctx.signal);
    },
  };
}
