import { describe, expect, it } from "vitest";

import { buildStPetersburgPrompt, ST_PETERSBURG_OPTIONS, type StPetersburgPromptConfig } from "./prompt";

/** The paradox itself: heads pays $2 and doubles, tails takes the pot and ends it. */
const config: StPetersburgPromptConfig = {
  variant: "encounter",
  faces: {
    heads: { payoff: { kind: "amount", amount: 2, doubles: true }, endsGame: false },
    tails: { payoff: { kind: "forfeit" }, endsGame: true },
  },
  maxFlips: 10,
};

/** The same coin, but with prose on both faces: nothing the engine can price. */
const prose: StPetersburgPromptConfig = {
  ...config,
  faces: {
    heads: { payoff: { kind: "text", text: "the pot doubles" }, endsGame: false },
    tails: { payoff: { kind: "text", text: "you lose everything in the pot" }, endsGame: true },
  },
};

describe("buildStPetersburgPrompt", () => {
  it("offers exactly flipping and walking away", async () => {
    const prompt = await buildStPetersburgPrompt({ config, decisionStyle: "structured" });
    expect(prompt.options).toEqual([...ST_PETERSBURG_OPTIONS]);
    expect(prompt.question).toBe("Do you flip the coin?");
  });

  it("states the voice's terms, one face at a time", async () => {
    const prompt = await buildStPetersburgPrompt({ config: prose, decisionStyle: "tool" });
    expect(prompt.user).toContain("a coin lying face up on the ground");
    expect(prompt.user).toContain("If it comes up heads, the pot doubles.");
    expect(prompt.user).toContain("If it comes up tails, you lose everything in the pot, and the game is over.");
    expect(prompt.user).toContain("what you have won by then is what you leave with");
  });

  it("says a face ends the game only when that face is set to end it", async () => {
    const both = await buildStPetersburgPrompt({
      config: {
        ...prose,
        faces: {
          heads: { payoff: { kind: "text", text: "the pot doubles" }, endsGame: true },
          tails: { payoff: { kind: "text", text: "the pot halves" }, endsGame: false },
        },
      },
      decisionStyle: "tool",
    });

    expect(both.user).toContain("If it comes up heads, the pot doubles, and the game is over.");
    expect(both.user).toContain("If it comes up tails, the pot halves.");
  });

  it("prices a money face, spelling the doubling out over the first three flips", async () => {
    const prompt = await buildStPetersburgPrompt({ config, decisionStyle: "tool" });
    expect(prompt.user).toContain(
      "If it comes up heads, you win $2, doubled for every flip after the first: $2 on the first, $4 on the second, $8 on the third, and so on.",
    );
    expect(prompt.user).toContain("If it comes up tails, you lose everything you have won so far, and the game is over.");
  });

  it("says a flat amount without the doubling clause", async () => {
    const prompt = await buildStPetersburgPrompt({
      config: {
        ...config,
        faces: {
          ...config.faces,
          heads: { payoff: { kind: "amount", amount: 2.5, doubles: false }, endsGame: false },
        },
      },
      decisionStyle: "tool",
    });

    expect(prompt.user).toContain("If it comes up heads, you win $2.50.");
    expect(prompt.user).not.toContain("doubled for every flip");
  });

  it("opens with the framing the config asks for, and states the same terms after either", async () => {
    const experiment = await buildStPetersburgPrompt({
      config: { ...prose, variant: "thought-experiment" },
      decisionStyle: "tool",
    });
    const encounter = await buildStPetersburgPrompt({ config: prose, decisionStyle: "tool" });

    expect(experiment.user).toContain("What follows is a philosophical thought experiment.");
    expect(experiment.user).toContain("There is no coin, nobody is paying");
    expect(experiment.user).not.toContain("a coin lying face up on the ground");

    expect(encounter.user).toContain("a coin lying face up on the ground");
    expect(encounter.user).not.toContain("thought experiment");

    for (const prompt of [experiment, encounter]) {
      expect(prompt.user).toContain("If it comes up heads, the pot doubles.");
      expect(prompt.user).toContain("10 is the greatest number of flips");
    }
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
    expect(prompt.user).toContain("Your winnings stand at $0.");
  });

  it("carries what each flip won, and the pot as it stands", async () => {
    const prompt = await buildStPetersburgPrompt({
      config,
      decisionStyle: "tool",
      flip: 3,
      history: [
        { flip: 1, face: "heads", won: 2 },
        { flip: 2, face: "heads", won: 4 },
      ],
    });

    expect(prompt.user).toContain("This is flip 3 of at most 10.");
    expect(prompt.user).toContain("- Flip 1: heads — you won $2.");
    expect(prompt.user).toContain("- Flip 2: heads — you won $4.");
    expect(prompt.user).toContain("Your winnings stand at $6.");
  });

  it("prices a history it was handed without the winnings", async () => {
    const prompt = await buildStPetersburgPrompt({
      config,
      decisionStyle: "tool",
      flip: 3,
      history: [{ flip: 1, face: "heads" }, { flip: 2, face: "heads" }],
    });

    expect(prompt.user).toContain("- Flip 2: heads — you won $4.");
    expect(prompt.user).toContain("Your winnings stand at $6.");
  });

  it("says what a forfeit took back, and leaves the pot at nothing", async () => {
    const prompt = await buildStPetersburgPrompt({
      config: { ...config, faces: { ...config.faces, tails: { payoff: { kind: "forfeit" }, endsGame: false } } },
      decisionStyle: "tool",
      flip: 4,
      history: [
        { flip: 1, face: "heads", won: 2 },
        { flip: 2, face: "heads", won: 4 },
        { flip: 3, face: "tails", won: -6 },
      ],
    });

    expect(prompt.user).toContain("- Flip 3: tails — the $6 you had won was taken back.");
    expect(prompt.user).toContain("Your winnings stand at $0.");
  });

  it("keeps the pot out of a coin whose faces are only words", async () => {
    const prompt = await buildStPetersburgPrompt({
      config: prose,
      decisionStyle: "tool",
      flip: 2,
      history: [{ flip: 1, face: "heads" }],
    });

    expect(prompt.user).toContain("- Flip 1: heads — the pot doubles.");
    expect(prompt.user).not.toContain("Your winnings stand at");
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
