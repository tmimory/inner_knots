import { describe, expect, it } from "vitest";

import { OBJECT_ICON_IDS } from "@/components/icons/objects/ids";

import {
  CATALOGUE_FAMILIES,
  CATALOGUE_TAGS,
  buildCatalogue,
  familyOf,
  randomSelection,
  type TrolleyObject,
} from "./catalogue";

/** Mirrors TROLLEY_OBJECT_LIMITS in lib/domain, which this file must stay under. */
const LIMITS = { id: 64, label: 80, prompt: 250, maxTags: 10, tag: 40 };

/** A deterministic generator, so a failing draw can be reproduced exactly. */
function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const catalogue = buildCatalogue();
const icons = new Set<string>(OBJECT_ICON_IDS);
const tags = new Set<string>(CATALOGUE_TAGS);

describe("buildCatalogue", () => {
  it("produces a catalogue of the intended size", () => {
    expect(catalogue.length).toBeGreaterThanOrEqual(300);
    expect(catalogue.length).toBeLessThanOrEqual(500);
  });

  it("gives every object a unique id", () => {
    const ids = catalogue.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses icons the icon set actually has", () => {
    const missing = [...new Set(catalogue.filter((item) => !icons.has(item.icon)).map((i) => i.icon))];
    expect(missing).toEqual([]);
  });

  it("stays inside the TrolleyObject field limits", () => {
    for (const item of catalogue) {
      expect(item.id.length, item.id).toBeLessThanOrEqual(LIMITS.id);
      expect(item.label.length, item.id).toBeLessThanOrEqual(LIMITS.label);
      expect(item.prompt.length, item.id).toBeLessThanOrEqual(LIMITS.prompt);
      expect(item.tags.length, item.id).toBeLessThanOrEqual(LIMITS.maxTags);
      for (const tag of item.tags) expect(tag.length).toBeLessThanOrEqual(LIMITS.tag);
    }
  });

  it("marks everything as built in, with a non-empty label and prompt", () => {
    for (const item of catalogue) {
      expect(item.builtIn).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.prompt.length).toBeGreaterThan(0);
    }
  });

  it("only uses tags from the filter vocabulary, and uses all of them", () => {
    const used = new Set(catalogue.flatMap((item) => item.tags));
    expect([...used].filter((tag) => !tags.has(tag))).toEqual([]);
    expect(CATALOGUE_TAGS.filter((tag) => !used.has(tag))).toEqual([]);
  });

  it("never generates a nonsensical combination", () => {
    const banned = [
      /\bpregnant (man|boy|father|husband|son|brother|grandfather|stranger|person)\b/,
      /\b(old|elderly|young) (baby|newborn|toddler|child|boy|girl|teenager|tween)\b/,
      /\bstray (parrot|hamster|pet)\b/,
    ];
    for (const item of catalogue) {
      for (const pattern of banned) {
        expect(pattern.test(item.prompt), `${item.prompt} matched ${String(pattern)}`).toBe(false);
      }
    }
  });

  it("derives ids and labels from the prompt", () => {
    const daughter = catalogue.find((item) => item.prompt === "your neighbor's eldest daughter");
    expect(daughter).toMatchObject({
      id: "your-neighbors-eldest-daughter",
      label: "Your Neighbor's Eldest Daughter",
      icon: "girl",
      builtIn: true,
    });
    expect(daughter?.tags).toContain("relation");

    const woman = catalogue.find((item) => item.prompt === "a pregnant woman");
    expect(woman?.icon).toBe("pregnant-woman");
    expect(woman?.label).toBe("Pregnant Woman");

    const lisa = catalogue.find((item) => item.prompt === "the Mona Lisa");
    expect(lisa?.label).toBe("Mona Lisa");
  });

  it("covers every family of object", () => {
    for (const family of CATALOGUE_FAMILIES) {
      expect(catalogue.some((item) => familyOf(item) === family)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(buildCatalogue()).toEqual(catalogue);
  });
});

describe("randomSelection", () => {
  it("returns n distinct objects from the catalogue", () => {
    const picked = randomSelection(catalogue, 10, seededRng(7));
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((item) => item.id)).size).toBe(10);
    const ids = new Set(catalogue.map((item) => item.id));
    for (const item of picked) expect(ids.has(item.id)).toBe(true);
  });

  it("spreads a draw across the families rather than stacking one", () => {
    const families = new Set(randomSelection(catalogue, 10, seededRng(3)).map(familyOf));
    expect(families.size).toBeGreaterThanOrEqual(3);
  });

  it("is reproducible for a given generator", () => {
    const left = randomSelection(catalogue, 8, seededRng(99)).map((item) => item.id);
    const right = randomSelection(catalogue, 8, seededRng(99)).map((item) => item.id);
    expect(left).toEqual(right);
  });

  it("never returns more than the catalogue holds", () => {
    const small: TrolleyObject[] = catalogue.slice(0, 3);
    expect(randomSelection(small, 10, seededRng(1))).toHaveLength(3);
    expect(randomSelection(catalogue, 0, seededRng(1))).toHaveLength(0);
  });
});
