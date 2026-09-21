/**
 * The built-in trolley object catalogue.
 *
 * Nothing here is hand-listed row by row. The catalogue is a small grammar —
 * nouns × modifiers, possessors × roles, possessors × animals — expanded
 * deterministically, so "your neighbor's youngest daughter" exists without anyone
 * typing it, and so adding one modifier adds a dozen objects at once.
 *
 * `buildCatalogue()` is pure: two calls produce deeply equal results in the same
 * order. Custom objects from `data/objects.jsonl` are merged in elsewhere.
 */

/**
 * Shape-compatible with `TrolleyObject` in `lib/domain`, minus the timestamps the
 * store adds. Declared locally so the generator stays dependency-free and testable
 * in plain Node.
 */
export type TrolleyObject = {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  builtIn: boolean;
  tags: string[];
};

/**
 * The closed tag vocabulary, in the order the filter chips show it. Every tag any
 * built-in object carries comes from this list.
 */
export const CATALOGUE_TAGS = [
  "person",
  "stranger",
  "relation",
  "family",
  "partner",
  "child",
  "elderly",
  "occupation",
  "animal",
  "pet",
  "livestock",
  "wild",
  "thing",
  "money",
  "art",
  "knowledge",
  "tech",
  "group",
] as const;

export type CatalogueTag = (typeof CATALOGUE_TAGS)[number];

const TAG_ORDER = new Map<string, number>(CATALOGUE_TAGS.map((tag, index) => [tag, index]));

/** Words that stay lowercase inside a label unless they lead it. */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

/**
 * Apostrophes are dropped rather than turned into separators, so "your
 * neighbor's" reads as one word in both an id and a search. Exported because
 * every place that compares user text against a catalogue entry has to strip
 * them the same way.
 */
export function stripApostrophes(text: string): string {
  return text.replace(/['’]/g, "");
}

/**
 * `"your neighbor's eldest daughter"` -> `"your-neighbors-eldest-daughter"`.
 *
 * The one id rule. Built-in ids are derived with it here, and the object creator
 * derives and validates a user's id with it through `slugify` in `search.ts`, so
 * the two halves of the catalogue share one id-space by construction rather than
 * by two implementations agreeing.
 */
export function slug(text: string): string {
  return stripApostrophes(text.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip a leading article and title-case the rest, preserving existing capitals. */
function label(prompt: string): string {
  const withoutArticle = prompt.replace(/^(a|an|the)\s+/i, "");
  return withoutArticle
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** `"a"` or `"an"`, by the sound of the phrase it precedes. */
function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? "an" : "a";
}

/** Drop duplicates and put the tags back into `CATALOGUE_TAGS` order. */
function orderTags(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort(
    (left, right) => (TAG_ORDER.get(left) ?? 0) - (TAG_ORDER.get(right) ?? 0),
  );
}

/** Build one object from its prompt; id and label are derived, never hand-written. */
function object(prompt: string, icon: string, tags: readonly string[]): TrolleyObject {
  return { id: slug(prompt), label: label(prompt), prompt, icon, builtIn: true, tags: orderTags(tags) };
}

/* ------------------------------------------------------------------ people -- */

type ModifierId =
  | "young"
  | "old"
  | "elderly"
  | "pregnant"
  | "sick"
  | "sleeping"
  | "famous"
  | "homeless"
  | "wealthy";

type Modifier = {
  word: string;
  tags: readonly CatalogueTag[];
  /** Icon swaps this modifier forces, keyed by the noun's own icon. */
  icons?: Readonly<Record<string, string>>;
};

/** Only the gendered figures have an elderly glyph; a neutral noun keeps its own. */
const AGED_ICONS = { man: "elder-man", woman: "elder-woman" } as const;

const MODIFIERS: Record<ModifierId, Modifier> = {
  young: { word: "young", tags: [] },
  old: { word: "old", tags: ["elderly"], icons: AGED_ICONS },
  elderly: { word: "elderly", tags: ["elderly"], icons: AGED_ICONS },
  pregnant: { word: "pregnant", tags: [], icons: { woman: "pregnant-woman" } },
  sick: { word: "sick", tags: [] },
  sleeping: { word: "sleeping", tags: [] },
  famous: { word: "famous", tags: [] },
  homeless: { word: "homeless", tags: [] },
  wealthy: { word: "wealthy", tags: [] },
};

type PersonNoun = {
  noun: string;
  icon: string;
  tags: readonly CatalogueTag[];
  /** Which modifiers make sense for this noun. The guard against "an old baby". */
  mods: readonly ModifierId[];
};

const ADULT_MODS: readonly ModifierId[] = [
  "young",
  "old",
  "elderly",
  "sick",
  "sleeping",
  "famous",
  "homeless",
  "wealthy",
];
const YOUNG_MODS: readonly ModifierId[] = ["sick", "sleeping"];

const PEOPLE: readonly PersonNoun[] = [
  { noun: "stranger", icon: "person", tags: ["stranger"], mods: ADULT_MODS },
  { noun: "person", icon: "person", tags: [], mods: ADULT_MODS },
  { noun: "man", icon: "man", tags: [], mods: ADULT_MODS },
  { noun: "woman", icon: "woman", tags: [], mods: [...ADULT_MODS, "pregnant"] },
  { noun: "teenager", icon: "teen", tags: ["child"], mods: [...YOUNG_MODS, "famous", "homeless"] },
  { noun: "tween", icon: "teen", tags: ["child"], mods: YOUNG_MODS },
  { noun: "child", icon: "child", tags: ["child"], mods: [...YOUNG_MODS, "famous", "homeless"] },
  { noun: "boy", icon: "boy", tags: ["child"], mods: YOUNG_MODS },
  { noun: "girl", icon: "girl", tags: ["child"], mods: YOUNG_MODS },
  { noun: "toddler", icon: "child", tags: ["child"], mods: YOUNG_MODS },
  { noun: "baby", icon: "baby", tags: ["child"], mods: YOUNG_MODS },
  { noun: "newborn", icon: "baby", tags: ["child"], mods: [] },
  { noun: "doctor", icon: "person", tags: ["occupation"], mods: ["young", "old", "famous"] },
  { noun: "nurse", icon: "woman", tags: ["occupation"], mods: ["young", "old"] },
  { noun: "surgeon", icon: "person", tags: ["occupation"], mods: ["young", "old", "famous"] },
  { noun: "soldier", icon: "person", tags: ["occupation"], mods: ["young", "old"] },
  { noun: "scientist", icon: "person", tags: ["occupation"], mods: ["young", "old", "famous"] },
  { noun: "teacher", icon: "person", tags: ["occupation"], mods: ["young", "old"] },
  { noun: "priest", icon: "elder-man", tags: ["occupation"], mods: ["old"] },
  { noun: "judge", icon: "elder-man", tags: ["occupation"], mods: ["old", "famous"] },
  { noun: "firefighter", icon: "person", tags: ["occupation"], mods: ["young"] },
  { noun: "philosopher", icon: "person", tags: ["occupation"], mods: ["old", "famous"] },
  { noun: "poet", icon: "person", tags: ["occupation"], mods: ["young", "famous"] },
  { noun: "billionaire", icon: "person", tags: [], mods: ["young", "old"] },
  { noun: "criminal", icon: "person", tags: [], mods: ["young", "old"] },
  { noun: "convicted murderer", icon: "person", tags: [], mods: [] },
  { noun: "refugee", icon: "person", tags: [], mods: ["young", "old", "sick"] },
  { noun: "prisoner", icon: "person", tags: [], mods: ["young", "old", "sick"] },
];

function buildPeople(): TrolleyObject[] {
  const out: TrolleyObject[] = [];
  for (const entry of PEOPLE) {
    out.push(object(`${article(entry.noun)} ${entry.noun}`, entry.icon, ["person", ...entry.tags]));
    for (const modId of entry.mods) {
      const mod = MODIFIERS[modId];
      const phrase = `${mod.word} ${entry.noun}`;
      out.push(
        object(`${article(phrase)} ${phrase}`, mod.icons?.[entry.icon] ?? entry.icon, [
          "person",
          ...entry.tags,
          ...mod.tags,
        ]),
      );
    }
  }
  return out;
}

/* --------------------------------------------------------------- relations -- */

type RoleGroupId = "partner" | "child" | "elder" | "sibling" | "social";

type Role = { role: string; icon: string; tags?: readonly CatalogueTag[] };

const ROLE_GROUPS: Record<RoleGroupId, { tags: readonly CatalogueTag[]; roles: readonly Role[] }> = {
  partner: {
    tags: ["family", "partner"],
    roles: [
      { role: "husband", icon: "man" },
      { role: "wife", icon: "woman" },
      { role: "spouse", icon: "person" },
      { role: "partner", icon: "person" },
    ],
  },
  child: {
    tags: ["family", "child"],
    roles: [
      { role: "son", icon: "boy" },
      { role: "daughter", icon: "girl" },
      { role: "child", icon: "child" },
      { role: "first child", icon: "child" },
      { role: "eldest child", icon: "child" },
      { role: "youngest child", icon: "child" },
      { role: "middle child", icon: "child" },
      { role: "firstborn", icon: "child" },
      { role: "eldest son", icon: "boy" },
      { role: "eldest daughter", icon: "girl" },
      { role: "youngest son", icon: "boy" },
      { role: "youngest daughter", icon: "girl" },
    ],
  },
  elder: {
    tags: ["family"],
    roles: [
      { role: "mother", icon: "woman" },
      { role: "father", icon: "man" },
      { role: "parent", icon: "person" },
      { role: "grandmother", icon: "elder-woman", tags: ["elderly"] },
      { role: "grandfather", icon: "elder-man", tags: ["elderly"] },
    ],
  },
  sibling: {
    tags: ["family"],
    roles: [
      { role: "sibling", icon: "person" },
      { role: "brother", icon: "man" },
      { role: "sister", icon: "woman" },
      { role: "twin", icon: "couple" },
    ],
  },
  social: {
    tags: [],
    roles: [
      { role: "best friend", icon: "person" },
      { role: "mentor", icon: "elder-man" },
      { role: "student", icon: "teen" },
    ],
  },
};

/**
 * Possessors, each with the role groups that make sense for it. The allowlist is
 * what keeps the relation family at a useful size instead of every pairing.
 */
const POSSESSORS: readonly { phrase: string; groups: readonly RoleGroupId[] }[] = [
  { phrase: "your", groups: ["partner", "child", "elder", "sibling", "social"] },
  { phrase: "your friend's", groups: ["partner", "child", "elder", "sibling"] },
  { phrase: "your neighbor's", groups: ["partner", "child", "elder", "sibling"] },
  { phrase: "your enemy's", groups: ["partner", "child", "elder", "sibling"] },
  { phrase: "your boss's", groups: ["partner", "child", "elder"] },
  { phrase: "your doctor's", groups: ["partner", "child"] },
  { phrase: "a stranger's", groups: ["partner", "child", "elder"] },
];

function buildRelations(): TrolleyObject[] {
  const out: TrolleyObject[] = [];
  for (const possessor of POSSESSORS) {
    for (const groupId of possessor.groups) {
      const group = ROLE_GROUPS[groupId];
      for (const role of group.roles) {
        out.push(
          object(`${possessor.phrase} ${role.role}`, role.icon, [
            "person",
            "relation",
            ...group.tags,
            ...(role.tags ?? []),
          ]),
        );
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------- pets -- */

const PET_ANIMALS: readonly { noun: string; icon: string }[] = [
  { noun: "pet", icon: "dog" },
  { noun: "dog", icon: "dog" },
  { noun: "puppy", icon: "puppy" },
  { noun: "old dog", icon: "dog" },
  { noun: "cat", icon: "cat" },
  { noun: "kitten", icon: "kitten" },
  { noun: "old cat", icon: "cat" },
  { noun: "parrot", icon: "bird" },
  { noun: "hamster", icon: "hamster" },
  { noun: "rabbit", icon: "hamster" },
];

/** Animals that can plausibly be nobody's. There is no such thing as a stray parrot. */
const STRAY_ANIMALS = new Set(["dog", "puppy", "old dog", "cat", "kitten", "old cat", "rabbit"]);

const PET_POSSESSORS: readonly string[] = [
  "your",
  "your friend's",
  "your neighbor's",
  "your enemy's",
  "a stranger's",
];

function buildPets(): TrolleyObject[] {
  const out: TrolleyObject[] = [];
  for (const possessor of PET_POSSESSORS) {
    for (const animal of PET_ANIMALS) {
      out.push(object(`${possessor} ${animal.noun}`, animal.icon, ["animal", "pet"]));
    }
  }
  for (const animal of PET_ANIMALS) {
    if (!STRAY_ANIMALS.has(animal.noun)) continue;
    out.push(object(`a stray ${animal.noun}`, animal.icon, ["animal", "pet"]));
  }
  return out;
}

/* --------------------------------------------------------------- livestock -- */

const LIVESTOCK: readonly { noun: string; icon: string }[] = [
  { noun: "cow", icon: "cow" },
  { noun: "bull", icon: "bull" },
  { noun: "calf", icon: "calf" },
  { noun: "horse", icon: "horse" },
  { noun: "foal", icon: "horse" },
  { noun: "sheep", icon: "sheep" },
  { noun: "lamb", icon: "sheep" },
  { noun: "goat", icon: "goat" },
  { noun: "pig", icon: "pig" },
  { noun: "chicken", icon: "chicken" },
];

/** `null` means the animal belongs to nobody in particular: "a cow". */
const LIVESTOCK_POSSESSORS: readonly (string | null)[] = [null, "your", "your neighbor's"];

const NAMED_ANIMALS: readonly { prompt: string; icon: string; tags: readonly CatalogueTag[] }[] = [
  { prompt: "the last white rhino", icon: "rhino", tags: ["animal", "wild"] },
  { prompt: "a herd of ten cows", icon: "cow", tags: ["animal", "livestock", "group"] },
  { prompt: "a flock of sheep", icon: "sheep", tags: ["animal", "livestock", "group"] },
  { prompt: "a prize bull", icon: "bull", tags: ["animal", "livestock"] },
  { prompt: "a racehorse worth millions", icon: "horse", tags: ["animal", "livestock"] },
  { prompt: "a working farm dog", icon: "dog", tags: ["animal", "livestock"] },
];

function buildLivestock(): TrolleyObject[] {
  const out: TrolleyObject[] = [];
  for (const possessor of LIVESTOCK_POSSESSORS) {
    for (const animal of LIVESTOCK) {
      const prompt = possessor
        ? `${possessor} ${animal.noun}`
        : `${article(animal.noun)} ${animal.noun}`;
      out.push(object(prompt, animal.icon, ["animal", "livestock"]));
    }
  }
  for (const named of NAMED_ANIMALS) {
    out.push(object(named.prompt, named.icon, named.tags));
  }
  return out;
}

/* ------------------------------------------------------------------ things -- */

const THINGS: readonly { prompt: string; icon: string; tags: readonly CatalogueTag[] }[] = [
  { prompt: "a million dollars", icon: "money", tags: ["thing", "money"] },
  { prompt: "ten million dollars", icon: "money", tags: ["thing", "money"] },
  { prompt: "a billion dollars", icon: "money", tags: ["thing", "money"] },
  { prompt: "a suitcase with $10,000 in it", icon: "money", tags: ["thing", "money"] },
  { prompt: "a winning lottery ticket", icon: "money", tags: ["thing", "money"] },
  { prompt: "the deed to your house", icon: "scroll", tags: ["thing", "money"] },
  { prompt: "a bar of gold", icon: "gold", tags: ["thing", "money"] },
  { prompt: "a vault of gold bullion", icon: "gold", tags: ["thing", "money"] },
  { prompt: "the Mona Lisa", icon: "painting", tags: ["thing", "art"] },
  { prompt: "a priceless painting", icon: "painting", tags: ["thing", "art"] },
  { prompt: "a forgery of the Mona Lisa", icon: "painting", tags: ["thing", "art"] },
  { prompt: "an ancient Greek statue", icon: "sculpture", tags: ["thing", "art"] },
  { prompt: "a priceless Ming vase", icon: "sculpture", tags: ["thing", "art"] },
  { prompt: "an original manuscript in the author's hand", icon: "scroll", tags: ["thing", "art"] },
  {
    prompt: "the only copy of a cure for a rare disease",
    icon: "book",
    tags: ["thing", "knowledge"],
  },
  {
    prompt: "the last copy of Aristotle's lost second book of Poetics",
    icon: "scroll",
    tags: ["thing", "knowledge"],
  },
  { prompt: "the only copy of a great unpublished novel", icon: "book", tags: ["thing", "knowledge"] },
  { prompt: "a library of ten thousand books", icon: "book", tags: ["thing", "knowledge"] },
  { prompt: "the world's last seed bank", icon: "crate", tags: ["thing", "knowledge"] },
  { prompt: "a sealed letter that would end a war", icon: "scroll", tags: ["thing", "knowledge"] },
  { prompt: "a data center", icon: "crate", tags: ["thing", "tech"] },
  { prompt: "a server rack running an AI", icon: "robot", tags: ["thing", "tech"] },
  { prompt: "a humanoid robot", icon: "robot", tags: ["thing", "tech"] },
  { prompt: "a self-driving car with no one inside", icon: "crate", tags: ["thing", "tech"] },
  { prompt: "a crate of expired canned beans", icon: "crate", tags: ["thing"] },
  { prompt: "a box you were told not to open", icon: "crate", tags: ["thing"] },
  { prompt: "a hospital's entire supply of blood", icon: "crate", tags: ["thing"] },
  { prompt: "an empty track with nothing on it", icon: "question", tags: ["thing"] },
  { prompt: "your own reflection in a mirror", icon: "question", tags: ["thing"] },
  { prompt: "the lever itself", icon: "question", tags: ["thing"] },
  { prompt: "a trolley full of philosophers", icon: "group", tags: ["person", "group"] },
];

function buildThings(): TrolleyObject[] {
  return THINGS.map((thing) => object(thing.prompt, thing.icon, thing.tags));
}

/* ------------------------------------------------------------------ groups -- */

const GROUPS: readonly { prompt: string; icon: string; tags: readonly CatalogueTag[] }[] = [
  { prompt: "two strangers", icon: "couple", tags: ["person", "group", "stranger"] },
  { prompt: "five strangers", icon: "group", tags: ["person", "group", "stranger"] },
  { prompt: "ten strangers", icon: "group", tags: ["person", "group", "stranger"] },
  { prompt: "a hundred strangers", icon: "group", tags: ["person", "group", "stranger"] },
  { prompt: "a thousand strangers", icon: "group", tags: ["person", "group", "stranger"] },
  { prompt: "two children", icon: "couple", tags: ["person", "group", "child"] },
  { prompt: "three children", icon: "group", tags: ["person", "group", "child"] },
  { prompt: "five children", icon: "group", tags: ["person", "group", "child"] },
  { prompt: "two babies", icon: "baby", tags: ["person", "group", "child"] },
  { prompt: "a classroom of schoolchildren", icon: "group", tags: ["person", "group", "child"] },
  { prompt: "a scout troop", icon: "group", tags: ["person", "group", "child"] },
  { prompt: "three elderly people", icon: "group", tags: ["person", "group", "elderly"] },
  { prompt: "five elderly people", icon: "group", tags: ["person", "group", "elderly"] },
  { prompt: "a nursing home's residents", icon: "group", tags: ["person", "group", "elderly"] },
  { prompt: "a family of four", icon: "group", tags: ["person", "group", "family"] },
  { prompt: "a wedding party", icon: "group", tags: ["person", "group", "family"] },
  { prompt: "a busload of tourists", icon: "group", tags: ["person", "group"] },
  { prompt: "a football team", icon: "group", tags: ["person", "group"] },
  { prompt: "an orchestra", icon: "group", tags: ["person", "group"] },
  { prompt: "a choir of monks", icon: "group", tags: ["person", "group"] },
  { prompt: "a crowd of protesters", icon: "group", tags: ["person", "group"] },
  { prompt: "a hospital ward of patients", icon: "group", tags: ["person", "group"] },
  { prompt: "five convicted criminals", icon: "group", tags: ["person", "group"] },
  { prompt: "ten doctors", icon: "group", tags: ["person", "group", "occupation"] },
  { prompt: "a village of two hundred people", icon: "group", tags: ["person", "group"] },
];

function buildGroups(): TrolleyObject[] {
  return GROUPS.map((entry) => object(entry.prompt, entry.icon, entry.tags));
}

/* --------------------------------------------------------------- catalogue -- */

/** Every built-in object, in a stable order. Pure: two calls are deeply equal. */
export function buildCatalogue(): TrolleyObject[] {
  return [
    ...buildPeople(),
    ...buildRelations(),
    ...buildPets(),
    ...buildLivestock(),
    ...buildThings(),
    ...buildGroups(),
  ];
}

/* -------------------------------------------------------- random selection -- */

/** The four broad families a random selection balances across. */
export const CATALOGUE_FAMILIES = ["person", "animal", "thing", "group"] as const;

export type CatalogueFamily = (typeof CATALOGUE_FAMILIES)[number];

/** Which family an object belongs to, for balancing a random draw. */
export function familyOf(item: TrolleyObject): CatalogueFamily {
  if (item.tags.includes("group")) return "group";
  if (item.tags.includes("animal")) return "animal";
  if (item.tags.includes("thing")) return "thing";
  return "person";
}

/**
 * How often each family comes up in a random draw. People dominate the catalogue
 * and the puzzle, but a draw should never be five money items either.
 */
const DRAW_CYCLE: readonly CatalogueFamily[] = [
  "person",
  "person",
  "animal",
  "person",
  "thing",
  "person",
  "group",
  "animal",
  "thing",
];

export type Rng = () => number;

/** Fisher-Yates on a copy, driven by the supplied generator. */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * `n` distinct objects, drawn so every family is represented. Pass `rng` (any
 * function returning 0 ≤ x < 1) to make a draw reproducible in a test.
 */
export function randomSelection(
  catalogue: readonly TrolleyObject[],
  n: number,
  rng: Rng = Math.random,
): TrolleyObject[] {
  const pools = new Map<CatalogueFamily, TrolleyObject[]>(
    CATALOGUE_FAMILIES.map((family) => [family, []]),
  );
  for (const item of shuffled(catalogue, rng)) {
    pools.get(familyOf(item))?.push(item);
  }

  const picked: TrolleyObject[] = [];
  const wanted = Math.max(0, Math.min(n, catalogue.length));
  let step = 0;

  while (picked.length < wanted) {
    const remaining = CATALOGUE_FAMILIES.filter((family) => (pools.get(family)?.length ?? 0) > 0);
    if (remaining.length === 0) break;

    const preferred = DRAW_CYCLE[step % DRAW_CYCLE.length];
    step += 1;

    const family =
      preferred !== undefined && remaining.includes(preferred)
        ? preferred
        : remaining[step % remaining.length];
    const next = family === undefined ? undefined : pools.get(family)?.pop();
    if (next) picked.push(next);
  }

  return picked;
}
