import { describe, expect, it } from "vitest";

import { emptySummary, reduce, type AdventureDecisionEvent } from "./summary";

const roster = [{ characterId: "zeno", runs: 2 }];

function event(
  nodeId: string,
  options: Partial<AdventureDecisionEvent["data"]> &
    Partial<Pick<AdventureDecisionEvent, "decision" | "error">> = {},
): AdventureDecisionEvent {
  const { decision, error, ...data } = options;
  return {
    path: [{ key: "zeno", name: "character", characterId: "zeno" }],
    calls: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    decision,
    error,
    data: { characterId: "zeno", iteration: 1, nodeId, last: false, terminal: false, ...data },
  };
}

describe("adventure summary", () => {
  it("starts with every roster character at zero", () => {
    expect(emptySummary({ roster })).toEqual({
      kind: "adventure",
      paths: [],
      nodeHits: {},
      optionHits: {},
      perCharacter: { zeno: { completed: 0, errors: 0 } },
    });
  });

  it("appends steps to the walk they belong to and counts the visits", () => {
    let summary = emptySummary({ roster });
    summary = reduce(summary, event("start", { decision: { choice: "left", latencyMs: 1 } }));
    summary = reduce(
      summary,
      event("fork", { decision: { choice: "onwards", latencyMs: 1 }, last: true, terminal: true }),
    );

    expect(summary.paths).toHaveLength(1);
    expect(summary.paths[0]?.steps.map((step) => step.nodeId)).toEqual(["start", "fork"]);
    expect(summary.paths[0]?.terminal).toBe(true);
    expect(summary.nodeHits).toEqual({ start: 1, fork: 1 });
    expect(summary.optionHits).toEqual({ start: { left: 1 }, fork: { onwards: 1 } });
    expect(summary.perCharacter.zeno).toEqual({ completed: 1, errors: 0 });
  });

  it("keeps separate walks apart and adds up their visits", () => {
    let summary = emptySummary({ roster });
    summary = reduce(summary, event("start", { decision: { choice: "left", latencyMs: 1 } }));
    summary = reduce(
      summary,
      event("start", { iteration: 2, decision: { choice: "left", latencyMs: 1 } }),
    );

    expect(summary.paths).toHaveLength(2);
    expect(summary.nodeHits.start).toBe(2);
    expect(summary.optionHits.start).toEqual({ left: 2 });
  });

  it("counts a failed step as an error and leaves the walk unfinished", () => {
    const summary = reduce(
      emptySummary({ roster }),
      event("start", { error: "the model refused", last: true }),
    );

    expect(summary.paths[0]?.steps[0]).toMatchObject({ error: "the model refused" });
    expect(summary.paths[0]?.terminal).toBe(false);
    expect(summary.optionHits).toEqual({});
    expect(summary.perCharacter.zeno).toEqual({ completed: 0, errors: 1 });
  });

  it("does not mutate the summary it is given", () => {
    const first = emptySummary({ roster });
    const second = reduce(first, event("start", { decision: { choice: "left", latencyMs: 1 } }));

    expect(first.paths).toHaveLength(0);
    expect(second.paths).toHaveLength(1);
  });
});
