/**
 * The trolley runner: one decision per character per iteration, all independent.
 *
 * The tracks are resolved once (by `prepareRun`) and the prompt is built once per
 * output mode, because neither varies between iterations — what varies is the
 * model's answer, which is the whole point of asking it more than once. Every
 * decision is its own source, so the pool can keep `RUN_CONCURRENCY` of them in
 * flight and a slow character does not hold up a fast one.
 */
import type { OutputMode } from "@/lib/domain/enums";
import type { TrolleySummary } from "@/lib/domain/summary";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import type { TrolleyPlan } from "@/lib/engine/setup";
import type { PuzzleRunner, RunnerContext } from "@/lib/engine/types";

import { buildTrolleyPrompt } from "./prompt";
import { emptySummary, reduce, type TrolleyDecisionEvent, type TrolleyEventData } from "./summary";

/** Builds the runner for one prepared trolley run. */
export function createTrolleyRunner(plan: TrolleyPlan): PuzzleRunner<TrolleyEventData, TrolleySummary> {
  const prompts = new Map<OutputMode, ReturnType<typeof buildTrolleyPrompt>>();

  /** One prompt per output mode, shared by every character that uses it. */
  function promptFor(outputMode: OutputMode) {
    const existing = prompts.get(outputMode);
    if (existing) return existing;
    const built = buildTrolleyPrompt({
      variant: plan.config.variant,
      track1: plan.track1,
      track2: plan.track2,
      outputMode,
    });
    prompts.set(outputMode, built);
    return built;
  }

  return {
    total: plan.total,
    emptySummary: () => emptySummary(plan.config),
    reduce,

    async *decisions(ctx: RunnerContext) {
      const sources: Source<TrolleyDecisionEvent>[] = [];

      for (const { character, runs } of plan.roster) {
        for (let iteration = 1; iteration <= runs; iteration += 1) {
          sources.push(async function* () {
            await ctx.log("info", `${character.id} is deciding (${iteration}/${runs})`, {
              characterId: character.id,
              iteration,
            });

            const prompt = await promptFor(character.outputMode);
            const outcome = await collectDecision({
              character,
              prompt,
              signal: ctx.signal,
              onRetry: (error) =>
                ctx.log("warn", `retrying ${character.id} after a retryable failure`, {
                  characterId: character.id,
                  iteration,
                  error: error.message,
                }),
            });

            yield {
              path: [
                { key: character.id, name: "character", characterId: character.id },
                {
                  key: String(iteration),
                  name: "iteration",
                  characterId: character.id,
                  iteration,
                },
              ],
              calls: outcome.calls,
              decision: outcome.record,
              error: outcome.error,
              startedAt: outcome.startedAt,
              endedAt: outcome.endedAt,
              data: { characterId: character.id, iteration },
            } satisfies TrolleyDecisionEvent;
          });
        }
      }

      yield* mergePool(sources, ctx.concurrency, ctx.signal);
    },
  };
}
