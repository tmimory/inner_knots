/**
 * The adventure runner: one walk through the graph per character per iteration.
 *
 * A walk is sequential by nature — the next node is whichever option was taken —
 * so a path is one source and the pool runs several paths at once. Each step is
 * one decision; the walk ends when an option leads nowhere (the designed ending),
 * when a decision fails, or when it has taken {@link MAX_STEPS} steps, which is
 * what stops a graph with a loop in it from running forever.
 *
 * Only the last step of a path advances the progress bar, because `progress.total`
 * counts paths: a run of five walks is five units of work however long each walk is.
 */
import type { AdventureNode } from "@/lib/domain/adventure";
import type { AdventureSummary } from "@/lib/domain/summary";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import type { AdventurePlan } from "@/lib/engine/setup";
import { characterIterationPath, type PuzzleRunner, type RunnerContext } from "@/lib/engine/types";

import { buildAdventurePrompt, type AdventureStep } from "./prompt";
import { emptySummary, reduce, type AdventureDecisionEvent, type AdventureEventData } from "./summary";

/** How many nodes one walk may visit before the engine calls it a loop. */
export const MAX_STEPS = 50;

/** Builds the runner for one prepared adventure run. */
export function createAdventureRunner(plan: AdventurePlan): PuzzleRunner<AdventureEventData, AdventureSummary> {
  const nodes = new Map<string, AdventureNode>(plan.adventure.nodes.map((node) => [node.id, node]));

  return {
    total: plan.total,
    emptySummary: () => emptySummary(plan.config),
    reduce,

    async *decisions(ctx: RunnerContext) {
      const sources: Source<AdventureDecisionEvent>[] = [];

      for (const { character, runs } of plan.roster) {
        for (let iteration = 1; iteration <= runs; iteration += 1) {
          sources.push(async function* () {
            await ctx.log("info", `${character.id} is walking the adventure (${iteration}/${runs})`, {
              characterId: character.id,
              iteration,
            });

            const path = characterIterationPath(character.id, iteration);

            const history: AdventureStep[] = [];
            let nodeId: string = plan.adventure.startNodeId;

            for (let step = 1; step <= MAX_STEPS; step += 1) {
              if (ctx.signal.aborted) return;

              const node = nodes.get(nodeId);
              if (!node) return;

              const prompt = await buildAdventurePrompt({
                briefing: plan.adventure.briefing,
                node,
                history,
                amnesia: plan.config.amnesia,
                outputMode: character.outputMode,
              });

              const outcome = await collectDecision({
                character,
                prompt,
                signal: ctx.signal,
                onRetry: (error) =>
                  ctx.log("warn", `retrying ${character.id} after a retryable failure`, {
                    characterId: character.id,
                    iteration,
                    nodeId: node.id,
                    error: error.message,
                  }),
              });

              const option = node.options.find((candidate) => candidate.id === outcome.record?.choice);
              const nextNodeId = option?.nextNodeId ?? null;
              const terminal = option !== undefined && nextNodeId === null;
              const last = option === undefined || nextNodeId === null || step === MAX_STEPS;

              const data: AdventureEventData = {
                characterId: character.id,
                iteration,
                nodeId: node.id,
                last,
                terminal,
              };

              yield {
                path: [
                  ...path,
                  {
                    key: `${step}:${node.id}`,
                    name: "node" as const,
                    characterId: character.id,
                    iteration,
                    nodeId: node.id,
                  },
                ],
                calls: outcome.calls,
                decision: outcome.record,
                error: outcome.error,
                startedAt: outcome.startedAt,
                endedAt: outcome.endedAt,
                data,
                progress: last ? 1 : 0,
              } satisfies AdventureDecisionEvent;

              if (last || option === undefined || nextNodeId === null) return;

              history.push({
                decision: node.decision,
                choice: option.label,
                outcome: option.outcome,
              });
              nodeId = nextNodeId;
            }
          });
        }
      }

      yield* mergePool(sources, ctx.concurrency, ctx.signal);
    },
  };
}
