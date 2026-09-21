/**
 * The words the Characters screens use for the domain's enum values.
 *
 * They live here rather than beside each control so the list filters, the card
 * metadata and the editor's segmented controls cannot drift into calling the same
 * mode two different things.
 */
import { pluralize } from "@/lib/format";
import {
  characterDisplayName,
  type Character,
  type OutputMode,
  type SteeringMode,
} from "@/lib/domain";

export const OUTPUT_MODE_LABELS: Record<OutputMode, string> = {
  structured: "Structured output",
  tool: "Tool call",
};

export const STEERING_MODE_LABELS: Record<SteeringMode, string> = {
  raw: "Raw",
  bio: "Bio only",
  full: "Full",
};

/** Short lowercase forms, for the one metadata line under a character's name. */
export const OUTPUT_MODE_META: Record<OutputMode, string> = {
  structured: "structured",
  tool: "tool call",
};

export const STEERING_MODE_META: Record<SteeringMode, string> = {
  raw: "no steering",
  bio: "bio only",
  full: "full steering",
};

/** What each steering mode actually sends, one line each, for the editor. */
export const STEERING_MODE_HINTS: Record<SteeringMode, string> = {
  raw: "No system prompt at all. The model answers as itself.",
  bio: "The bio sentence alone becomes the system prompt.",
  full: "Bio, then principles, then values. Empty sections are left out.",
};

/** Stands in for the bio on a card when the character has not been given one. */
const NO_BIO: Record<SteeringMode, string> = {
  raw: "Answers as itself: no prompt goes ahead of the puzzle.",
  bio: "No bio yet, so nothing is said about it before the puzzle.",
  full: "No bio yet, only its principles and values.",
};

/**
 * The sentence a card shows under a character's name: what it was told it is,
 * or — for a character that was told nothing — what that silence means.
 */
export function characterBlurb(character: Character): string {
  const bio = character.steering.bio?.trim();
  if (character.steering.mode !== "raw" && bio !== undefined && bio !== "") return bio;
  return NO_BIO[character.steering.mode];
}

/**
 * The one muted line on a roster row: who runs it, on what, and how much of a
 * self it was given, always in that order and always with the steering mode in
 * the third slot — a slot that says "4 convictions" on one row and "bio only" on
 * the next is three columns that do not line up.
 */
export function characterMeta(character: Character): string {
  const { mode, principles, values } = character.steering;
  const convictions = principles.length + values.length;
  return [
    character.provider,
    character.model,
    STEERING_MODE_META[mode],
    mode === "full" && convictions > 0 ? pluralize(convictions, "conviction") : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(" · ");
}

/** Shown in the effort select for a character that sets no effort of its own. */
export const PROVIDER_DEFAULT_EFFORT = "provider default";

/** Word starts: the beginning of the name, or a letter after a space, dash, dot or underscore. */
const WORD_START = /(^|[\s\-_.])([a-z])/g;

/**
 * The display name, capitalised for a title or a card: `zeno` reads as `Zeno`,
 * `marcus-aurelius` as `Marcus-Aurelius`. Presentation only — the stored
 * identifier, and every record keyed by it, is untouched.
 */
export function characterTitle(character: Pick<Character, "id" | "name">): string {
  return characterDisplayName(character).replace(
    WORD_START,
    (_match, lead: string, letter: string) => lead + letter.toUpperCase(),
  );
}
