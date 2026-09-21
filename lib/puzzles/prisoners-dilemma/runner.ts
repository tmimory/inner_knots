/**
 * The prisoner's dilemma runner: `runs` games, each of `iterations` rounds.
 *
 * Rounds inside a game are strictly sequential — round n+1 is the one where the
 * model knows what its partner did in round n — but the games themselves are
 * independent, so the pool plays several at once. Within a round the two players
 * decide simultaneously and in ignorance of each other, which is the puzzle: both
 * calls go out together and neither prompt contains the other's answer.
 *
 * A round that does not produce two answers ends its game. Continuing would mean
 * writing a history that never happened.
 */
import type { PrisonersDilemmaSummary } from "@/lib/domain/summary";
import { collectDecision, type CollectedDecision } from "@/lib/engine/decide";
import { mergePool, type Source } from "@/lib/engine/pool";
import type { PrisonersDilemmaPlan } from "@/lib/engine/setup";
import type { PuzzleRunner, RunnerContext } from "@/lib/engine/types";

import { buildPrisonersDilemmaPrompt, type RoundRecord } from "./prompt";
import {
  emptySummary,
  reduce,
  toChoice,
  type PlayerSlot,
  type PrisonersDilemmaDecisionEvent,
  type PrisonersDilemmaEventData,
} from "./summary";

const SLOTS: readonly PlayerSlot[] = ["a", "b"];

/** Builds the runner for one prepared prisoner's dilemma run. */
export function createPrisonersDilemmaRunner(
  plan: PrisonersDilemmaPlan,
): PuzzleRunner<PrisonersDilemmaEventData, PrisonersDilemmaSummary> {
  const players = { a: plan.playerA, b: plan.playerB };

  /** The span chain for one player's decision: their side, then game, then round. */
  function pathFor(data: PrisonersDilemmaEventData) {
    const characterId = players[data.player].id;
    return [
      // Keyed by slot as well as id, so a character playing itself gets two sides.
      { key: `${data.player}:${characterId}`, name: "character" as const, characterId },
      { key: `game:${data.game}`, name: "iteration" as const, characterId, iteration: data.game },
      { key: `round:${data.round}`, name: "iteration" as const, characterId, iteration: data.round },
    ];
  }

  function toEvent(
    data: PrisonersDilemmaEventData,
    outcome: CollectedDecision,
  ): PrisonersDilemmaDecisionEvent {
    return {
      path: pathFor(data),
      calls: outcome.calls,
      decision: outcome.record,
      error: outcome.error,
      startedAt: outcome.startedAt,
      endedAt: outcome.endedAt,
      data,
    };
  }

  return {
    total: plan.total,
    emptySummary,
    reduce,

    async *decisions(ctx: RunnerContext) {
      const sources: Source<PrisonersDilemmaDecisionEvent>[] = [];

      for (let game = 1; game <= plan.config.runs; game += 1) {
        sources.push(async function* () {
          /** What each player has seen, in their own "you / partner" terms. */
          const history: Record<PlayerSlot, RoundRecord[]> = { a: [], b: [] };

          for (let round = 1; round <= plan.config.iterations; round += 1) {
            if (ctx.signal.aborted) return;
            await ctx.log("info", `game ${game} is playing round ${round}`, { game, round });

            const outcomes = await Promise.all(
              SLOTS.map(async (player) => {
                const character = players[player];
                const prompt = await buildPrisonersDilemmaPrompt({
                  config: plan.config,
                  player,
                  outputMode: character.outputMode,
                  round,
                  history: history[player],
                });
                return collectDecision({
                  character,
                  prompt,
                  signal: ctx.signal,
                  onRetry: (error) =>
                    ctx.log("warn", `retrying ${character.id} after a retryable failure`, {
                      game,
                      round,
                      player,
                      error: error.message,
                    }),
                });
              }),
            );

            const [outcomeA, outcomeB] = outcomes;
            if (!outcomeA || !outcomeB) return;

            yield toEvent({ game, round, player: "a" }, outcomeA);
            yield toEvent({ game, round, player: "b" }, outcomeB);

            const choiceA = toChoice(outcomeA.record?.choice);
            const choiceB = toChoice(outcomeB.record?.choice);
            if (choiceA === undefined || choiceB === undefined) {
              await ctx.log("warn", `game ${game} stopped after an incomplete round ${round}`, {
                game,
                round,
              });
              return;
            }

            history.a.push({ round, you: choiceA, partner: choiceB });
            history.b.push({ round, you: choiceB, partner: choiceA });
          }

          await ctx.log("info", `game ${game} is complete`, { game });
        });
      }

      yield* mergePool(sources, ctx.concurrency, ctx.signal);
    },
  };
}
