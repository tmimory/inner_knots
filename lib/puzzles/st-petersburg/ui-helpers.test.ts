import { describe, expect, it } from "vitest";

import { RUN_LIMITS } from "@/lib/domain/run";

import {
  DEFAULT_FACES,
  DEFAULT_SETUP,
  blockedReason,
  gameTotal,
  parseSetup,
  puzzleConfig,
  showsFlipGrid,
  type StPetersburgSetup,
} from "./ui-helpers";

const seated: StPetersburgSetup = {
  ...DEFAULT_SETUP,
  roster: [
    { characterId: "iris", runs: 3 },
    { characterId: "kallias", runs: 2 },
  ],
};

describe("DEFAULT_FACES", () => {
  it("is the paradox: heads compounds, tails takes it all and stops", () => {
    expect(DEFAULT_FACES.heads.endsGame).toBe(false);
    expect(DEFAULT_FACES.tails.endsGame).toBe(true);
    expect(DEFAULT_FACES.heads.payoff.trim()).not.toBe("");
    expect(DEFAULT_FACES.tails.payoff.trim()).not.toBe("");
  });

  it("starts inside the limits it will be validated against", () => {
    expect(DEFAULT_FACES.heads.payoff.length).toBeLessThanOrEqual(RUN_LIMITS.facePayoff);
    expect(DEFAULT_SETUP.maxFlips).toBeGreaterThanOrEqual(RUN_LIMITS.minFlips);
    expect(DEFAULT_SETUP.maxFlips).toBeLessThanOrEqual(RUN_LIMITS.maxFlips);
  });
});

describe("parseSetup", () => {
  it("refuses anything that is not an object", () => {
    expect(parseSetup(null)).toBeUndefined();
    expect(parseSetup("{}")).toBeUndefined();
    expect(parseSetup(7)).toBeUndefined();
  });

  it("falls back per field, so one lost shape does not reset the screen", () => {
    const setup = parseSetup({ maxFlips: "lots", faces: "gone" });
    expect(setup?.maxFlips).toBe(DEFAULT_SETUP.maxFlips);
    expect(setup?.faces).toEqual(DEFAULT_FACES);
    expect(setup?.roster).toEqual([]);
  });

  it("restores half a face from the default", () => {
    const setup = parseSetup({ faces: { heads: { payoff: "the pot triples" } } });
    expect(setup?.faces.heads).toEqual({
      payoff: "the pot triples",
      endsGame: DEFAULT_FACES.heads.endsGame,
    });
    expect(setup?.faces.tails).toEqual(DEFAULT_FACES.tails);
  });

  it("takes a flag only when it is a boolean", () => {
    const setup = parseSetup({ faces: { heads: { endsGame: "yes" }, tails: { endsGame: false } } });
    expect(setup?.faces.heads.endsGame).toBe(DEFAULT_FACES.heads.endsGame);
    expect(setup?.faces.tails.endsGame).toBe(false);
  });

  it("truncates a payoff a shorter limit has since been put on", () => {
    const long = "x".repeat(RUN_LIMITS.facePayoff + 20);
    expect(parseSetup({ faces: { tails: { payoff: long } } })?.faces.tails.payoff).toHaveLength(
      RUN_LIMITS.facePayoff,
    );
  });

  it("clamps the flip cap to the run limits", () => {
    expect(parseSetup({ maxFlips: 0 })?.maxFlips).toBe(RUN_LIMITS.minFlips);
    expect(parseSetup({ maxFlips: 999 })?.maxFlips).toBe(RUN_LIMITS.maxFlips);
    expect(parseSetup({ maxFlips: 4.4 })?.maxFlips).toBe(4);
  });

  it("keeps only roster entries that carry an id and a count", () => {
    const setup = parseSetup({
      roster: [
        { characterId: "iris", runs: 4 },
        { characterId: "", runs: 2 },
        { characterId: "kallias" },
        "nonsense",
        null,
      ],
    });
    expect(setup?.roster).toEqual([{ characterId: "iris", runs: 4 }]);
  });

  it("pulls a stored count inside the run limits and caps the roster", () => {
    const setup = parseSetup({
      roster: Array.from({ length: RUN_LIMITS.maxRoster + 3 }, (_, index) => ({
        characterId: `c${index}`,
        runs: 10_000,
      })),
    });
    expect(setup?.roster).toHaveLength(RUN_LIMITS.maxRoster);
    expect(setup?.roster.every((entry) => entry.runs === RUN_LIMITS.maxRuns)).toBe(true);
  });
});

describe("puzzleConfig", () => {
  it("sends both faces and the flip cap, and nothing about the roster", () => {
    const config = puzzleConfig(seated);
    expect(config).toEqual({ faces: DEFAULT_FACES, maxFlips: DEFAULT_SETUP.maxFlips });
    expect(config).not.toHaveProperty("roster");
  });

  it("trims the payoffs without touching the flags", () => {
    const config = puzzleConfig({
      ...seated,
      faces: {
        heads: { payoff: "  the pot doubles  ", endsGame: true },
        tails: { payoff: "\nnothing at all\n", endsGame: false },
      },
    });
    expect(config.faces.heads).toEqual({ payoff: "the pot doubles", endsGame: true });
    expect(config.faces.tails).toEqual({ payoff: "nothing at all", endsGame: false });
  });
});

describe("blockedReason", () => {
  it("asks for a character first", () => {
    expect(blockedReason(DEFAULT_SETUP)).toBe("Put at least one character on the roster.");
  });

  it("passes a seated default setup", () => {
    expect(blockedReason(seated)).toBeNull();
  });

  it("refuses a face nobody has said anything about", () => {
    const blank = {
      ...seated,
      faces: { ...seated.faces, tails: { payoff: "   ", endsGame: true } },
    };
    expect(blockedReason(blank)).toBe("Say what each face pays.");
  });
});

describe("gameTotal", () => {
  it("counts every game on the roster", () => {
    expect(gameTotal(seated)).toBe(5);
    expect(gameTotal(DEFAULT_SETUP)).toBe(0);
  });
});

describe("showsFlipGrid", () => {
  it("keeps the grid away from the one game of one flip", () => {
    expect(showsFlipGrid(1, 1)).toBe(false);
  });

  it("draws it for many short games as readily as for one long one", () => {
    expect(showsFlipGrid(6, 1)).toBe(true);
    expect(showsFlipGrid(1, 10)).toBe(true);
  });
});
