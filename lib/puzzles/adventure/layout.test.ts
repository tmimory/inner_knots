import { describe, expect, it } from "vitest";

import type { Adventure, AdventureNode, AdventureOption } from "@/lib/domain/adventure";

import { ADVENTURE_LAYOUT, adventureNodeHeight, layoutAdventure } from "./layout";

function option(id: string, nextNodeId: string | null): AdventureOption {
  return { id, label: id, nextNodeId };
}

function node(id: string, options: AdventureOption[]): AdventureNode {
  return { id, position: { x: 0, y: 0 }, context: "", decision: "", options };
}

/** start -> (left | right), both of which end. */
function tree(): Adventure {
  return {
    id: "adv",
    name: "A fork",
    briefing: "",
    startNodeId: "start",
    nodes: [
      node("start", [option("a", "left"), option("b", "right")]),
      node("left", [option("c", null)]),
      node("right", [option("d", null)]),
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function positionOf(adventure: Adventure, id: string): { x: number; y: number } {
  const found = adventure.nodes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found.position;
}

describe("adventureNodeHeight", () => {
  it("grows by one row per option", () => {
    expect(adventureNodeHeight({ options: [] })).toBe(ADVENTURE_LAYOUT.nodeHeaderHeight);
    expect(adventureNodeHeight({ options: [option("a", null), option("b", null)] })).toBe(
      ADVENTURE_LAYOUT.nodeHeaderHeight + 2 * ADVENTURE_LAYOUT.nodeOptionHeight,
    );
  });
});

describe("layoutAdventure", () => {
  it("gives every node a finite position", () => {
    const laid = layoutAdventure(tree());
    for (const placed of laid.nodes) {
      expect(Number.isFinite(placed.position.x)).toBe(true);
      expect(Number.isFinite(placed.position.y)).toBe(true);
      expect(Number.isInteger(placed.position.x)).toBe(true);
      expect(Number.isInteger(placed.position.y)).toBe(true);
    }
  });

  it("puts the start node left of the nodes its options lead to", () => {
    const laid = layoutAdventure(tree());
    expect(positionOf(laid, "start").x).toBeLessThan(positionOf(laid, "left").x);
    expect(positionOf(laid, "start").x).toBeLessThan(positionOf(laid, "right").x);
  });

  it("leaves a straight run between ranks for the edge label", () => {
    const laid = layoutAdventure(tree());
    const start = positionOf(laid, "start");
    const left = positionOf(laid, "left");
    // The edge crosses the gap between the right edge of one card and the left
    // edge of the next, and a forking node's edges carry the option's name on it.
    expect(left.x - (start.x + ADVENTURE_LAYOUT.nodeWidth)).toBeGreaterThanOrEqual(
      ADVENTURE_LAYOUT.rankGap,
    );
  });

  it("separates siblings vertically by at least the node gap", () => {
    const laid = layoutAdventure(tree());
    const left = positionOf(laid, "left");
    const right = positionOf(laid, "right");
    expect(Math.abs(left.y - right.y)).toBeGreaterThanOrEqual(ADVENTURE_LAYOUT.nodeGap);
  });

  it("is deterministic", () => {
    const first = layoutAdventure(tree());
    const second = layoutAdventure(tree());
    expect(second.nodes.map((placed) => placed.position)).toEqual(
      first.nodes.map((placed) => placed.position),
    );
  });

  it("keeps everything but the positions", () => {
    const before = tree();
    const after = layoutAdventure(before);
    expect(after.nodes.map(({ position, ...rest }) => rest)).toEqual(
      before.nodes.map(({ position, ...rest }) => rest),
    );
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(after.startNodeId).toBe(before.startNodeId);
  });

  it("ignores an option that points at a node the graph does not have", () => {
    const broken = tree();
    broken.nodes[1] = node("left", [option("c", "nowhere")]);
    expect(() => layoutAdventure(broken)).not.toThrow();
    expect(layoutAdventure(broken).nodes).toHaveLength(broken.nodes.length);
  });

  it("survives a loop", () => {
    const looped = tree();
    looped.nodes[1] = node("left", [option("c", "start")]);
    const laid = layoutAdventure(looped);
    expect(laid.nodes.every((placed) => Number.isFinite(placed.position.x))).toBe(true);
  });
});
