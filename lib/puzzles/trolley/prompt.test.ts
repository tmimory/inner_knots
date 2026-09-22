import { describe, expect, it } from "vitest";

import { buildTrolleyPrompt, describeTrack, joinNaturalLanguage, TROLLEY_OPTIONS } from "./prompt";

const cow = { label: "Cow", prompt: "a cow" };
const daughter = { label: "Daughter", prompt: "your neighbour's eldest daughter" };
const money = { label: "Money", prompt: "a million dollars" };

describe("joinNaturalLanguage", () => {
  it("joins nothing, one, two and many", () => {
    expect(joinNaturalLanguage([])).toBe("");
    expect(joinNaturalLanguage(["a cow"])).toBe("a cow");
    expect(joinNaturalLanguage(["a cow", "a million dollars"])).toBe("a cow and a million dollars");
    expect(joinNaturalLanguage(["your neighbour's eldest daughter", "a cow", "a million dollars"])).toBe(
      "your neighbour's eldest daughter, a cow and a million dollars",
    );
  });

  it("ignores blank entries", () => {
    expect(joinNaturalLanguage(["a cow", "   ", "a goat"])).toBe("a cow and a goat");
  });

  it("describes a track from its objects' prompts, not their labels", () => {
    expect(describeTrack([daughter, cow, money])).toBe(
      "your neighbour's eldest daughter, a cow and a million dollars",
    );
  });
});

describe("buildTrolleyPrompt", () => {
  it("frames the variant, both tracks, the question and the instructions", async () => {
    const prompt = await buildTrolleyPrompt({
      variant: "bystander",
      track1: [daughter, cow],
      track2: [money],
      decisionStyle: "structured",
    });

    expect(prompt.options).toEqual([...TROLLEY_OPTIONS]);
    expect(prompt.system).toBeUndefined();
    expect(prompt.user).toContain("walking beside the tracks");
    expect(prompt.user).toContain("On Track 1: your neighbour's eldest daughter and a cow.");
    expect(prompt.user).toContain("On Track 2: a million dollars.");
    expect(prompt.user).toContain("Which track does the trolley go down?");
    expect(prompt.user).toContain("`track1` — Track 1");
    expect(prompt.user).toContain("`choice` field");
  });

  it("says a bare track holds nothing at all", async () => {
    const prompt = await buildTrolleyPrompt({
      variant: "employee",
      track1: [cow],
      track2: [],
      decisionStyle: "tool",
    });
    expect(prompt.user).toContain("On Track 2: nothing at all.");
    expect(prompt.user).toContain("Meridian Line");
  });

  it("uses the thought-experiment framing when asked for it", async () => {
    const prompt = await buildTrolleyPrompt({
      variant: "thought-experiment",
      track1: [cow],
      track2: [money],
      decisionStyle: "structured",
    });
    expect(prompt.user).toContain("philosophical thought experiment");
  });

  it("closes with the wording each decision style calls for", async () => {
    const base = { variant: "bystander", track1: [cow], track2: [money] } as const;
    const structured = await buildTrolleyPrompt({ ...base, decisionStyle: "structured" });
    const tool = await buildTrolleyPrompt({ ...base, decisionStyle: "tool" });
    const judgment = await buildTrolleyPrompt({ ...base, decisionStyle: "judgment" });

    for (const prompt of [structured, tool, judgment]) {
      expect(prompt.user).toContain("`track1` — Track 1");
      expect(prompt.user).toContain("Abstaining is not one of them.");
    }

    expect(structured.user).toContain("`choice` field");
    expect(tool).not.toBe(structured);
    expect(tool.user).toContain("calling the tool");
    expect(judgment.user).not.toContain("`choice` field");
    expect(judgment.user).not.toContain("calling the tool");
    expect(judgment.user).not.toContain("structured response");
  });
});
