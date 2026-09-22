import { describe, expect, it } from "vitest";

import type { Adventure, AdventureNode, AdventureOption } from "@/lib/domain/adventure";

import {
  ADVENTURE_LAYOUT,
  adventureLayout,
  adventureNodeHeight,
  adventureShape,
  type AdventurePoint,
} from "./layout";

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

function positionOf(placed: ReadonlyMap<string, AdventurePoint>, id: string): AdventurePoint {
  const found = placed.get(id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

describe("adventureNodeHeight", () => {
  it("grows by one row per option", () => {
    expect(adventureNodeHeight({ options: [] })).toBe(ADVENTURE_LAYOUT.nodeHeaderHeight);
    expect(adventureNodeHeight({ options: [option("a", null), option("b", null)] })).toBe(
      ADVENTURE_LAYOUT.nodeHeaderHeight + 2 * ADVENTURE_LAYOUT.nodeOptionHeight,
    );
  });
});

describe("adventureShape", () => {
  it("ignores the prose", () => {
    const before = tree();
    const after = tree();
    after.nodes[0] = { ...after.nodes[0]!, decision: "Who do you leave?", context: "Rain." };
    expect(adventureShape(after)).toBe(adventureShape(before));
  });

  it("changes when an option is pointed somewhere else", () => {
    const rewired = tree();
    rewired.nodes[0] = node("start", [option("a", "left"), option("b", null)]);
    expect(adventureShape(rewired)).not.toBe(adventureShape(tree()));
  });

  it("changes when a card is added", () => {
    const grown = tree();
    grown.nodes = [...grown.nodes, node("extra", [])];
    expect(adventureShape(grown)).not.toBe(adventureShape(tree()));
  });
});

describe("adventureLayout", () => {
  it("places every node at a whole, finite coordinate", () => {
    const placed = adventureLayout(tree());
    expect(placed.size).toBe(3);
    for (const point of placed.values()) {
      expect(Number.isInteger(point.x)).toBe(true);
      expect(Number.isInteger(point.y)).toBe(true);
    }
  });

  it("puts the start node above the nodes its options lead to", () => {
    const placed = adventureLayout(tree());
    expect(positionOf(placed, "start").y).toBeLessThan(positionOf(placed, "left").y);
    expect(positionOf(placed, "start").y).toBeLessThan(positionOf(placed, "right").y);
  });

  it("leaves a straight run between ranks for the edge to turn in", () => {
    const placed = adventureLayout(tree());
    const start = positionOf(placed, "start");
    const left = positionOf(placed, "left");
    // The edge crosses the gap between the bottom edge of one card and the top
    // edge of the next, leaving room to step out, jog across and turn back in.
    const startHeight = adventureNodeHeight(tree().nodes[0]!);
    expect(left.y - (start.y + startHeight)).toBeGreaterThanOrEqual(ADVENTURE_LAYOUT.rankGap);
  });

  it("separates siblings horizontally by at least the node gap", () => {
    const placed = adventureLayout(tree());
    const left = positionOf(placed, "left");
    const right = positionOf(placed, "right");
    expect(Math.abs(left.x - right.x)).toBeGreaterThanOrEqual(
      ADVENTURE_LAYOUT.nodeWidth + ADVENTURE_LAYOUT.nodeGap,
    );
  });

  it("keeps siblings on the same rank", () => {
    const placed = adventureLayout(tree());
    expect(positionOf(placed, "left").y).toBe(positionOf(placed, "right").y);
  });

  it("is deterministic", () => {
    expect([...adventureLayout(tree())]).toEqual([...adventureLayout(tree())]);
  });

  it("ignores an option that points at a node the graph does not have", () => {
    const broken = tree();
    broken.nodes[1] = node("left", [option("c", "nowhere")]);
    expect(() => adventureLayout(broken)).not.toThrow();
    expect(adventureLayout(broken).size).toBe(broken.nodes.length);
  });

  it("ignores the stored position entirely", () => {
    const moved = tree();
    moved.nodes = moved.nodes.map((placed) => ({ ...placed, position: { x: 9999, y: -9999 } }));
    expect([...adventureLayout(moved)]).toEqual([...adventureLayout(tree())]);
  });

  it("survives a loop", () => {
    const looped = tree();
    looped.nodes[1] = node("left", [option("c", "start")]);
    const placed = adventureLayout(looped);
    expect(placed.size).toBe(3);
    expect([...placed.values()].every((point) => Number.isFinite(point.y))).toBe(true);
  });
});
