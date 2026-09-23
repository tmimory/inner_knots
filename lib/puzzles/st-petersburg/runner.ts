/**
 * The St. Petersburg runner: one game per character per iteration.
 *
 * A game is sequential by nature — the next prompt carries the faces the coin
 * has already shown — so a game is one source and the pool plays several at
 * once. The coin itself is tossed here rather than by the model: the character
 * only ever answers whether to flip, and what comes up is the engine's business,
 * which is what makes the run a sample of the same gamble rather than of the
 * model's idea of randomness. `flip` is injectable so a test can run a loaded
 * coin.
 *
 * Only the turn that ends a game advances the progress bar, because
 * `progress.total` counts games: a run of five games is five units of work
 * however many times each one flips.
 */
import { decisionStyleFor } from "@/lib/domain/enums";
import type { CoinFace } from "@/lib/domain/run";
import type {
  StPetersburgChoice,
  StPetersburgEnding,
  StPetersburgSummary,
} from "@/lib/domain/summary";
import { collectDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import type { StPetersburgPlan } from "@/lib/engine/setup";
import { characterIterationPath, type PuzzleRunner, type RunnerContext } from "@/lib/engine/types";

import { buildStPetersburgPrompt, type TossRecord } from "./prompt";
import {
  emptySummary,
  reduce,
  toChoice,
  type StPetersburgDecisionEvent,
  type StPetersburgEventData,
} from "./summary";

/** A fair coin, unless a caller (a test) supplies its own. */
function fairCoin(): CoinFace {
  return Math.random() < 0.5 ? "heads" : "tails";
}

export type StPetersburgRunnerOptions = {
  /** How the coin comes down. Defaults to a fair toss. */
  flip?: () => CoinFace;
};

/** Builds the runner for one prepared St. Petersburg run. */
export function createStPetersburgRunner(
  plan: StPetersburgPlan,
  options: StPetersburgRunnerOptions = {},
): PuzzleRunner<StPetersburgEventData, StPetersburgSummary> {
  const toss = options.flip ?? fairCoin;

  /**
   * Why this turn ends the game, or `undefined` when it does not. The order is
   * the contract: no answer at all beats everything, then walking away, then a
   * face that ends the game, then having used the last flip.
   */
  function endingFor(
    choice: StPetersburgChoice | undefined,
    face: CoinFace | undefined,
    flip: number,
  ): StPetersburgEnding | undefined {
    if (choice === undefined) return "error";
    if (choice === "walk") return "walked";
    if (face !== undefined && plan.config.faces[face].endsGame) return "face";
    if (flip === plan.config.maxFlips) return "limit";
    return undefined;
  }

  return {
    total: plan.total,
    emptySummary: () => emptySummary(plan.config),
    reduce,

    async *decisions(ctx: RunnerContext) {
      const sources: Source<StPetersburgDecisionEvent>[] = [];

      for (const { character, runs } of plan.roster) {
        for (let iteration = 1; iteration <= runs; iteration += 1) {
          sources.push(async function* () {
            await ctx.log("info", `${character.id} is at the coin (${iteration}/${runs})`, {
              characterId: character.id,
              iteration,
            });

            const path = characterIterationPath(character.id, iteration);
            const history: TossRecord[] = [];

            for (let flip = 1; flip <= plan.config.maxFlips; flip += 1) {
              if (ctx.signal.aborted) return;

              const prompt = await buildStPetersburgPrompt({
                config: plan.config,
                decisionStyle: decisionStyleFor(character.provider, character.outputMode),
                flip,
                history,
              });

              const outcome = await collectDecision({
                character,
                prompt,
                signal: ctx.signal,
                onRetry: (error) =>
                  ctx.log("warn", `retrying ${character.id} after a retryable failure`, {
                    characterId: character.id,
                    iteration,
                    flip,
                    error: error.message,
                  }),
              });

              const choice = toChoice(outcome.record?.choice);
              // The coin is only ever tossed for a character that asked for it.
              const face = choice === "flip" ? toss() : undefined;
              const ending = endingFor(choice, face, flip);

              const data: StPetersburgEventData = {
                characterId: character.id,
                iteration,
                flip,
                face,
                ending,
              };

              yield {
                path: [
                  ...path,
                  { key: String(flip), name: "iteration" as const, characterId: character.id, iteration: flip },
                ],
                calls: outcome.calls,
                decision: outcome.record,
                error: outcome.error,
                startedAt: outcome.startedAt,
                endedAt: outcome.endedAt,
                data,
                progress: ending === undefined ? 0 : 1,
              } satisfies StPetersburgDecisionEvent;

              if (ending !== undefined) {
                await ctx.log("info", `game ended: ${ending}`, {
                  characterId: character.id,
                  iteration,
                  flip,
                  ending,
                });
                return;
              }

              if (face !== undefined) history.push({ flip, face });
            }
          });
        }
      }

      yield* mergePool(sources, ctx.concurrency, ctx.signal);
    },
  };
}
