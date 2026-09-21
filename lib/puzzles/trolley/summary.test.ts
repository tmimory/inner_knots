import { describe, expect, it } from "vitest";

import { emptySummary, reduce, type TrolleyDecisionEvent } from "./summary";

const roster = [
  { characterId: "zeno", runs: 2 },
  { characterId: "hume", runs: 1 },
];

function event(
  characterId: string,
  iteration: number,
  outcome: Partial<Pick<TrolleyDecisionEvent, "decision" | "error">>,
): TrolleyDecisionEvent {
  return {
    path: [
      { key: characterId, name: "character", characterId },
      { key: String(iteration), name: "iteration", characterId, iteration },
    ],
    calls: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    data: { characterId, iteration },
    ...outcome,
  };
}

describe("trolley summary", () => {
  it("starts with every roster character at zero", () => {
    expect(emptySummary({ roster })).toEqual({
      kind: "trolley",
      decisions: [],
      perCharacter: {
        zeno: { track1: 0, track2: 0, errors: 0 },
        hume: { track1: 0, track2: 0, errors: 0 },
      },
    });
  });

  it("counts choices per character and keeps the decisions in order", () => {
    let summary = emptySummary({ roster });
    summary = reduce(summary, event("zeno", 1, { decision: { choice: "track1", latencyMs: 10 } }));
    summary = reduce(summary, event("zeno", 2, { decision: { choice: "track2", latencyMs: 20 } }));
    summary = reduce(summary, event("hume", 1, { decision: { choice: "track2", latencyMs: 30 } }));

    expect(summary.decisions.map((decision) => decision.choice)).toEqual(["track1", "track2", "track2"]);
    expect(summary.decisions[0]).toMatchObject({ characterId: "zeno", iteration: 1, latencyMs: 10 });
    expect(summary.perCharacter.zeno).toMatchObject({ track1: 1, track2: 1, errors: 0 });
    expect(summary.perCharacter.hume).toMatchObject({ track1: 0, track2: 1, errors: 0 });
  });

  it("records a failed decision without a choice and counts it as an error", () => {
    const summary = reduce(emptySummary({ roster }), event("zeno", 1, { error: "the model refused" }));

    expect(summary.decisions[0]).toMatchObject({ error: "the model refused" });
    expect(summary.decisions[0]?.choice).toBeUndefined();
    expect(summary.perCharacter.zeno).toMatchObject({ track1: 0, track2: 0, errors: 1 });
  });

  it("ignores an answer that is not one of the tracks", () => {
    const summary = reduce(
      emptySummary({ roster }),
      event("zeno", 1, { decision: { choice: "track3", latencyMs: 1 } }),
    );
    expect(summary.decisions[0]?.choice).toBeUndefined();
    expect(summary.perCharacter.zeno).toMatchObject({ track1: 0, track2: 0 });
  });

  it("means the reported weights over the decisions that reported any", () => {
    let summary = emptySummary({ roster });
    summary = reduce(
      summary,
      event("zeno", 1, { decision: { choice: "track1", latencyMs: 1, weights: { track1: 0.8, track2: 0.2 } } }),
    );
    summary = reduce(
      summary,
      event("zeno", 2, { decision: { choice: "track2", latencyMs: 1, weights: { track1: 0.4, track2: 0.6 } } }),
    );

    expect(summary.perCharacter.zeno?.meanWeights?.track1).toBeCloseTo(0.6);
    expect(summary.perCharacter.zeno?.meanWeights?.track2).toBeCloseTo(0.4);
    expect(summary.perCharacter.hume?.meanWeights).toBeUndefined();
  });

  it("does not mutate the summary it is given", () => {
    const first = emptySummary({ roster });
    const second = reduce(first, event("zeno", 1, { decision: { choice: "track1", latencyMs: 1 } }));

    expect(first.decisions).toHaveLength(0);
    expect(second.decisions).toHaveLength(1);
  });
});
