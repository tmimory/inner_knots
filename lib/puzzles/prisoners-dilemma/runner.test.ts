import { describe, expect, it, vi } from "vitest";

import type { Character } from "@/lib/domain/character";
import type { PrisonersDilemmaPlan } from "@/lib/engine/setup";
import type { RunnerContext } from "@/lib/engine/types";
import { ProviderError, type DecisionRequest } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));

vi.mock("@/lib/providers/factory", () => ({
  createProvider: (id: string) => ({ id, label: id, listModels: async () => [], decide: mocks.decide }),
}));

const { createPrisonersDilemmaRunner } = await import("./runner");
const { emptySummary, reduce } = await import("./summary");

function character(id: string): Character {
  return {
    id,
    avatar: { shape: "owl", color: "rubric" },
    provider: "local",
    model: "anything",
    outputMode: "structured",
    steering: { mode: "bio", bio: `${id}, a suspect`, principles: [], values: [] },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function plan(overrides: { iterations?: number; runs?: number } = {}): PrisonersDilemmaPlan {
  const iterations = overrides.iterations ?? 3;
  const runs = overrides.runs ?? 1;
  return {
    puzzle: "prisoners-dilemma",
    total: runs * iterations * 2,
    playerA: character("zeno"),
    playerB: character("hume"),
    config: {
      puzzle: "prisoners-dilemma",
      variant: "interrogation",
      playerA: "zeno",
      playerB: "hume",
      relationshipsEnabled: false,
      crime: "a heist",
      payoffs: {
        symmetric: true,
        bothTestify: "2 years",
        bothSilent: "1 year",
        onlyTestifier: "walk free",
        onlySilent: "5 years",
      },
      iterations,
      runs,
    },
  };
}

function context(): RunnerContext {
  return { signal: new AbortController().signal, log: async () => undefined, concurrency: 3 };
}

/** Zeno always testifies, Hume always stays silent, so a history is easy to read. */
function answerBySide(): string[] {
  const prompts: string[] = [];
  mocks.decide.mockImplementation(async (request: DecisionRequest) => {
    prompts.push(`${request.system ?? ""}\n${request.messages[0]?.content ?? ""}`);
    const choice = request.system?.includes("zeno") ? "testify" : "silent";
    return { choice, latencyMs: 1 };
  });
  return prompts;
}

async function collect(runner: ReturnType<typeof createPrisonersDilemmaRunner>) {
  const events = [];
  for await (const event of runner.decisions(context())) events.push(event);
  return events;
}

describe("prisoner's dilemma runner", () => {
  it("plays every round of every game, both players per round", async () => {
    mocks.decide.mockReset();
    answerBySide();

    const events = await collect(createPrisonersDilemmaRunner(plan({ iterations: 2, runs: 2 })));

    expect(events).toHaveLength(8);
    expect(events.filter((event) => event.data.player === "a")).toHaveLength(4);
    expect(new Set(events.map((event) => event.data.game))).toEqual(new Set([1, 2]));
  });

  it("threads each round's result into the next round's prompt, from each side", async () => {
    mocks.decide.mockReset();
    const prompts = answerBySide();

    await collect(createPrisonersDilemmaRunner(plan({ iterations: 3, runs: 1 })));

    const zeno = prompts.filter((prompt) => prompt.includes("zeno"));
    const hume = prompts.filter((prompt) => prompt.includes("hume"));
    expect(zeno).toHaveLength(3);

    expect(zeno[0]).toContain("This is round 1 of 3.");
    expect(zeno[0]).not.toContain("So far:");

    expect(zeno[1]).toContain("Round 1: you chose Testify, your partner chose Stay silent.");
    expect(hume[1]).toContain("Round 1: you chose Stay silent, your partner chose Testify.");

    expect(zeno[2]).toContain("Round 2: you chose Testify, your partner chose Stay silent.");
    expect(zeno[2]).toContain("This is round 3 of 3.");
  });

  it("stops a game after a round that did not produce two answers", async () => {
    mocks.decide.mockReset();
    mocks.decide.mockImplementation(async (request: DecisionRequest) => {
      const isHume = request.system?.includes("hume") === true;
      if (isHume && request.messages[0]?.content.includes("This is round 2 of 3.")) {
        throw new ProviderError("local", "the model refused", { retryable: false });
      }
      return { choice: isHume ? "silent" : "testify", latencyMs: 1 };
    });

    const events = await collect(createPrisonersDilemmaRunner(plan({ iterations: 3, runs: 1 })));

    // Two rounds were played: the second one incomplete, and no third was started.
    expect(events).toHaveLength(4);
    expect(events.map((event) => event.data.round)).toEqual([1, 1, 2, 2]);
    expect(events[3]?.error).toBe("the model refused");

    const summary = events.reduce(reduce, emptySummary());
    expect(summary.outcomes).toMatchObject({ onlyATestifies: 1, incomplete: 1 });
    expect(summary.perPlayer.b.errors).toBe(1);
  });

  it("gives each side its own span path, so a character playing itself stays separable", async () => {
    mocks.decide.mockReset();
    answerBySide();

    const events = await collect(createPrisonersDilemmaRunner(plan({ iterations: 1, runs: 1 })));

    expect(events[0]?.path.map((segment) => segment.name)).toEqual([
      "character",
      "iteration",
      "iteration",
    ]);
    expect(events[0]?.path[0]?.key).toBe("a:zeno");
    expect(events[1]?.path[0]?.key).toBe("b:hume");
    expect(events[0]?.path[2]).toMatchObject({ key: "round:1", iteration: 1 });
  });
});
