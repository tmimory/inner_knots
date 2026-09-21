import { describe, expect, it } from "vitest";

import { ADVENTURE_LIMITS, adventureSchema, type Adventure } from "@/lib/domain/adventure";

import {
  addNode,
  addOption,
  copyOfAdventure,
  removeNode,
  removeOption,
  setNodePositions,
  setOptionTarget,
  setStartNode,
  starterAdventure,
  updateNode,
  updateOption,
} from "./edits";

function graph(): Adventure {
  return {
    id: "adv",
    name: "A fork",
    briefing: "",
    startNodeId: "start",
    nodes: [
      {
        id: "start",
        position: { x: 0, y: 0 },
        context: "",
        decision: "",
        options: [
          { id: "a", label: "left", nextNodeId: "left" },
          { id: "b", label: "right", nextNodeId: "right" },
        ],
      },
      { id: "left", position: { x: 0, y: 1 }, context: "", decision: "", options: [] },
      { id: "right", position: { x: 1, y: 1 }, context: "", decision: "", options: [] },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("starterAdventure", () => {
  it("is a storable adventure with one start node", () => {
    const started = starterAdventure();
    const parsed = adventureSchema.safeParse({
      ...started,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(started.nodes).toHaveLength(1);
    expect(started.nodes[0]?.id).toBe(started.startNodeId);
  });
});

describe("copyOfAdventure", () => {
  it("keeps the graph but takes a new id", () => {
    const copy = copyOfAdventure(graph());
    expect(copy.id).not.toBe("adv");
    expect(copy.startNodeId).toBe("start");
    expect(copy.nodes.map((node) => node.id)).toEqual(["start", "left", "right"]);
  });

  it("keeps the name within the store's limit", () => {
    const long = { ...graph(), name: "n".repeat(ADVENTURE_LIMITS.name) };
    expect(copyOfAdventure(long).name.length).toBeLessThanOrEqual(ADVENTURE_LIMITS.name);
  });
});

describe("removeNode", () => {
  it("turns the options that pointed at it into endings", () => {
    const after = removeNode(graph(), "left");
    expect(after.nodes.map((node) => node.id)).toEqual(["start", "right"]);
    expect(after.nodes[0]?.options[0]?.nextNodeId).toBeNull();
    expect(after.nodes[0]?.options[1]?.nextNodeId).toBe("right");
  });

  it("hands the start over to the first node left", () => {
    const after = removeNode(graph(), "start");
    expect(after.startNodeId).toBe("left");
  });

  it("leaves the start alone when it removes the last node", () => {
    const one = { ...graph(), nodes: [graph().nodes[0]!], startNodeId: "start" };
    expect(removeNode(one, "start").startNodeId).toBe("start");
  });
});

describe("options", () => {
  it("adds up to the limit and no further", () => {
    let adventure = graph();
    for (let index = 0; index < ADVENTURE_LIMITS.maxOptions + 2; index += 1) {
      adventure = addOption(adventure, "left");
    }
    expect(adventure.nodes[1]?.options).toHaveLength(ADVENTURE_LIMITS.maxOptions);
  });

  it("edits and removes one option without touching its siblings", () => {
    const renamed = updateOption(graph(), "start", "a", { label: "port", outcome: "wet feet" });
    expect(renamed.nodes[0]?.options[0]).toMatchObject({ label: "port", outcome: "wet feet" });
    expect(renamed.nodes[0]?.options[1]?.label).toBe("right");

    const pruned = removeOption(renamed, "start", "a");
    expect(pruned.nodes[0]?.options.map((option) => option.id)).toEqual(["b"]);
  });

  it("writes an edge as a target and an ending as null", () => {
    expect(setOptionTarget(graph(), "start", "a", "right").nodes[0]?.options[0]?.nextNodeId).toBe(
      "right",
    );
    expect(setOptionTarget(graph(), "start", "a", null).nodes[0]?.options[0]?.nextNodeId).toBeNull();
  });
});

describe("nodes", () => {
  it("adds a node at the given spot", () => {
    const after = addNode(graph(), { x: 9, y: 9 });
    expect(after.nodes).toHaveLength(4);
    expect(after.nodes[3]?.position).toEqual({ x: 9, y: 9 });
  });

  it("edits a node's own fields only", () => {
    const after = updateNode(graph(), "left", { decision: "Which way?" });
    expect(after.nodes[1]?.decision).toBe("Which way?");
    expect(after.nodes[0]?.decision).toBe("");
  });

  it("moves the start", () => {
    expect(setStartNode(graph(), "right").startNodeId).toBe("right");
  });
});

describe("setNodePositions", () => {
  it("returns the same object when nothing moved", () => {
    const before = graph();
    const same = setNodePositions(before, new Map([["start", { x: 0, y: 0 }]]));
    expect(same).toBe(before);
  });

  it("rounds the coordinates it does write", () => {
    const after = setNodePositions(graph(), new Map([["start", { x: 10.4, y: -3.6 }]]));
    expect(after.nodes[0]?.position).toEqual({ x: 10, y: -4 });
  });
});
