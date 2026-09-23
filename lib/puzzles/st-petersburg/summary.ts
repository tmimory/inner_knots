/**
 * Folding turns of the coin into the summary the screens read.
 *
 * A game arrives one turn at a time and is never rewritten backwards: each event
 * appends its turn to the game it belongs to, and the turn that ends the game is
 * the one carrying the `ending`. `games` is therefore the only accumulated state,
 * and the per-character tally is recomputed from it every time, so folding the
 * same events twice cannot drift the counts.
 *
 * A turn that produced no answer still lands, with its error: "this model would
 * not say whether it flips" is a finding about the model.
 */
import type { CoinFace, StPetersburgConfig } from "@/lib/domain/run";
import {
  ST_PETERSBURG_CHOICES,
  ST_PETERSBURG_ENDINGS,
  tallyChoices,
  type StPetersburgCharacterTally,
  type StPetersburgChoice,
  type StPetersburgEnding,
  type StPetersburgFlipSummary,
  type StPetersburgGameSummary,
  type StPetersburgSummary,
} from "@/lib/domain/summary";
import type { DecisionEvent } from "@/lib/engine/types";

/** What the St. Petersburg runner attaches to each event. */
export type StPetersburgEventData = {
  characterId: string;
  /** 1-based game number within that character's run count. */
  iteration: number;
  /** 1-based turn within the game. */
  flip: number;
  /** How the coin came down, when the character chose to flip it. */
  face?: CoinFace;
  /** Set only on the turn that ends the game. */
  ending?: StPetersburgEnding;
};

export type StPetersburgDecisionEvent = DecisionEvent<StPetersburgEventData>;

/** Narrows a provider's answer to one of the two moves, or to nothing. */
export function toChoice(value: string | undefined): StPetersburgChoice | undefined {
  return ST_PETERSBURG_CHOICES.find((choice) => choice === value);
}

function emptyTally(): StPetersburgCharacterTally {
  return {
    flip: 0,
    walk: 0,
    errors: 0,
    heads: 0,
    tails: 0,
    endings: { walked: 0, face: 0, limit: 0, error: 0 },
  };
}

/** The zero summary: every character on the roster present, with no games yet. */
export function emptySummary(config: Pick<StPetersburgConfig, "roster">): StPetersburgSummary {
  const perCharacter: Record<string, StPetersburgCharacterTally> = {};
  for (const entry of config.roster) perCharacter[entry.characterId] = emptyTally();
  return { kind: "st-petersburg", games: [], perCharacter };
}

/** Writes one turn into its game, creating the game when this is its first turn. */
function place(
  games: readonly StPetersburgGameSummary[],
  data: StPetersburgEventData,
  turn: StPetersburgFlipSummary,
): StPetersburgGameSummary[] {
  const next = games.map((game) => ({ ...game, flips: [...game.flips] }));

  let game = next.find(
    (candidate) => candidate.characterId === data.characterId && candidate.iteration === data.iteration,
  );
  if (!game) {
    game = { characterId: data.characterId, iteration: data.iteration, flips: [] };
    next.push(game);
  }

  const index = game.flips.findIndex((existing) => existing.flip === turn.flip);
  if (index === -1) {
    game.flips.push(turn);
    game.flips.sort((x, y) => x.flip - y.flip);
  } else {
    game.flips[index] = turn;
  }

  if (data.ending !== undefined) game.ending = data.ending;

  return next;
}

/** How many times the coin was actually tossed in a game. */
function tossesOf(game: StPetersburgGameSummary): StPetersburgFlipSummary[] {
  return game.flips.filter((turn) => turn.face !== undefined);
}

/** One character's counts, recomputed from every game it has played. */
function tallyFor(
  games: readonly StPetersburgGameSummary[],
  characterId: string,
): StPetersburgCharacterTally {
  const mine = games.filter((game) => game.characterId === characterId);
  const turns = mine.flatMap((game) => game.flips);
  const counts = tallyChoices(turns, ST_PETERSBURG_CHOICES);

  const endings = { walked: 0, face: 0, limit: 0, error: 0 };
  const finished = mine.filter((game) => game.ending !== undefined);
  for (const ending of ST_PETERSBURG_ENDINGS) {
    endings[ending] = finished.filter((game) => game.ending === ending).length;
  }

  const tossed = finished.reduce((sum, game) => sum + tossesOf(game).length, 0);

  return {
    ...counts,
    heads: turns.filter((turn) => turn.face === "heads").length,
    tails: turns.filter((turn) => turn.face === "tails").length,
    endings,
    // Undefined rather than zero while no game has finished: a mean over nothing
    // is not a mean of zero, and the screens say "—" for it.
    meanFlipsPerGame: finished.length === 0 ? undefined : tossed / finished.length,
  };
}

/** Adds one finished turn to the summary. */
export function reduce(
  summary: StPetersburgSummary,
  event: StPetersburgDecisionEvent,
): StPetersburgSummary {
  const games = place(summary.games, event.data, {
    flip: event.data.flip,
    choice: toChoice(event.decision?.choice),
    face: event.data.face,
    weights: event.decision?.weights,
    confidence: event.decision?.confidence,
    latencyMs: event.decision?.latencyMs,
    error: event.error,
  });

  return {
    ...summary,
    games,
    perCharacter: {
      ...summary.perCharacter,
      [event.data.characterId]: tallyFor(games, event.data.characterId),
    },
  };
}
