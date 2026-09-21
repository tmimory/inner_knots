import { describe, expect, it, vi } from "vitest";

import type { Adventure } from "@/lib/domain/adventure";
import type { Character } from "@/lib/domain/character";
import type { AdventurePlan } from "@/lib/engine/setup";
import type { RunnerContext } from "@/lib/engine/types";
import { ProviderError, type DecisionRequest } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));

vi.mock("@/lib/providers/factory", () => ({
  createProvider: (id: string) => ({ id, label: id, listModels: async () => [], decide: mocks.decide }),
}));

const { MAX_STEPS, createAdventureRunner } = await import("./runner");
const { emptySummary, reduce } = await import("./summary");

const character: Character = {
  id: "zeno",
  avatar: { shape: "owl", color: "rubric" },
  provider: "local",
  model: "anything",
  outputMode: "structured",
  steering: { mode: "raw", principles: [], values: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const straight: Adventure = {
  id: "gates",
  name: "The gates",
  briefing: "You are at the gates of the city.",
  startNodeId: "gate",
  nodes: [
    {
      id: "gate",
      position: { x: 0, y: 0 },
      context: "The gate is shut.",
      decision: "Do you knock, or do you climb?",
      options: [
        { id: "knock", label: "Knock", outcome: "The porter opens up.", nextNodeId: "hall" },
        { id: "climb", label: "Climb", nextNodeId: null },
      ],
    },
    {
      id: "hall",
      position: { x: 1, y: 0 },
      context: "The hall is loud.",
      decision: "Do you speak, or do you listen?",
      options: [{ id: "speak", label: "Speak", nextNodeId: null }],
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** One node whose only option leads back to itself: the loop the step cap exists for. */
const loop: Adventure = {
  ...straight,
  id: "loop",
  startNodeId: "ring",
  nodes: [
    {
      id: "ring",
      position: { x: 0, y: 0 },
      context: "You have been here before.",
      decision: "Do you go round again?",
      options: [{ id: "again", label: "Again", nextNodeId: "ring" }],
    },
  ],
};

function plan(adventure: Adventure, amnesia: boolean, runs = 1): AdventurePlan {
  return {
    puzzle: "adventure",
    total: runs,
    adventure,
    roster: [{ character, runs }],
    config: { puzzle: "adventure", adventureId: adventure.id, amnesia, roster: [{ characterId: "zeno", runs }] },
  };
}

function context(): RunnerContext {
  return { signal: new AbortController().signal, log: async () => undefined, concurrency: 2 };
}

/** Answers with the first option of whichever node is being asked about. */
function answerFirstOption(): string[] {
  const prompts: string[] = [];
  mocks.decide.mockImplementation(async (request: DecisionRequest) => {
    prompts.push(request.messages[0]?.content ?? "");
    return { choice: request.options[0]?.id ?? "", latencyMs: 1 };
  });
  return prompts;
}

async function collect(runner: ReturnType<typeof createAdventureRunner>) {
  const events = [];
  for await (const event of runner.decisions(context())) events.push(event);
  return events;
}

describe("adventure runner", () => {
  it("walks to a terminal option and counts the path once", async () => {
    mocks.decide.mockReset();
    answerFirstOption();

    const events = await collect(createAdventureRunner(plan(straight, false)));

    expect(events.map((event) => event.data.nodeId)).toEqual(["gate", "hall"]);
    expect(events[0]?.progress).toBe(0);
    expect(events[1]).toMatchObject({ progress: 1, data: { last: true, terminal: true } });

    const summary = events.reduce(reduce, emptySummary(plan(straight, false).config));
    expect(summary.paths[0]?.terminal).toBe(true);
    expect(summary.perCharacter.zeno).toEqual({ completed: 1, errors: 0 });
    expect(summary.nodeHits).toEqual({ gate: 1, hall: 1 });
  });

  it("carries the history into the next node, and omits it under amnesia", async () => {
    mocks.decide.mockReset();
    const remembered = answerFirstOption();
    await collect(createAdventureRunner(plan(straight, false)));
    expect(remembered[1]).toContain("What has happened so far:");
    expect(remembered[1]).toContain("You chose: Knock.");
    expect(remembered[1]).toContain("The porter opens up.");

    mocks.decide.mockReset();
    const forgotten = answerFirstOption();
    await collect(createAdventureRunner(plan(straight, true)));
    expect(forgotten[1]).not.toContain("What has happened so far:");
    expect(forgotten[1]).toContain("The hall is loud.");
  });

  it("ends a walk on a failed decision without marking it terminal", async () => {
    mocks.decide.mockReset();
    mocks.decide.mockImplementation(async () => {
      throw new ProviderError("local", "the model refused", { retryable: false });
    });

    const events = await collect(createAdventureRunner(plan(straight, false)));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ progress: 1, error: "the model refused" });
    expect(events[0]?.data).toMatchObject({ last: true, terminal: false });

    const summary = events.reduce(reduce, emptySummary(plan(straight, false).config));
    expect(summary.perCharacter.zeno).toEqual({ completed: 0, errors: 1 });
  });

  it("stops a loop at the step cap", async () => {
    mocks.decide.mockReset();
    answerFirstOption();

    const events = await collect(createAdventureRunner(plan(loop, true)));

    expect(events).toHaveLength(MAX_STEPS);
    expect(events.at(-1)?.data).toMatchObject({ last: true, terminal: false });
    expect(events.slice(0, -1).every((event) => event.progress === 0)).toBe(true);
    expect(events.at(-1)?.progress).toBe(1);
  });

  it("gives every walk its own span path", async () => {
    mocks.decide.mockReset();
    answerFirstOption();

    const events = await collect(createAdventureRunner(plan(straight, false, 2)));

    // The two walks are interleaved by the pool, so compare them as a set.
    const keys = events.map((event) => event.path.map((segment) => segment.key).join("/")).sort();
    expect(keys).toEqual([
      "zeno/1/1:gate",
      "zeno/1/2:hall",
      "zeno/2/1:gate",
      "zeno/2/2:hall",
    ]);
    expect(events[0]?.path.map((segment) => segment.name)).toEqual(["character", "iteration", "node"]);
  });
});
