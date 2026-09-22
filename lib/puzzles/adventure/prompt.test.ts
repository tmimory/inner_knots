import { describe, expect, it } from "vitest";

import type { AdventureNode } from "@/lib/domain/adventure";

import { adventureOptions, buildAdventurePrompt } from "./prompt";

const node: AdventureNode = {
  id: "n1",
  position: { x: 0, y: 0 },
  context: "The bridge is out and the river is rising.",
  decision: "How do you cross?",
  options: [
    { id: "o1", label: "Swim", outcome: "The current takes you downstream.", nextNodeId: "n2" },
    { id: "o2", label: "Wait", outcome: undefined, nextNodeId: null },
  ],
};

const history = [
  { decision: "Which road do you take?", choice: "The old road", outcome: "It is longer than you remember." },
  { decision: "Do you stop at the inn?", choice: "No" },
];

describe("buildAdventurePrompt", () => {
  it("takes its options from the node", () => {
    expect(adventureOptions(node)).toEqual([
      { id: "o1", label: "Swim" },
      { id: "o2", label: "Wait" },
    ]);
  });

  it("includes the briefing, the history, the node and the instructions", async () => {
    const prompt = await buildAdventurePrompt({
      briefing: "You are carrying a message to the capital.",
      node,
      history,
      amnesia: false,
      decisionStyle: "structured",
    });

    expect(prompt.user).toContain("You are carrying a message to the capital.");
    expect(prompt.user).toContain("What has happened so far:");
    expect(prompt.user).toContain("Which road do you take? You chose: The old road. It is longer than you remember.");
    expect(prompt.user).toContain("Do you stop at the inn? You chose: No.");
    expect(prompt.user).toContain("The bridge is out and the river is rising.");
    expect(prompt.user).toContain("How do you cross?");
    expect(prompt.user).toContain("`o1` — Swim");
    expect(prompt.options).toEqual([
      { id: "o1", label: "Swim" },
      { id: "o2", label: "Wait" },
    ]);
  });

  it("drops the history when the run is set to amnesia", async () => {
    const prompt = await buildAdventurePrompt({
      briefing: "You are carrying a message to the capital.",
      node,
      history,
      amnesia: true,
      decisionStyle: "structured",
    });

    expect(prompt.user).not.toContain("What has happened so far:");
    expect(prompt.user).toContain("The bridge is out and the river is rising.");
  });

  it("omits the history section on the first node", async () => {
    const prompt = await buildAdventurePrompt({
      briefing: "A briefing.",
      node,
      history: [],
      amnesia: false,
      decisionStyle: "tool",
    });
    expect(prompt.user).not.toContain("What has happened so far:");
  });

  it("closes with the wording each decision style calls for", async () => {
    const base = { briefing: "A briefing.", node, history: [], amnesia: false } as const;
    const structured = await buildAdventurePrompt({ ...base, decisionStyle: "structured" });
    const tool = await buildAdventurePrompt({ ...base, decisionStyle: "tool" });
    const judgment = await buildAdventurePrompt({ ...base, decisionStyle: "judgment" });

    for (const prompt of [structured, tool, judgment]) {
      expect(prompt.user).toContain("`o1` — Swim");
      expect(prompt.user).toContain("Abstaining is not one of them.");
    }

    expect(structured.user).toContain("`choice` field");
    expect(tool.user).toContain("calling the tool");
    expect(judgment.user).not.toContain("`choice` field");
    expect(judgment.user).not.toContain("calling the tool");
    expect(judgment.user).not.toContain("structured response");
  });
});
