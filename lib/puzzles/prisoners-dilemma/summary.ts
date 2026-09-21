/**
 * Folding prisoner's dilemma decisions into the summary the screens read.
 *
 * The two players of a round are decided in parallel and therefore arrive as two
 * separate events. `reduce` writes each into its half of the round and leaves the
 * other half empty until it lands, so a summary read mid-round shows one answer
 * and one blank rather than a round that does not exist yet. Everything derived —
 * the per-player tallies and the outcome counts — is recomputed from `games`,
 * which is the only accumulated state.
 */
import {
  PRISONERS_DILEMMA_CHOICES,
  meanOf,
  type PlayerDecisionSummary,
  type PlayerTally,
  type PrisonersDilemmaChoice,
  type PrisonersDilemmaGame,
  type PrisonersDilemmaOutcomes,
  type PrisonersDilemmaSummary,
} from "@/lib/domain/summary";
import type { DecisionEvent } from "@/lib/engine/types";

/** Which side of the table a decision came from. */
export type PlayerSlot = "a" | "b";

/** What the prisoner's dilemma runner attaches to each event. */
export type PrisonersDilemmaEventData = {
  /** 1-based game number; a game is one full sequence of rounds. */
  game: number;
  /** 1-based round number within the game. */
  round: number;
  player: PlayerSlot;
};

export type PrisonersDilemmaDecisionEvent = DecisionEvent<PrisonersDilemmaEventData>;

/** Narrows a provider's answer to one of the two moves, or to nothing. */
export function toChoice(value: string | undefined): PrisonersDilemmaChoice | undefined {
  return PRISONERS_DILEMMA_CHOICES.find((choice) => choice === value);
}

export function emptySummary(): PrisonersDilemmaSummary {
  const tally: PlayerTally = { testify: 0, silent: 0, errors: 0 };
  return {
    kind: "prisoners-dilemma",
    games: [],
    perPlayer: { a: { ...tally }, b: { ...tally } },
    outcomes: {
      bothTestify: 0,
      bothSilent: 0,
      onlyATestifies: 0,
      onlyBTestifies: 0,
      incomplete: 0,
    },
  };
}

/** Every round played so far, across every game. */
function allRounds(games: readonly PrisonersDilemmaGame[]) {
  return games.flatMap((game) => game.rounds);
}

function tally(decisions: readonly PlayerDecisionSummary[]): PlayerTally {
  return {
    testify: decisions.filter((decision) => decision.choice === "testify").length,
    silent: decisions.filter((decision) => decision.choice === "silent").length,
    errors: decisions.filter((decision) => decision.error !== undefined).length,
    meanWeights: meanOf(
      decisions.map((decision) => decision.weights),
      PRISONERS_DILEMMA_CHOICES,
    ),
  };
}

/** How the rounds came out. A round missing either answer counts as incomplete. */
function outcomesOf(games: readonly PrisonersDilemmaGame[]): PrisonersDilemmaOutcomes {
  const outcomes = {
    bothTestify: 0,
    bothSilent: 0,
    onlyATestifies: 0,
    onlyBTestifies: 0,
    incomplete: 0,
  };

  for (const round of allRounds(games)) {
    const a = round.a.choice;
    const b = round.b.choice;
    if (a === undefined || b === undefined) outcomes.incomplete += 1;
    else if (a === "testify" && b === "testify") outcomes.bothTestify += 1;
    else if (a === "silent" && b === "silent") outcomes.bothSilent += 1;
    else if (a === "testify") outcomes.onlyATestifies += 1;
    else outcomes.onlyBTestifies += 1;
  }

  return outcomes;
}

/** Writes one player's answer into its round, creating the game and round as needed. */
function place(
  games: readonly PrisonersDilemmaGame[],
  data: PrisonersDilemmaEventData,
  decision: PlayerDecisionSummary,
): PrisonersDilemmaGame[] {
  const next = games.map((game) => ({ ...game, rounds: [...game.rounds] }));

  let game = next.find((candidate) => candidate.game === data.game);
  if (!game) {
    game = { game: data.game, rounds: [] };
    next.push(game);
    next.sort((x, y) => x.game - y.game);
  }

  const index = game.rounds.findIndex((round) => round.round === data.round);
  const existing = game.rounds[index] ?? { round: data.round, a: {}, b: {} };
  const updated =
    data.player === "a" ? { ...existing, a: decision } : { ...existing, b: decision };

  if (index === -1) {
    game.rounds.push(updated);
    game.rounds.sort((x, y) => x.round - y.round);
  } else {
    game.rounds[index] = updated;
  }

  return next;
}

/** Adds one player's finished decision to the summary. */
export function reduce(
  summary: PrisonersDilemmaSummary,
  event: PrisonersDilemmaDecisionEvent,
): PrisonersDilemmaSummary {
  const games = place(summary.games, event.data, {
    choice: toChoice(event.decision?.choice),
    weights: event.decision?.weights,
    confidence: event.decision?.confidence,
    latencyMs: event.decision?.latencyMs,
    error: event.error,
  });

  const rounds = allRounds(games);
  return {
    ...summary,
    games,
    perPlayer: {
      a: tally(rounds.map((round) => round.a)),
      b: tally(rounds.map((round) => round.b)),
    },
    outcomes: outcomesOf(games),
  };
}
