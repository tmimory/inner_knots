/**
 * The object icon ids, in picker order.
 *
 * This file is deliberately plain TypeScript with no JSX and no React import, so
 * `lib/puzzles/trolley/catalogue.ts` and its test can check an icon id without
 * pulling the SVG components (and therefore react-native-svg) into Node.
 */
export const OBJECT_ICON_IDS = [
  "person",
  "man",
  "woman",
  "elder-man",
  "elder-woman",
  "pregnant-woman",
  "teen",
  "child",
  "boy",
  "girl",
  "baby",
  "couple",
  "group",
  "dog",
  "puppy",
  "cat",
  "kitten",
  "bird",
  "hamster",
  "cow",
  "bull",
  "calf",
  "horse",
  "sheep",
  "goat",
  "pig",
  "chicken",
  "rhino",
  "money",
  "gold",
  "painting",
  "sculpture",
  "book",
  "scroll",
  "robot",
  "crate",
  "question",
] as const;

export type ObjectIconId = (typeof OBJECT_ICON_IDS)[number];

const ids = new Set<string>(OBJECT_ICON_IDS);

/** Narrow an arbitrary string to a known icon id. */
export function isObjectIconId(value: string): value is ObjectIconId {
  return ids.has(value);
}
