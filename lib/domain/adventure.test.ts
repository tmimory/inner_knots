import { describe, expect, it } from "vitest";

import { validateAdventure, type AdventureNode } from "./adventure";

function node(id: string, options: AdventureNode["options"]): AdventureNode {
  return { id, position: { x: 0, y: 0 }, context: "", decision: "", options };
}

function option(id: string, nextNodeId: string | null) {
  return { id, label: id, nextNodeId };
}

describe("validateAdventure", () => {
  it("accepts a connected graph", () => {
    const issues = validateAdventure({
      startNodeId: "a",
      nodes: [node("a", [option("x", "b"), option("y", null)]), node("b", [option("z", null)])],
    });
    expect(issues).toEqual([]);
  });

  it("reports a missing start node", () => {
    const issues = validateAdventure({ startNodeId: "nope", nodes: [node("a", [option("x", null)])] });
    expect(issues.map((issue) => issue.code)).toContain("missing-start");
  });

  it("reports an option pointing at a node that is not there", () => {
    const issues = validateAdventure({ startNodeId: "a", nodes: [node("a", [option("x", "ghost")])] });
    const dangling = issues.find((issue) => issue.code === "dangling-option");
    expect(dangling).toMatchObject({ nodeId: "a", optionId: "x" });
  });

  it("reports a node with no options", () => {
    const issues = validateAdventure({ startNodeId: "a", nodes: [node("a", [])] });
    expect(issues.map((issue) => issue.code)).toContain("node-without-options");
  });

  it("reports a node nothing leads to", () => {
    const issues = validateAdventure({
      startNodeId: "a",
      nodes: [node("a", [option("x", null)]), node("orphan", [option("y", null)])],
    });
    expect(issues.find((issue) => issue.code === "unreachable-node")).toMatchObject({ nodeId: "orphan" });
  });

  it("follows cycles without hanging", () => {
    const issues = validateAdventure({
      startNodeId: "a",
      nodes: [node("a", [option("x", "b")]), node("b", [option("y", "a")])],
    });
    expect(issues).toEqual([]);
  });

  it("reports two nodes sharing an id", () => {
    const issues = validateAdventure({
      startNodeId: "a",
      nodes: [node("a", [option("x", null)]), node("a", [option("y", null)])],
    });
    expect(issues.map((issue) => issue.code)).toContain("duplicate-node-id");
  });
});
