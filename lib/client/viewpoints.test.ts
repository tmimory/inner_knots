import { describe, expect, it } from "vitest";

import type { Character } from "@/lib/domain/character";

import { seatedCharacters, viewpointsOf } from "./viewpoints";

function character(overrides: Partial<Character> & Pick<Character, "id">): Character {
  return {
    name: undefined,
    avatar: { shape: "owl", color: "ink" },
    provider: "anthropic",
    model: "claude-sonnet-5",
    outputMode: "structured",
    steering: { mode: "raw", principles: [], values: [] },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("viewpointsOf", () => {
  it("derives the style from the provider and the output mode", () => {
    const viewpoints = viewpointsOf([
      character({ id: "socrates" }),
      character({ id: "hobbes", outputMode: "tool" }),
      character({ id: "zeno", provider: "typesafe", outputMode: "structured" }),
      character({ id: "jev", provider: "typesafe", outputMode: "tool" }),
    ]);

    expect(viewpoints.map((viewpoint) => viewpoint.decisionStyle)).toEqual([
      "structured",
      "tool",
      "judgment",
      "judgment",
    ]);
  });

  it("labels a viewpoint with the display name and carries its face", () => {
    const [named, unnamed] = viewpointsOf([
      character({ id: "zeno", name: "Zeno of Citium", avatar: { shape: "fox", color: "madder" } }),
      character({ id: "hobbes" }),
    ]);

    expect(named).toMatchObject({
      id: "zeno",
      label: "Zeno of Citium",
      provider: "anthropic",
      avatar: { shape: "fox", color: "madder" },
    });
    expect(unnamed?.label).toBe("hobbes");
  });

  it("keeps one chip per character when a roster seats the same one twice", () => {
    const viewpoints = viewpointsOf([
      character({ id: "socrates" }),
      character({ id: "socrates" }),
      character({ id: "hobbes" }),
    ]);

    expect(viewpoints.map((viewpoint) => viewpoint.id)).toEqual(["socrates", "hobbes"]);
  });

  it("has nothing to offer for an empty roster", () => {
    expect(viewpointsOf([])).toEqual([]);
  });
});

describe("seatedCharacters", () => {
  const socrates = character({ id: "socrates" });
  const zeno = character({ id: "zeno", provider: "typesafe" });
  const byId = new Map([
    [socrates.id, socrates],
    [zeno.id, zeno],
  ]);

  it("resolves the roster in seat order", () => {
    const seated = seatedCharacters(
      [
        { characterId: "zeno", runs: 1 },
        { characterId: "socrates", runs: 1 },
      ],
      byId,
    );

    expect(seated.map((entry) => entry.id)).toEqual(["zeno", "socrates"]);
  });

  it("drops an id the collection no longer knows", () => {
    const seated = seatedCharacters(
      [
        { characterId: "diogenes", runs: 1 },
        { characterId: "socrates", runs: 1 },
      ],
      byId,
    );

    expect(seated.map((entry) => entry.id)).toEqual(["socrates"]);
  });
});
