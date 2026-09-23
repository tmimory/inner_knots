import { describe, expect, it } from "vitest";

import type { StPetersburgEnding } from "@/lib/domain/summary";

import {
  emptySummary,
  reduce,
  type StPetersburgDecisionEvent,
  type StPetersburgEventData,
} from "./summary";

const roster = { roster: [{ characterId: "zeno", runs: 2 }, { characterId: "hume", runs: 1 }] };

type Turn = Partial<Pick<StPetersburgEventData, "face" | "won" | "priced" | "ending">> & {
  choice?: string;
  weights?: Record<string, number>;
  error?: string;
};

/** A turn of a priced coin unless the case says otherwise, which is the default coin. */
function event(characterId: string, iteration: number, flip: number, turn: Turn): StPetersburgDecisionEvent {
  return {
    path: [{ key: characterId, name: "character", characterId }],
    calls: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    decision: turn.choice === undefined ? undefined : { choice: turn.choice, weights: turn.weights, latencyMs: 5 },
    error: turn.error,
    data: {
      characterId,
      iteration,
      flip,
      face: turn.face,
      won: turn.won,
      priced: turn.priced ?? true,
      ending: turn.ending,
    },
  };
}

const flipped = (face: "heads" | "tails", ending?: StPetersburgEnding, won?: number): Turn => ({
  choice: "flip",
  face,
  won,
  ending,
});

describe("St. Petersburg summary", () => {
  it("starts with every character on the roster and nothing counted", () => {
    const summary = emptySummary(roster);
    expect(summary.games).toEqual([]);
    expect(Object.keys(summary.perCharacter)).toEqual(["zeno", "hume"]);
    expect(summary.perCharacter.zeno).toEqual({
      flip: 0,
      walk: 0,
      errors: 0,
      heads: 0,
      tails: 0,
      endings: { walked: 0, face: 0, limit: 0, error: 0 },
    });
  });

  it("grows one game turn by turn and closes it on the turn that ends it", () => {
    let summary = reduce(emptySummary(roster), event("zeno", 1, 1, flipped("heads")));
    expect(summary.games).toHaveLength(1);
    expect(summary.games[0]).toMatchObject({ characterId: "zeno", iteration: 1 });
    expect(summary.games[0]?.flips).toHaveLength(1);
    expect(summary.games[0]?.ending).toBeUndefined();

    summary = reduce(summary, event("zeno", 1, 2, flipped("heads")));
    summary = reduce(summary, event("zeno", 1, 3, { choice: "walk", ending: "walked" }));

    expect(summary.games).toHaveLength(1);
    expect(summary.games[0]?.flips.map((turn) => turn.flip)).toEqual([1, 2, 3]);
    expect(summary.games[0]?.flips[2]).toMatchObject({ choice: "walk", face: undefined });
    expect(summary.games[0]?.ending).toBe("walked");
    expect(summary.perCharacter.zeno).toMatchObject({ flip: 2, walk: 1, heads: 2, tails: 0 });
  });

  it("keeps each character's games apart and counts how every one ended", () => {
    const events = [
      event("zeno", 1, 1, flipped("tails", "face")),
      event("zeno", 2, 1, { choice: "walk", ending: "walked" }),
      event("hume", 1, 1, flipped("heads")),
      event("hume", 1, 2, flipped("heads", "limit")),
    ];
    const summary = events.reduce(reduce, emptySummary(roster));

    expect(summary.games).toHaveLength(3);
    expect(summary.perCharacter.zeno).toMatchObject({
      flip: 1,
      walk: 1,
      heads: 0,
      tails: 1,
      endings: { walked: 1, face: 1, limit: 0, error: 0 },
    });
    expect(summary.perCharacter.hume).toMatchObject({
      flip: 2,
      heads: 2,
      endings: { walked: 0, face: 0, limit: 1, error: 0 },
    });
  });

  it("means the tosses of finished games only", () => {
    let summary = reduce(emptySummary(roster), event("zeno", 1, 1, flipped("heads")));
    // The first game is still going, so there is nothing to take a mean over.
    expect(summary.perCharacter.zeno?.meanFlipsPerGame).toBeUndefined();

    summary = reduce(summary, event("zeno", 1, 2, flipped("tails", "face")));
    expect(summary.perCharacter.zeno?.meanFlipsPerGame).toBe(2);

    // A game that walks away on its first turn tossed nothing at all.
    summary = reduce(summary, event("zeno", 2, 1, { choice: "walk", ending: "walked" }));
    expect(summary.perCharacter.zeno?.meanFlipsPerGame).toBe(1);
  });

  it("keeps the pot as the running sum of what each flip won", () => {
    let summary = reduce(emptySummary(roster), event("zeno", 1, 1, flipped("heads", undefined, 2)));
    expect(summary.games[0]?.flips[0]?.won).toBe(2);
    expect(summary.games[0]?.winnings).toBe(2);

    summary = reduce(summary, event("zeno", 1, 2, flipped("heads", undefined, 4)));
    expect(summary.games[0]?.winnings).toBe(6);

    // A forfeit is minus the whole pot, so the game ends holding nothing.
    summary = reduce(summary, event("zeno", 1, 3, flipped("tails", "face", -6)));
    expect(summary.games[0]?.flips[2]?.won).toBe(-6);
    expect(summary.games[0]?.winnings).toBe(0);
    expect(summary.perCharacter.zeno?.meanWinnings).toBe(0);
  });

  it("means the pots of finished games only", () => {
    let summary = reduce(emptySummary(roster), event("hume", 1, 1, flipped("heads", undefined, 2)));
    // Nothing has finished, so there is no mean to take.
    expect(summary.perCharacter.hume?.meanWinnings).toBeUndefined();

    summary = reduce(summary, event("hume", 1, 2, flipped("heads", "limit", 4)));
    expect(summary.perCharacter.hume?.meanWinnings).toBe(6);

    // A game walked away from on its first turn won nothing and pulls the mean down.
    summary = reduce(summary, event("hume", 2, 1, { choice: "walk", ending: "walked" }));
    expect(summary.perCharacter.hume?.meanWinnings).toBe(3);
  });

  it("keeps the pot out of a coin whose faces are only words", () => {
    const summary = [
      event("zeno", 1, 1, { ...flipped("heads"), priced: false }),
      event("zeno", 1, 2, { ...flipped("tails", "face"), priced: false }),
    ].reduce(reduce, emptySummary(roster));

    expect(summary.games[0]?.flips.every((turn) => turn.won === undefined)).toBe(true);
    expect(summary.games[0]?.winnings).toBe(0);
    expect(summary.perCharacter.zeno?.meanWinnings).toBeUndefined();
  });

  it("records a turn that produced no answer, and ends its game as an error", () => {
    const summary = [
      event("hume", 1, 1, flipped("heads")),
      event("hume", 1, 2, { error: "the model refused", ending: "error" }),
    ].reduce(reduce, emptySummary(roster));

    expect(summary.games[0]?.flips[1]).toMatchObject({ error: "the model refused", choice: undefined });
    expect(summary.perCharacter.hume).toMatchObject({
      errors: 1,
      flip: 1,
      endings: { walked: 0, face: 0, limit: 0, error: 1 },
    });
  });

  it("means the reported weights over the turns that reported any", () => {
    const summary = [
      event("zeno", 1, 1, { choice: "flip", face: "heads", weights: { flip: 0.8, walk: 0.2 } }),
      event("zeno", 1, 2, { choice: "walk", ending: "walked", weights: { flip: 0.4, walk: 0.6 } }),
    ].reduce(reduce, emptySummary(roster));

    expect(summary.perCharacter.zeno?.meanWeights?.flip).toBeCloseTo(0.6);
    expect(summary.perCharacter.zeno?.meanWeights?.walk).toBeCloseTo(0.4);
  });
});
