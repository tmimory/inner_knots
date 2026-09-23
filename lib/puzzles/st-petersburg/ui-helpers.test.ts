import { describe, expect, it } from "vitest";

import { RUN_LIMITS } from "@/lib/domain/run";

import {
  DEFAULT_AMOUNT,
  DEFAULT_FACES,
  DEFAULT_SETUP,
  blockedReason,
  clampAmount,
  gameTotal,
  parseSetup,
  payoffText,
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
  it("is the paradox in money: heads compounds, tails takes it all and stops", () => {
    expect(DEFAULT_FACES.heads).toEqual({
      payoff: { kind: "amount", amount: DEFAULT_AMOUNT, doubles: true },
      endsGame: false,
    });
    expect(DEFAULT_FACES.tails).toEqual({ payoff: { kind: "forfeit" }, endsGame: true });
  });

  it("starts inside the limits it will be validated against", () => {
    expect(DEFAULT_AMOUNT).toBeLessThanOrEqual(RUN_LIMITS.maxAmount);
    expect(DEFAULT_SETUP.maxFlips).toBeGreaterThanOrEqual(RUN_LIMITS.minFlips);
    expect(DEFAULT_SETUP.maxFlips).toBeLessThanOrEqual(RUN_LIMITS.maxFlips);
  });
});

describe("payoffText", () => {
  it("is the prose of a written payoff and nothing for a priced one", () => {
    expect(payoffText({ kind: "text", text: "a sandwich" })).toBe("a sandwich");
    expect(payoffText({ kind: "amount", amount: 2, doubles: false })).toBe("");
    expect(payoffText({ kind: "forfeit" })).toBe("");
  });
});

describe("clampAmount", () => {
  it("pulls a stake inside the limits", () => {
    expect(clampAmount(-5)).toBe(0);
    expect(clampAmount(RUN_LIMITS.maxAmount + 1)).toBe(RUN_LIMITS.maxAmount);
    expect(clampAmount(2.5)).toBe(2.5);
  });

  it("takes the default stake rather than the floor for a number it cannot read", () => {
    expect(clampAmount(Number.NaN)).toBe(DEFAULT_AMOUNT);
    expect(clampAmount(Number.POSITIVE_INFINITY)).toBe(DEFAULT_AMOUNT);
  });

  it("rounds to the cent, so the config says what the screen says", () => {
    expect(clampAmount(2.005)).toBe(2.01);
    expect(clampAmount(1.999)).toBe(2);
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

  it("reads back each of the three payoff kinds", () => {
    const setup = parseSetup({
      faces: {
        heads: { payoff: { kind: "text", text: "a sandwich" }, endsGame: false },
        tails: { payoff: { kind: "amount", amount: 5, doubles: false }, endsGame: true },
      },
    });
    expect(setup?.faces.heads.payoff).toEqual({ kind: "text", text: "a sandwich" });
    expect(setup?.faces.tails.payoff).toEqual({ kind: "amount", amount: 5, doubles: false });
    expect(parseSetup({ faces: { heads: { payoff: { kind: "forfeit" } } } })?.faces.heads.payoff)
      .toEqual({ kind: "forfeit" });
  });

  it("upgrades a payoff stored as a bare string to prose", () => {
    const setup = parseSetup({ faces: { heads: { payoff: "the pot doubles" } } });
    expect(setup?.faces.heads.payoff).toEqual({ kind: "text", text: "the pot doubles" });
    expect(setup?.faces.heads.endsGame).toBe(DEFAULT_FACES.heads.endsGame);
  });

  it("truncates a string payoff a shorter limit has since been put on", () => {
    const long = "x".repeat(RUN_LIMITS.facePayoff + 20);
    const payoff = parseSetup({ faces: { tails: { payoff: long } } })?.faces.tails.payoff;
    expect(payoffText(payoff ?? { kind: "forfeit" })).toHaveLength(RUN_LIMITS.facePayoff);
  });

  it("takes the face's default for a kind nobody recognises", () => {
    const setup = parseSetup({
      faces: {
        heads: { payoff: { kind: "sandwich", text: "a sandwich" } },
        tails: { payoff: 7 },
      },
    });
    expect(setup?.faces.heads.payoff).toEqual(DEFAULT_FACES.heads.payoff);
    expect(setup?.faces.tails.payoff).toEqual(DEFAULT_FACES.tails.payoff);
  });

  it("clamps a stored stake and reads doubling as a flag", () => {
    const setup = parseSetup({
      faces: {
        heads: { payoff: { kind: "amount", amount: RUN_LIMITS.maxAmount * 10, doubles: "yes" } },
        tails: { payoff: { kind: "amount", amount: -3, doubles: true } },
      },
    });
    expect(setup?.faces.heads.payoff).toEqual({
      kind: "amount",
      amount: RUN_LIMITS.maxAmount,
      // Heads defaults to a doubling stake, so an unreadable flag keeps that.
      doubles: true,
    });
    expect(setup?.faces.tails.payoff).toEqual({ kind: "amount", amount: 0, doubles: true });
  });

  it("takes the default stake for an amount that is not a number", () => {
    const payoff = parseSetup({
      faces: { tails: { payoff: { kind: "amount", amount: "five" } } },
    })?.faces.tails.payoff;
    // Tails forfeits by default, so there is no stake to keep: the default stands.
    expect(payoff).toEqual({ kind: "amount", amount: DEFAULT_AMOUNT, doubles: false });
  });

  it("restores half a face from the default", () => {
    const setup = parseSetup({ faces: { heads: { payoff: { kind: "forfeit" } } } });
    expect(setup?.faces.heads).toEqual({
      payoff: { kind: "forfeit" },
      endsGame: DEFAULT_FACES.heads.endsGame,
    });
    expect(setup?.faces.tails).toEqual(DEFAULT_FACES.tails);
  });

  it("takes a flag only when it is a boolean", () => {
    const setup = parseSetup({ faces: { heads: { endsGame: "yes" }, tails: { endsGame: false } } });
    expect(setup?.faces.heads.endsGame).toBe(DEFAULT_FACES.heads.endsGame);
    expect(setup?.faces.tails.endsGame).toBe(false);
  });

  it("keeps a framing the domain knows and falls back on one it does not", () => {
    expect(parseSetup({ variant: "encounter" })?.variant).toBe("encounter");
    expect(parseSetup({ variant: "interrogation" })?.variant).toBe(DEFAULT_SETUP.variant);
    expect(parseSetup({})?.variant).toBe(DEFAULT_SETUP.variant);
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
  it("sends the framing, both faces and the flip cap, and nothing about the roster", () => {
    const config = puzzleConfig(seated);
    expect(config).toEqual({
      variant: DEFAULT_SETUP.variant,
      faces: DEFAULT_FACES,
      maxFlips: DEFAULT_SETUP.maxFlips,
    });
    expect(config).not.toHaveProperty("roster");
  });

  it("trims prose payoffs and leaves priced ones alone", () => {
    const config = puzzleConfig({
      ...seated,
      faces: {
        heads: { payoff: { kind: "text", text: "  the pot doubles  " }, endsGame: true },
        tails: { payoff: { kind: "amount", amount: 2.5, doubles: false }, endsGame: false },
      },
    });
    expect(config.faces.heads).toEqual({
      payoff: { kind: "text", text: "the pot doubles" },
      endsGame: true,
    });
    expect(config.faces.tails).toEqual({
      payoff: { kind: "amount", amount: 2.5, doubles: false },
      endsGame: false,
    });
  });
});

describe("blockedReason", () => {
  it("asks for a character first", () => {
    expect(blockedReason(DEFAULT_SETUP)).toBe("Put at least one character on the roster.");
  });

  it("passes a seated default setup", () => {
    expect(blockedReason(seated)).toBeNull();
  });

  it("refuses a face written in words nobody has written anything in", () => {
    const blank: StPetersburgSetup = {
      ...seated,
      faces: { ...seated.faces, tails: { payoff: { kind: "text", text: "   " }, endsGame: true } },
    };
    expect(blockedReason(blank)).toBe("Say what each face pays.");
  });

  it("lets a free coin through: zero is a price, not a blank", () => {
    const free: StPetersburgSetup = {
      ...seated,
      faces: {
        ...seated.faces,
        tails: { payoff: { kind: "amount", amount: 0, doubles: false }, endsGame: true },
      },
    };
    expect(blockedReason(free)).toBeNull();
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
