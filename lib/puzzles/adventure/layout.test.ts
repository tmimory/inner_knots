import { describe, expect, it } from "vitest";

import type { Adventure, AdventureNode, AdventureOption } from "@/lib/domain/adventure";

import {
  ADVENTURE_LAYOUT,
  adventureExtent,
  adventureLayout,
  adventureNodeHeight,
  adventureShape,
  optionLaneCentre,
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

/**
 * How many pairs of edges between two neighbouring ranks cross each other.
 *
 * Two edges running from one rank to the next cross when the order of the handles
 * they leave from is the opposite of the order of the cards they arrive at. That
 * is the whole of what the sweep is for, so it is what the tests count.
 */
function crossings(adventure: Adventure, placed: ReadonlyMap<string, AdventurePoint>): number {
  const rankOf = ranksByDepth(adventure, placed);
  const links: { rank: number; sourceX: number; targetX: number }[] = [];

  for (const parent of adventure.nodes) {
    const from = placed.get(parent.id);
    if (!from) continue;
    parent.options.forEach((option, index) => {
      const target = option.nextNodeId;
      if (target === null) return;
      const to = placed.get(target);
      if (!to) return;
      const rank = rankOf.get(parent.id);
      // Only edges between neighbouring ranks: a skip edge crosses whatever it likes.
      if (rank === undefined || rankOf.get(target) !== rank + 1) return;
      links.push({
        rank,
        sourceX:
          from.x + optionLaneCentre(index, parent.options.length) * ADVENTURE_LAYOUT.nodeWidth,
        targetX: to.x + ADVENTURE_LAYOUT.nodeWidth / 2,
      });
    });
  }

  let crossed = 0;
  for (let a = 0; a < links.length; a += 1) {
    for (let b = a + 1; b < links.length; b += 1) {
      const one = links[a]!;
      const two = links[b]!;
      if (one.rank !== two.rank) continue;
      if ((one.sourceX - two.sourceX) * (one.targetX - two.targetX) < 0) crossed += 1;
    }
  }
  return crossed;
}

/** Which rank each card ended up on, read back off the coordinates. */
function ranksByDepth(
  adventure: Adventure,
  placed: ReadonlyMap<string, AdventurePoint>,
): Map<string, number> {
  const centres = adventure.nodes
    .filter((card) => placed.has(card.id))
    .map((card) => ({
      id: card.id,
      centreY: placed.get(card.id)!.y + adventureNodeHeight(card) / 2,
    }));
  const depths = [...new Set(centres.map((card) => card.centreY))].sort((a, b) => a - b);
  return new Map(centres.map((card) => [card.id, depths.indexOf(card.centreY)]));
}

/** The order the cards of one rank ended up in, left to right. */
function acrossRank(
  adventure: Adventure,
  placed: ReadonlyMap<string, AdventurePoint>,
  rank: number,
): string[] {
  const rankOf = ranksByDepth(adventure, placed);
  return adventure.nodes
    .filter((card) => rankOf.get(card.id) === rank)
    .sort((left, right) => positionOf(placed, left.id).x - positionOf(placed, right.id).x)
    .map((card) => card.id);
}

/**
 * A fork whose first option leads to the card dagre puts second.
 *
 * `A` is stored before `B`, so dagre places A on the left; the start's first
 * option leads to B and its second to A, so the two edges cross unless the ranks
 * are swept.
 */
function crossedFork(): Adventure {
  return {
    id: "adv-crossed",
    name: "A crossed fork",
    briefing: "",
    startNodeId: "start",
    nodes: [
      node("start", [option("o1", "B"), option("o2", "A")]),
      node("A", [option("a1", null)]),
      node("B", [option("b1", null)]),
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** The same crossing, one rank deeper: both children fork the wrong way round too. */
function crossedThreeDeep(): Adventure {
  return {
    id: "adv-deep",
    name: "A crossed tree",
    briefing: "",
    startNodeId: "start",
    nodes: [
      node("start", [option("o1", "B"), option("o2", "A")]),
      node("A", [option("a1", "D"), option("a2", "C")]),
      node("B", [option("b1", "F"), option("b2", "E")]),
      node("C", [option("c1", null)]),
      node("D", [option("d1", null)]),
      node("E", [option("e1", null)]),
      node("F", [option("f1", null)]),
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("adventureExtent", () => {
  it("reaches the far edge of the lowest and rightmost cards, plus the margin", () => {
    const adventure = tree();
    const placed = adventureLayout(adventure);
    const extent = adventureExtent(adventure);
    const right = Math.max(
      ...adventure.nodes.map((node) => positionOf(placed, node.id).x + ADVENTURE_LAYOUT.nodeWidth),
    );
    const bottom = Math.max(
      ...adventure.nodes.map((node) => positionOf(placed, node.id).y + adventureNodeHeight(node)),
    );
    expect(extent).toEqual({
      width: right + ADVENTURE_LAYOUT.margin,
      height: bottom + ADVENTURE_LAYOUT.margin,
    });
  });

  it("is empty for an adventure with no cards", () => {
    expect(adventureExtent({ ...tree(), nodes: [], startNodeId: "start" })).toEqual({
      width: ADVENTURE_LAYOUT.margin,
      height: ADVENTURE_LAYOUT.margin,
    });
  });
});

describe("optionLaneCentre", () => {
  it("centres the only handle a card has", () => {
    expect(optionLaneCentre(0, 1)).toBe(0.5);
    expect(optionLaneCentre(0, 0)).toBe(0.5);
  });

  it("gives each option the centre of its own lane", () => {
    expect(optionLaneCentre(0, 2)).toBe(0.25);
    expect(optionLaneCentre(1, 2)).toBe(0.75);
    expect(optionLaneCentre(1, 3)).toBe(0.5);
  });

  it("keeps the handles in the order of the option rows", () => {
    const lanes = [0, 1, 2, 3].map((index) => optionLaneCentre(index, 4));
    expect([...lanes].sort((a, b) => a - b)).toEqual(lanes);
    expect(Math.min(...lanes)).toBeGreaterThan(0);
    expect(Math.max(...lanes)).toBeLessThan(1);
  });
});

describe("adventureLayout ranks", () => {
  it("draws a plain fork with no crossings", () => {
    expect(crossings(tree(), adventureLayout(tree()))).toBe(0);
  });

  it("uncrosses a fork whose first option leads to the card dagre puts second", () => {
    const adventure = crossedFork();
    const placed = adventureLayout(adventure);
    expect(crossings(adventure, placed)).toBe(0);
    // Option 1 leads to B, so B sits under the leftmost handle.
    expect(acrossRank(adventure, placed, 1)).toEqual(["B", "A"]);
  });

  it("propagates the sweep down a third rank", () => {
    const adventure = crossedThreeDeep();
    const placed = adventureLayout(adventure);
    expect(crossings(adventure, placed)).toBe(0);
    expect(acrossRank(adventure, placed, 1)).toEqual(["B", "A"]);
    // B moved left, so its children come first, each under its own option's handle.
    expect(acrossRank(adventure, placed, 2)).toEqual(["F", "E", "D", "C"]);
  });

  it("keeps the rank's own slots, so spacing and width are dagre's", () => {
    const swept = [...adventureLayout(crossedFork()).values()].map((point) => point.x);
    const straight = [...adventureLayout(tree()).values()].map((point) => point.x);
    expect([...swept].sort((a, b) => a - b)).toEqual([...straight].sort((a, b) => a - b));
  });

  it("stays deterministic once swept", () => {
    expect([...adventureLayout(crossedThreeDeep())]).toEqual([
      ...adventureLayout(crossedThreeDeep()),
    ]);
  });

  it("leaves a card nothing points at where dagre put it", () => {
    const orphaned = crossedFork();
    orphaned.nodes = [...orphaned.nodes, node("loose", [option("l1", null)])];
    const placed = adventureLayout(orphaned);
    expect(placed.size).toBe(4);
    expect(crossings(orphaned, placed)).toBe(0);
  });
});
