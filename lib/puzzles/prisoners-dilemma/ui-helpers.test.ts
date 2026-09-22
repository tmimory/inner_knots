import { describe, expect, it } from "vitest";

import { DEFAULT_CRIME, RUN_LIMITS } from "@/lib/domain/run";

import {
  DEFAULT_SETUP,
  MIN_ITERATED_ROUNDS,
  PAYOFF_CELLS,
  SYMMETRIC_PAYOFF_FIELDS,
  moveLabel,
  scenarioLabel,
  symmetricFieldFor,
  blockedReason,
  decisionTotal,
  iterationsOf,
  playerNames,
  parseSetup,
  payoffsOf,
  playersOf,
  puzzleConfig,
  type PrisonersDilemmaSetup,
} from "./ui-helpers";

const seated: PrisonersDilemmaSetup = {
  ...DEFAULT_SETUP,
  roster: [
    { characterId: "iris", runs: 1 },
    { characterId: "kallias", runs: 1 },
  ],
};

describe("parseSetup", () => {
  it("refuses anything that is not an object", () => {
    expect(parseSetup(null)).toBeUndefined();
    expect(parseSetup("{}")).toBeUndefined();
    expect(parseSetup(7)).toBeUndefined();
  });

  it("falls back per field, so one lost shape does not reset the screen", () => {
    const setup = parseSetup({ variant: "interrogation", crime: 42, rounds: "many" });
    expect(setup?.variant).toBe("interrogation");
    expect(setup?.crime).toBe(DEFAULT_CRIME);
    expect(setup?.rounds).toBe(DEFAULT_SETUP.rounds);
    expect(setup?.symmetricPayoffs).toEqual(DEFAULT_SETUP.symmetricPayoffs);
  });

  it("drops a variant it does not recognize", () => {
    expect(parseSetup({ variant: "courtroom" })?.variant).toBe(DEFAULT_SETUP.variant);
  });

  it("keeps at most two seats and normalizes their run counts", () => {
    const setup = parseSetup({
      roster: [
        { characterId: "a", runs: 9 },
        { characterId: "b" },
        { characterId: "c" },
        "nonsense",
      ],
    });
    expect(setup?.roster).toEqual([
      { characterId: "a", runs: RUN_LIMITS.minRuns },
      { characterId: "b", runs: RUN_LIMITS.minRuns },
    ]);
  });

  it("clamps the counts to the run limits", () => {
    expect(parseSetup({ runs: 1000 })?.runs).toBe(RUN_LIMITS.maxRuns);
    expect(parseSetup({ rounds: 0 })?.rounds).toBe(MIN_ITERATED_ROUNDS);
    expect(parseSetup({ rounds: 99 })?.rounds).toBe(RUN_LIMITS.maxIterations);
  });

  it("truncates text a shorter limit has since been put on", () => {
    const long = "x".repeat(RUN_LIMITS.payoff + 20);
    expect(parseSetup({ symmetricPayoffs: { bothTestify: long } })?.symmetricPayoffs.bothTestify)
      .toHaveLength(RUN_LIMITS.payoff);
  });

  it("restores half an asymmetric cell from the default", () => {
    const setup = parseSetup({ asymmetricPayoffs: { bothSilent: { a: "a fine" } } });
    expect(setup?.asymmetricPayoffs.bothSilent).toEqual({
      a: "a fine",
      b: DEFAULT_SETUP.asymmetricPayoffs.bothSilent.b,
    });
  });
});

describe("payoffsOf", () => {
  it("sends the symmetric four without the awareness flag", () => {
    expect(payoffsOf(seated)).toEqual({ symmetric: true, ...DEFAULT_SETUP.symmetricPayoffs });
  });

  it("sends the four a/b pairs and the awareness flag when asymmetric", () => {
    const payoffs = payoffsOf({ ...seated, symmetric: false, playersAware: false });
    expect(payoffs).toEqual({
      symmetric: false,
      playersAware: false,
      ...DEFAULT_SETUP.asymmetricPayoffs,
    });
  });
});

describe("puzzleConfig", () => {
  it("collapses a single game to one iteration", () => {
    expect(iterationsOf(seated)).toBe(1);
    expect(puzzleConfig(seated).iterations).toBe(1);
  });

  it("carries the round count when the game is iterated", () => {
    expect(puzzleConfig({ ...seated, iterated: true, rounds: 6 }).iterations).toBe(6);
  });

  it("withholds relationships while the switch is off", () => {
    const config = puzzleConfig({ ...seated, relationshipA: "your son", relationshipB: "your father" });
    expect(config.relationshipsEnabled).toBe(false);
    expect(config.relationshipA).toBeUndefined();
    expect(config.relationshipB).toBeUndefined();
  });

  it("sends a relationship only when it says something", () => {
    const config = puzzleConfig({
      ...seated,
      relationshipsEnabled: true,
      relationshipA: "  your son  ",
      relationshipB: "   ",
    });
    expect(config.relationshipA).toBe("your son");
    expect(config.relationshipB).toBeUndefined();
  });

  it("trims the charge", () => {
    expect(puzzleConfig({ ...seated, crime: "  a bank job  " }).crime).toBe("a bank job");
  });
});

describe("playersOf", () => {
  it("is undefined until both seats are filled", () => {
    expect(playersOf(DEFAULT_SETUP)).toBeUndefined();
    expect(playersOf({ ...DEFAULT_SETUP, roster: [{ characterId: "iris", runs: 1 }] })).toBeUndefined();
  });

  it("reads the seats in order", () => {
    expect(playersOf(seated)).toEqual({ playerA: "iris", playerB: "kallias" });
  });
});

describe("blockedReason", () => {
  it("asks for both players first", () => {
    expect(blockedReason(DEFAULT_SETUP)).toBe("Seat both players.");
  });

  it("passes a fully seated default setup", () => {
    expect(blockedReason(seated)).toBeNull();
  });

  it("refuses an empty charge", () => {
    expect(blockedReason({ ...seated, crime: "   " })).toBe("The charge cannot be empty.");
  });

  it("refuses a blank cell in whichever matrix is selected", () => {
    const blankSymmetric = {
      ...seated,
      symmetricPayoffs: { ...seated.symmetricPayoffs, bothSilent: "" },
    };
    expect(blockedReason(blankSymmetric)).toMatch(/matrix/);
    // The same blank is irrelevant once the asymmetric matrix is the one being sent.
    expect(blockedReason({ ...blankSymmetric, symmetric: false })).toBeNull();
  });
});

describe("decisionTotal", () => {
  it("counts both players of every round of every game", () => {
    expect(decisionTotal({ ...seated, runs: 5 })).toBe(10);
    expect(decisionTotal({ ...seated, runs: 5, iterated: true, rounds: 4 })).toBe(40);
  });
});

describe("playerNames", () => {
  it("uses a seated character's name and the seat's name until then", () => {
    expect(playerNames({ a: { id: "iris", name: "Iris" } })).toEqual({
      a: "Iris",
      b: "Player B",
    });
  });

  it("falls back to the id when a character has no name", () => {
    expect(playerNames({ a: { id: "iris", name: "" }, b: { id: "kallias", name: " " } })).toEqual({
      a: "iris",
      b: "kallias",
    });
  });
});

const names = { a: "Socrates", b: "Hobbes" };

describe("moveLabel", () => {
  it("says what one player did, in the words the headers use", () => {
    expect(moveLabel("Socrates", true)).toBe("Socrates testifies");
    expect(moveLabel("Hobbes", false)).toBe("Hobbes stays silent");
  });
});

describe("scenarioLabel", () => {
  it("names each square by what happened in it", () => {
    expect(PAYOFF_CELLS.map((cell) => scenarioLabel(cell, names))).toEqual([
      "Both testify",
      "Only Socrates testifies",
      "Only Hobbes testifies",
      "Both stay silent",
    ]);
  });
});

describe("symmetricFieldFor", () => {
  it("reads a player's outcome off their own move and the other's", () => {
    expect(symmetricFieldFor(true, true)).toBe("bothTestify");
    expect(symmetricFieldFor(true, false)).toBe("onlyTestifier");
    expect(symmetricFieldFor(false, true)).toBe("onlySilent");
    expect(symmetricFieldFor(false, false)).toBe("bothSilent");
  });

  it("gives the two players of one square the mirrored pair of fields", () => {
    const [, onlyA] = PAYOFF_CELLS;
    expect(onlyA).toBeDefined();
    expect(symmetricFieldFor(onlyA!.a, onlyA!.b)).toBe("onlyTestifier");
    expect(symmetricFieldFor(onlyA!.b, onlyA!.a)).toBe("onlySilent");
  });

  it("puts each stored field in exactly one of Player A's four lines", () => {
    const edited = PAYOFF_CELLS.map((cell) => symmetricFieldFor(cell.a, cell.b));
    expect([...edited].sort()).toEqual([...SYMMETRIC_PAYOFF_FIELDS].sort());
  });
});
