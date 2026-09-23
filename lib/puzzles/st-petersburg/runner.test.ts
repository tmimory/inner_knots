import { describe, expect, it, vi } from "vitest";

import type { Character } from "@/lib/domain/character";
import type { CoinFace, StPetersburgConfig } from "@/lib/domain/run";
import type { StPetersburgPlan } from "@/lib/engine/setup";
import type { RunnerContext } from "@/lib/engine/types";
import { ProviderError, type DecisionRequest } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));

vi.mock("@/lib/providers/factory", () => ({
  createProvider: (id: string) => ({ id, label: id, listModels: async () => [], decide: mocks.decide }),
}));

const { createStPetersburgRunner } = await import("./runner");
const { emptySummary, reduce } = await import("./summary");

function character(id: string): Character {
  return {
    id,
    avatar: { shape: "owl", color: "rubric" },
    provider: "local",
    model: "anything",
    outputMode: "structured",
    steering: { mode: "bio", bio: `${id}, a gambler`, principles: [], values: [] },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** The classic paradox: heads pays $2 and doubles, tails takes the pot and ends the game. */
const PARADOX: StPetersburgConfig["faces"] = {
  heads: { payoff: { kind: "amount", amount: 2, doubles: true }, endsGame: false },
  tails: { payoff: { kind: "forfeit" }, endsGame: true },
};

/** The same coin said in words, which the engine cannot price. */
const PROSE: StPetersburgConfig["faces"] = {
  heads: { payoff: { kind: "text", text: "the pot doubles" }, endsGame: false },
  tails: { payoff: { kind: "text", text: "you lose everything in the pot" }, endsGame: true },
};

type PlanOverrides = {
  maxFlips?: number;
  roster?: { id: string; runs: number }[];
  faces?: StPetersburgConfig["faces"];
};

function plan(overrides: PlanOverrides = {}): StPetersburgPlan {
  const maxFlips = overrides.maxFlips ?? 3;
  const entries = overrides.roster ?? [{ id: "zeno", runs: 1 }];
  return {
    puzzle: "st-petersburg",
    total: entries.reduce((sum, entry) => sum + entry.runs, 0),
    roster: entries.map((entry) => ({ character: character(entry.id), runs: entry.runs })),
    config: {
      puzzle: "st-petersburg",
      variant: "encounter",
      faces: overrides.faces ?? PARADOX,
      maxFlips,
      roster: entries.map((entry) => ({ characterId: entry.id, runs: entry.runs })),
    },
  };
}

function context(): RunnerContext {
  return { signal: new AbortController().signal, log: async () => undefined, concurrency: 3 };
}

/** Answers every turn with `choice`, collecting the user message of each prompt. */
function answers(choice: string): string[] {
  const prompts: string[] = [];
  mocks.decide.mockReset();
  mocks.decide.mockImplementation(async (request: DecisionRequest) => {
    prompts.push(request.messages[0]?.content ?? "");
    return { choice, latencyMs: 1 };
  });
  return prompts;
}

/** A coin that comes down the same way every time, and counts how often it was tossed. */
function loadedCoin(face: CoinFace) {
  return vi.fn<() => CoinFace>(() => face);
}

async function collect(runner: ReturnType<typeof createStPetersburgRunner>) {
  const events = [];
  for await (const event of runner.decisions(context())) events.push(event);
  return events;
}

describe("St. Petersburg runner", () => {
  it("yields one event per turn, and counts only the last one as a finished game", async () => {
    answers("flip");

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 3 }), { flip: loadedCoin("heads") }));

    expect(events.map((event) => event.data.flip)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.progress)).toEqual([0, 0, 1]);
    expect(events.map((event) => event.data.ending)).toEqual([undefined, undefined, "limit"]);
    expect(events[2]?.path.map((segment) => segment.name)).toEqual(["character", "iteration", "iteration"]);
    expect(events[2]?.path[2]).toMatchObject({ key: "3", iteration: 3 });
  });

  it("carries the flips already made into the next turn's prompt", async () => {
    const prompts = answers("flip");

    await collect(createStPetersburgRunner(plan({ maxFlips: 3 }), { flip: loadedCoin("heads") }));

    expect(prompts[0]).toContain("This is flip 1 of at most 3.");
    expect(prompts[0]).not.toContain("Flip 1: heads");
    expect(prompts[1]).toContain("- Flip 1: heads — you won $2.");
    expect(prompts[2]).toContain("- Flip 2: heads — you won $4.");
    expect(prompts[2]).toContain("This is flip 3 of at most 3.");
  });

  it("ends the game when the character walks away, without tossing the coin", async () => {
    answers("walk");
    const coin = loadedCoin("heads");

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 5 }), { flip: coin }));

    expect(events).toHaveLength(1);
    expect(events[0]?.data).toMatchObject({ flip: 1, ending: "walked", face: undefined });
    expect(coin).not.toHaveBeenCalled();
  });

  it("ends the game on a face that ends it", async () => {
    answers("flip");

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 5 }), { flip: loadedCoin("tails") }));

    expect(events).toHaveLength(1);
    expect(events[0]?.data).toMatchObject({ flip: 1, face: "tails", ending: "face" });
    expect(events[0]?.progress).toBe(1);
  });

  it("ends the game when a turn produces no answer", async () => {
    mocks.decide.mockReset();
    mocks.decide.mockImplementation(async (request: DecisionRequest) => {
      if (request.messages[0]?.content.includes("This is flip 2 of at most 5.")) {
        throw new ProviderError("local", "the model refused", { retryable: false });
      }
      return { choice: "flip", latencyMs: 1 };
    });

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 5 }), { flip: loadedCoin("heads") }));

    expect(events).toHaveLength(2);
    expect(events[1]?.error).toBe("the model refused");
    expect(events[1]?.data).toMatchObject({ ending: "error", face: undefined });

    const summary = events.reduce(reduce, emptySummary(plan().config));
    expect(summary.perCharacter.zeno).toMatchObject({
      flip: 1,
      errors: 1,
      endings: { walked: 0, face: 0, limit: 0, error: 1 },
    });
  });

  it("pays a doubling face more every flip, and carries the pot into the next prompt", async () => {
    const prompts = answers("flip");

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 3 }), { flip: loadedCoin("heads") }));

    expect(events.map((event) => event.data.won)).toEqual([2, 4, 8]);
    expect(events.every((event) => event.data.priced)).toBe(true);
    expect(prompts[2]).toContain("Your winnings stand at $6.");

    const summary = events.reduce(reduce, emptySummary(plan().config));
    expect(summary.games[0]?.winnings).toBe(14);
    expect(summary.games[0]?.flips.map((turn) => turn.won)).toEqual([2, 4, 8]);
    expect(summary.perCharacter.zeno?.meanWinnings).toBe(14);
  });

  it("takes the whole pot back on a forfeit, and leaves the game at nothing", async () => {
    const coin = vi.fn<() => CoinFace>();
    coin.mockReturnValueOnce("heads").mockReturnValueOnce("heads").mockReturnValue("tails");
    answers("flip");

    const events = await collect(createStPetersburgRunner(plan({ maxFlips: 5 }), { flip: coin }));

    expect(events.map((event) => event.data.won)).toEqual([2, 4, -6]);
    expect(events[2]?.data.ending).toBe("face");

    const summary = events.reduce(reduce, emptySummary(plan().config));
    expect(summary.games[0]?.winnings).toBe(0);
    expect(summary.perCharacter.zeno?.meanWinnings).toBe(0);
  });

  it("prices nothing when both faces are only words", async () => {
    answers("flip");

    const events = await collect(
      createStPetersburgRunner(plan({ maxFlips: 2, faces: PROSE }), { flip: loadedCoin("heads") }),
    );

    expect(events.every((event) => event.data.won === undefined)).toBe(true);
    expect(events.every((event) => event.data.priced)).toBe(false);

    const summary = events.reduce(reduce, emptySummary(plan().config));
    expect(summary.games[0]?.winnings).toBe(0);
    expect(summary.perCharacter.zeno?.meanWinnings).toBeUndefined();
  });

  it("plays one game per run of every character on the roster", async () => {
    answers("walk");

    const roster = [{ id: "zeno", runs: 2 }, { id: "hume", runs: 3 }];
    const runner = createStPetersburgRunner(plan({ roster }), { flip: loadedCoin("heads") });
    const events = await collect(runner);

    expect(runner.total).toBe(5);
    expect(events).toHaveLength(5);
    const games = new Set(events.map((event) => `${event.data.characterId}:${event.data.iteration}`));
    expect(games).toEqual(new Set(["zeno:1", "zeno:2", "hume:1", "hume:2", "hume:3"]));

    const summary = events.reduce(reduce, emptySummary(plan({ roster }).config));
    expect(summary.games).toHaveLength(5);
  });
});
