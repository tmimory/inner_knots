import { describe, expect, it } from "vitest";

import { RUN_LIMITS } from "@/lib/domain/run";
import {
  clampInt,
  parseFlag,
  parseNumber,
  parseRoster,
  parseText,
} from "@/lib/puzzles/setup-parse";

describe("clampInt", () => {
  it("rounds to the nearest whole count", () => {
    expect(clampInt(4.4, 1, 10)).toBe(4);
    expect(clampInt(4.6, 1, 10)).toBe(5);
  });

  it("pulls a count inside the bounds", () => {
    expect(clampInt(-3, 1, 10)).toBe(1);
    expect(clampInt(999, 1, 10)).toBe(10);
  });

  it("falls to the minimum for anything unreadable", () => {
    expect(clampInt(Number.NaN, 2, 10)).toBe(2);
    expect(clampInt(Number.POSITIVE_INFINITY, 2, 10)).toBe(2);
  });
});

describe("parseText", () => {
  it("keeps a stored string, truncated to the limit", () => {
    expect(parseText("hello", "fallback", 20)).toBe("hello");
    expect(parseText("x".repeat(30), "fallback", 10)).toHaveLength(10);
  });

  it("takes the default for anything that is not a string", () => {
    expect(parseText(42, "fallback", 20)).toBe("fallback");
    expect(parseText(undefined, "fallback", 20)).toBe("fallback");
    expect(parseText(null, "fallback", 20)).toBe("fallback");
  });

  it("keeps an empty string, which is a thing the user typed", () => {
    expect(parseText("", "fallback", 20)).toBe("");
  });
});

describe("parseFlag", () => {
  it("keeps a stored boolean, including false", () => {
    expect(parseFlag(true, false)).toBe(true);
    expect(parseFlag(false, true)).toBe(false);
  });

  it("takes the default for anything else", () => {
    expect(parseFlag("yes", false)).toBe(false);
    expect(parseFlag(1, false)).toBe(false);
    expect(parseFlag(undefined, true)).toBe(true);
  });
});

describe("parseNumber", () => {
  it("clamps a stored number to the bounds", () => {
    expect(parseNumber(0, 5, 1, 10)).toBe(1);
    expect(parseNumber(99, 5, 1, 10)).toBe(10);
    expect(parseNumber(4.4, 5, 1, 10)).toBe(4);
  });

  it("takes the default for anything that is not a number", () => {
    expect(parseNumber("lots", 5, 1, 10)).toBe(5);
    expect(parseNumber(undefined, 5, 1, 10)).toBe(5);
    expect(parseNumber(null, 5, 1, 10)).toBe(5);
  });
});

describe("parseRoster", () => {
  const stored = { max: RUN_LIMITS.maxRoster, runs: "stored" } as const;
  const fixed = { max: 2, runs: "fixed" } as const;

  it("reads nothing back from anything that is not an array", () => {
    expect(parseRoster(undefined, stored)).toEqual([]);
    expect(parseRoster({ characterId: "iris", runs: 1 }, stored)).toEqual([]);
    expect(parseRoster("iris", stored)).toEqual([]);
  });

  it("drops entries that are not objects carrying a usable id", () => {
    expect(
      parseRoster(["nonsense", null, 7, { runs: 2 }, { characterId: "", runs: 2 }], stored),
    ).toEqual([]);
  });

  it("keeps a stored count, pulled inside the run limits", () => {
    expect(
      parseRoster(
        [
          { characterId: "iris", runs: 4 },
          { characterId: "kallias", runs: 10_000 },
          { characterId: "milo", runs: 0 },
          { characterId: "nessa", runs: 3.6 },
        ],
        stored,
      ),
    ).toEqual([
      { characterId: "iris", runs: 4 },
      { characterId: "kallias", runs: RUN_LIMITS.maxRuns },
      { characterId: "milo", runs: RUN_LIMITS.minRuns },
      { characterId: "nessa", runs: 4 },
    ]);
  });

  it("drops a stored entry whose count is missing or unreadable", () => {
    expect(
      parseRoster([{ characterId: "iris" }, { characterId: "kallias", runs: "four" }], stored),
    ).toEqual([]);
  });

  it("slices a long roster to the maximum", () => {
    const entries = Array.from({ length: RUN_LIMITS.maxRoster + 3 }, (_, index) => ({
      characterId: `c${index}`,
      runs: 2,
    }));
    const parsed = parseRoster(entries, stored);
    expect(parsed).toHaveLength(RUN_LIMITS.maxRoster);
    expect(parsed[0]).toEqual({ characterId: "c0", runs: 2 });
  });

  it("seats a fixed roster whatever the stored counts say", () => {
    expect(
      parseRoster(
        [{ characterId: "a", runs: 9 }, { characterId: "b" }, { characterId: "c" }, "nonsense"],
        fixed,
      ),
    ).toEqual([
      { characterId: "a", runs: RUN_LIMITS.minRuns },
      { characterId: "b", runs: RUN_LIMITS.minRuns },
    ]);
  });
});
