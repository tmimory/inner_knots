import { describe, expect, it } from "vitest";

import {
  emptySummary,
  reduce,
  type PlayerSlot,
  type PrisonersDilemmaDecisionEvent,
} from "./summary";

function event(
  game: number,
  round: number,
  player: PlayerSlot,
  outcome: Partial<Pick<PrisonersDilemmaDecisionEvent, "decision" | "error">>,
): PrisonersDilemmaDecisionEvent {
  return {
    path: [{ key: player, name: "character", characterId: player }],
    calls: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    data: { game, round, player },
    ...outcome,
  };
}

const testify = { decision: { choice: "testify", latencyMs: 5 } };
const silent = { decision: { choice: "silent", latencyMs: 5 } };

describe("prisoner's dilemma summary", () => {
  it("starts empty on both sides of the table", () => {
    const summary = emptySummary();
    expect(summary.games).toEqual([]);
    expect(summary.perPlayer.a).toEqual({ testify: 0, silent: 0, errors: 0 });
    expect(summary.outcomes).toEqual({
      bothTestify: 0,
      bothSilent: 0,
      onlyATestifies: 0,
      onlyBTestifies: 0,
      incomplete: 0,
    });
  });

  it("fills each half of a round as it arrives", () => {
    let summary = reduce(emptySummary(), event(1, 1, "a", testify));
    expect(summary.games[0]?.rounds[0]?.a.choice).toBe("testify");
    expect(summary.games[0]?.rounds[0]?.b.choice).toBeUndefined();
    expect(summary.outcomes.incomplete).toBe(1);

    summary = reduce(summary, event(1, 1, "b", silent));
    expect(summary.games[0]?.rounds[0]?.b.choice).toBe("silent");
    expect(summary.outcomes).toMatchObject({ onlyATestifies: 1, incomplete: 0 });
  });

  it("classifies every outcome and tallies both players", () => {
    let summary = emptySummary();
    summary = reduce(summary, event(1, 1, "a", testify));
    summary = reduce(summary, event(1, 1, "b", testify));
    summary = reduce(summary, event(1, 2, "a", silent));
    summary = reduce(summary, event(1, 2, "b", silent));
    summary = reduce(summary, event(2, 1, "a", silent));
    summary = reduce(summary, event(2, 1, "b", testify));

    expect(summary.outcomes).toEqual({
      bothTestify: 1,
      bothSilent: 1,
      onlyATestifies: 0,
      onlyBTestifies: 1,
      incomplete: 0,
    });
    expect(summary.perPlayer.a).toMatchObject({ testify: 1, silent: 2, errors: 0 });
    expect(summary.perPlayer.b).toMatchObject({ testify: 2, silent: 1, errors: 0 });
    expect(summary.games.map((game) => game.game)).toEqual([1, 2]);
  });

  it("keeps a failed decision as an error and leaves the round incomplete", () => {
    let summary = reduce(emptySummary(), event(1, 1, "a", { error: "no answer" }));
    summary = reduce(summary, event(1, 1, "b", testify));

    expect(summary.games[0]?.rounds[0]?.a).toMatchObject({ error: "no answer" });
    expect(summary.perPlayer.a.errors).toBe(1);
    expect(summary.outcomes.incomplete).toBe(1);
  });

  it("means the weights each player reported", () => {
    let summary = reduce(
      emptySummary(),
      event(1, 1, "a", { decision: { choice: "testify", latencyMs: 1, weights: { testify: 0.9, silent: 0.1 } } }),
    );
    summary = reduce(
      summary,
      event(1, 2, "a", { decision: { choice: "silent", latencyMs: 1, weights: { testify: 0.5, silent: 0.5 } } }),
    );

    expect(summary.perPlayer.a.meanWeights?.testify).toBeCloseTo(0.7);
    expect(summary.perPlayer.b.meanWeights).toBeUndefined();
  });

  it("sorts rounds by number however they arrive", () => {
    let summary = reduce(emptySummary(), event(1, 2, "a", testify));
    summary = reduce(summary, event(1, 1, "a", silent));
    expect(summary.games[0]?.rounds.map((round) => round.round)).toEqual([1, 2]);
  });
});
