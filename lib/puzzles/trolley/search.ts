/**
 * Searching, filtering and slugging the trolley object catalogue.
 *
 * The palette shows roughly seven hundred built-in objects plus whatever the user
 * has made, so narrowing them is the whole interaction. Everything here is pure
 * and free of React and react-native imports, like `catalogue.ts` beside it, so it
 * can be unit-tested in plain Node.
 */
import {
  CATALOGUE_FAMILIES,
  CATALOGUE_TAGS,
  type CatalogueFamily,
  type CatalogueTag,
  type TrolleyObject,
} from "./catalogue";

/** The tag every user-made object carries, so the palette can single them out. */
export const CUSTOM_TAG = "custom";

/**
 * The filter chips, grouped the way they are shown. Every tag in
 * `CATALOGUE_TAGS` appears exactly once, which {@link search.test} asserts, so a
 * new tag cannot quietly become unfilterable.
 */
export const TAG_GROUPS: Record<CatalogueFamily, readonly CatalogueTag[]> = {
  person: ["person", "stranger", "relation", "family", "partner", "child", "elderly", "occupation"],
  animal: ["animal", "pet", "livestock", "wild"],
  thing: ["thing", "money", "art", "knowledge", "tech"],
  group: ["group"],
};

/** Headings for the chip groups, in the order they are rendered. */
export const TAG_GROUP_ORDER: readonly CatalogueFamily[] = CATALOGUE_FAMILIES;

/** `"your neighbor's eldest daughter"` -> `"your-neighbors-eldest-daughter"`. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whether an id is already the slug it would be turned into, and non-empty. */
export function isSlug(value: string): boolean {
  return value !== "" && slugify(value) === value;
}

/** Case- and punctuation-insensitive: "neighbors daughter" finds the apostrophe one. */
function haystack(item: TrolleyObject): string {
  return `${item.id} ${item.label} ${item.prompt} ${item.tags.join(" ")}`
    .toLowerCase()
    .replace(/['’]/g, "");
}

/** Every whitespace-separated word of the query must appear somewhere in the item. */
export function matchesQuery(item: TrolleyObject, query: string): boolean {
  const words = query.toLowerCase().replace(/['’]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(item);
  return words.every((word) => text.includes(word));
}

/** An item passes the chips when it carries **every** tag that is switched on. */
export function matchesTags(item: TrolleyObject, tags: readonly string[]): boolean {
  return tags.every((tag) => item.tags.includes(tag));
}

export type CatalogueFilter = {
  query?: string;
  tags?: readonly string[];
};

/** The palette's visible set: the catalogue narrowed by the search box and the chips. */
export function filterCatalogue(
  items: readonly TrolleyObject[],
  filter: CatalogueFilter = {},
): TrolleyObject[] {
  const query = filter.query?.trim() ?? "";
  const tags = filter.tags ?? [];
  if (query === "" && tags.length === 0) return [...items];
  return items.filter((item) => matchesTags(item, tags) && matchesQuery(item, query));
}

/**
 * Custom objects first, then the built-in catalogue, with a custom object
 * replacing the built-in of the same id — the same precedence `prepareRun` uses
 * when it resolves a track, so the palette shows what a run would actually send.
 */
export function mergeCatalogue(
  builtIn: readonly TrolleyObject[],
  custom: readonly TrolleyObject[],
): TrolleyObject[] {
  const overridden = new Set(custom.map((item) => item.id));
  const tagged = custom.map((item) =>
    item.tags.includes(CUSTOM_TAG) ? item : { ...item, tags: [CUSTOM_TAG, ...item.tags] },
  );
  return [...tagged, ...builtIn.filter((item) => !overridden.has(item.id))];
}

/** Splits a list into rows of `perRow`, for a grid rendered as a virtualized list. */
export function chunk<T>(items: readonly T[], perRow: number): T[][] {
  const size = Math.max(1, Math.floor(perRow));
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

/**
 * A fresh random pair of tracks: `count` objects each, with no object on both.
 * Drawing from the whole catalogue once and splitting is what keeps the two
 * tracks distinct without rejection-sampling.
 */
export function randomTracks(
  items: readonly TrolleyObject[],
  count: number,
  draw: (pool: readonly TrolleyObject[], n: number) => TrolleyObject[],
): { track1: TrolleyObject[]; track2: TrolleyObject[] } {
  const both = draw(items, count * 2);
  return { track1: both.slice(0, count), track2: both.slice(count, count * 2) };
}
