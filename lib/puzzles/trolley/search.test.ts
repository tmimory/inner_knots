import { describe, expect, it } from "vitest";

import { buildCatalogue, CATALOGUE_TAGS, type TrolleyObject } from "./catalogue";
import {
  CUSTOM_TAG,
  chunk,
  filterCatalogue,
  isSlug,
  matchesQuery,
  matchesTags,
  mergeCatalogue,
  randomTracks,
  slugify,
  TAG_GROUPS,
} from "./search";

function object(partial: Partial<TrolleyObject> & { id: string }): TrolleyObject {
  return {
    label: partial.id,
    prompt: partial.id,
    icon: "question",
    builtIn: true,
    tags: [],
    ...partial,
  };
}

describe("TAG_GROUPS", () => {
  it("covers every catalogue tag exactly once", () => {
    const grouped = Object.values(TAG_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...CATALOGUE_TAGS].sort());
  });
});

describe("slugify", () => {
  it("drops apostrophes rather than turning them into separators", () => {
    expect(slugify("your neighbor's eldest daughter")).toBe("your-neighbors-eldest-daughter");
    expect(slugify("your neighbor’s eldest daughter")).toBe("your-neighbors-eldest-daughter");
  });

  it("collapses punctuation and trims the edges", () => {
    expect(slugify("  A million $$ dollars!  ")).toBe("a-million-dollars");
  });

  it("agrees with the catalogue's own ids", () => {
    for (const item of buildCatalogue()) expect(isSlug(item.id)).toBe(true);
  });

  it("rejects anything that is not already a slug", () => {
    expect(isSlug("")).toBe(false);
    expect(isSlug("Has Spaces")).toBe(false);
    expect(isSlug("-leading")).toBe(false);
    expect(isSlug("good-id-7")).toBe(true);
  });
});

describe("matchesQuery", () => {
  const item = object({
    id: "your-neighbors-eldest-daughter",
    label: "Your neighbor's eldest daughter",
    prompt: "your neighbor's eldest daughter",
    tags: ["person", "relation"],
  });

  it("matches every word, in any order, ignoring case and apostrophes", () => {
    expect(matchesQuery(item, "daughter neighbors")).toBe(true);
    expect(matchesQuery(item, "NEIGHBOR'S")).toBe(true);
    expect(matchesQuery(item, "eldest brother")).toBe(false);
  });

  it("matches tags as well as the words", () => {
    expect(matchesQuery(item, "relation")).toBe(true);
  });

  it("treats an empty query as no filter", () => {
    expect(matchesQuery(item, "   ")).toBe(true);
  });
});

describe("matchesTags", () => {
  const item = object({ id: "a-cow", tags: ["animal", "livestock"] });

  it("requires all of the selected tags", () => {
    expect(matchesTags(item, [])).toBe(true);
    expect(matchesTags(item, ["animal"])).toBe(true);
    expect(matchesTags(item, ["animal", "livestock"])).toBe(true);
    expect(matchesTags(item, ["animal", "pet"])).toBe(false);
  });
});

describe("filterCatalogue", () => {
  const items = [
    object({ id: "a-cow", label: "Cow", prompt: "a cow", tags: ["animal", "livestock"] }),
    object({ id: "a-dog", label: "Dog", prompt: "a dog", tags: ["animal", "pet"] }),
    object({ id: "the-mona-lisa", label: "Mona Lisa", prompt: "the Mona Lisa", tags: ["thing", "art"] }),
  ];

  it("returns a copy when nothing is filtering", () => {
    const all = filterCatalogue(items);
    expect(all).toEqual(items);
    expect(all).not.toBe(items);
  });

  it("combines the query and the chips", () => {
    expect(filterCatalogue(items, { tags: ["animal"] }).map((item) => item.id)).toEqual([
      "a-cow",
      "a-dog",
    ]);
    expect(filterCatalogue(items, { query: "mona" }).map((item) => item.id)).toEqual([
      "the-mona-lisa",
    ]);
    expect(filterCatalogue(items, { query: "cow", tags: ["thing"] })).toEqual([]);
  });
});

describe("mergeCatalogue", () => {
  const builtIn = [object({ id: "a-cow" }), object({ id: "a-dog" })];

  it("puts custom objects first and tags them", () => {
    const merged = mergeCatalogue(builtIn, [object({ id: "my-thing", builtIn: false })]);
    expect(merged.map((item) => item.id)).toEqual(["my-thing", "a-cow", "a-dog"]);
    expect(merged[0]?.tags).toContain(CUSTOM_TAG);
  });

  it("lets a custom object replace the built-in of the same id", () => {
    const merged = mergeCatalogue(builtIn, [
      object({ id: "a-cow", label: "My cow", builtIn: false }),
    ]);
    expect(merged.map((item) => item.id)).toEqual(["a-cow", "a-dog"]);
    expect(merged[0]?.label).toBe("My cow");
  });

  it("does not tag an object that already says it is custom", () => {
    const merged = mergeCatalogue([], [object({ id: "x", tags: [CUSTOM_TAG, "thing"] })]);
    expect(merged[0]?.tags).toEqual([CUSTOM_TAG, "thing"]);
  });
});

describe("chunk", () => {
  it("splits into rows of the requested width", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("never produces a zero-width row", () => {
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("randomTracks", () => {
  it("splits one draw in two, so no object lands on both tracks", () => {
    const items = Array.from({ length: 20 }, (_, index) => object({ id: `item-${index}` }));
    const { track1, track2 } = randomTracks(items, 5, (pool, n) => pool.slice(0, n));
    expect(track1).toHaveLength(5);
    expect(track2).toHaveLength(5);
    const ids = new Set([...track1, ...track2].map((item) => item.id));
    expect(ids.size).toBe(10);
  });

  it("gives back what it can when the pool is short", () => {
    const items = [object({ id: "only" })];
    const { track1, track2 } = randomTracks(items, 5, (pool, n) => pool.slice(0, n));
    expect(track1).toHaveLength(1);
    expect(track2).toHaveLength(0);
  });
});
