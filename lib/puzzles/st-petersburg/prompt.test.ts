import { describe, expect, it } from "vitest";

import { buildStPetersburgPrompt, ST_PETERSBURG_OPTIONS, type StPetersburgPromptConfig } from "./prompt";

const config: StPetersburgPromptConfig = {
  faces: {
    heads: { payoff: "the pot doubles", endsGame: false },
    tails: { payoff: "you lose everything in the pot", endsGame: true },
  },
  maxFlips: 10,
};

describe("buildStPetersburgPrompt", () => {
  it("offers exactly flipping and walking away", async () => {
    const prompt = await buildStPetersburgPrompt({ config, decisionStyle: "structured" });
    expect(prompt.options).toEqual([...ST_PETERSBURG_OPTIONS]);
    expect(prompt.question).toBe("Do you flip the coin?");
  });

  it("states the voice's terms, one face at a time", async () => {
    const prompt = await buildStPetersburgPrompt({ config, decisionStyle: "tool" });
    expect(prompt.user).toContain("a coin lying face up on the ground");
    expect(prompt.user).toContain("If it comes up heads, the pot doubles.");
    expect(prompt.user).toContain("If it comes up tails, you lose everything in the pot, and the game is over.");
    expect(prompt.user).toContain("what you have won by then is what you leave with");
  });

  it("says a face ends the game only when that face is set to end it", async () => {
    const both = await buildStPetersburgPrompt({
      config: {
        ...config,
        faces: {
          heads: { payoff: "the pot doubles", endsGame: true },
          tails: { payoff: "the pot halves", endsGame: false },
        },
      },
      decisionStyle: "tool",
    });

    expect(both.user).toContain("If it comes up heads, the pot doubles, and the game is over.");
    expect(both.user).toContain("If it comes up tails, the pot halves.");
  });

  it("names the limit on the whole game", async () => {
    const prompt = await buildStPetersburgPrompt({ config: { ...config, maxFlips: 4 }, decisionStyle: "tool" });
    expect(prompt.user).toContain("4 is the greatest number of flips");
    expect(prompt.user).toContain("This is flip 1 of at most 4.");
  });

  it("states the turn without a list of flips on turn 1", async () => {
    const prompt = await buildStPetersburgPrompt({ config, decisionStyle: "tool", flip: 1, history: [] });
    expect(prompt.user).toContain("This is flip 1 of at most 10.");
    expect(prompt.user).not.toContain("so far:");
  });

  it("carries the flips already made, each with the payoff of the face it landed on", async () => {
    const prompt = await buildStPetersburgPrompt({
      config,
      decisionStyle: "tool",
      flip: 3,
      history: [
        { flip: 1, face: "heads" },
        { flip: 2, face: "heads" },
      ],
    });

    expect(prompt.user).toContain("This is flip 3 of at most 10.");
    expect(prompt.user).toContain("- Flip 1: heads — the pot doubles.");
    expect(prompt.user).toContain("- Flip 2: heads — the pot doubles.");
  });

  it("closes with the wording each decision style calls for", async () => {
    const structured = await buildStPetersburgPrompt({ config, decisionStyle: "structured" });
    const tool = await buildStPetersburgPrompt({ config, decisionStyle: "tool" });
    const judgment = await buildStPetersburgPrompt({ config, decisionStyle: "judgment" });

    for (const prompt of [structured, tool, judgment]) {
      expect(prompt.user).toContain("`flip` — Flip the coin");
      expect(prompt.user).toContain("`walk` — Walk away");
    }

    expect(structured.user).toContain("`choice` field");
    expect(tool.user).toContain("calling the tool");
    expect(judgment.user).not.toContain("`choice` field");
  });
});
