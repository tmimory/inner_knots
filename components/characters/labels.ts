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

/**
 * The three modes as a control names them. One word each, so the filter, the
 * editor's segmented control and a roster row's token all say the same thing:
 * "Bio only" beside "Raw" and "Full" was the one phrase in the set, and it made
 * the segment that sends the least look like the one with a condition attached.
 */
export const STEERING_MODE_LABELS: Record<SteeringMode, string> = {
  raw: "Raw",
  bio: "Bio",
  full: "Full",
};

/** Short lowercase forms, for the one metadata line under a character's name. */
export const OUTPUT_MODE_META: Record<OutputMode, string> = {
  structured: "structured",
  tool: "tool call",
};

/**
 * The steering modes as a roster row says them — the same three modes the filter
 * and the editor name, cut to one word each for the column they are set in.
 *
 * A column of tokens is read by its shape, not its sentence: "bio only" is the
 * filter's phrasing, where three segments are being told apart from each other,
 * while the row states one mode in a cell of its own. They used to be a second
 * vocabulary ("no steering", "full steering") beside the control's, which is the
 * drift this record exists to prevent.
 */
export const STEERING_MODE_META: Record<SteeringMode, string> = {
  raw: "raw",
  bio: "bio",
  full: "full",
};

/** What each steering mode actually sends, one line each, for the editor. */
export const STEERING_MODE_HINTS: Record<SteeringMode, string> = {
  raw: "The model answers as itself; nothing is said about a character.",
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
 * The facts a roster row states about a character, as the parts a row sets in
 * different inks: the model it runs (the anchor), who serves it, how much of a
 * self it was given, and how many convictions it carries.
 *
 * Parts rather than one joined string because the line is not one voice: the
 * model is the thing you scan for, the provider is context, the mode is a token
 * and the count is a number. Every row fills all four slots — a slot that says
 * "4 convictions" on one row and nothing on the next is a column that does not
 * line up — so a character with none says so.
 */
export type CharacterMetaParts = {
  /** The model id, set in the mono voice so its figures line up row to row. */
  model: string;
  provider: string;
  /** The steering mode as a small-caps token: "raw", "bio", "full". */
  mode: string;
  /** "6 convictions", or "no convictions" for a character carrying none. */
  convictions: string;
};

export function characterMetaParts(character: Character): CharacterMetaParts {
  const { mode, principles, values } = character.steering;
  const convictions = principles.length + values.length;
  return {
    model: character.model,
    provider: character.provider,
    mode: STEERING_MODE_META[mode],
    convictions: convictions === 0 ? "no convictions" : pluralize(convictions, "conviction"),
  };
}

/** Shown in the effort select for a character that sets no effort of its own. */
export const PROVIDER_DEFAULT_EFFORT = "provider default";

/** Word starts: the beginning of the name, or a letter after a space, dash, dot or underscore. */
const WORD_START = /(^|[\s\-_.])([a-z])/g;

/**
 * The display name, capitalised for a title or a card: `zeno` reads as `Zeno`,
 * `marcus-aurelius` as `Marcus-Aurelius`. Presentation only — the stored
 * identifier, and every record keyed by it, is untouched.
 *
 * A character given a name of its own is shown exactly that name: "Zeno of
 * Citium" is how its author capitalised it, and title-casing every word start
 * turned the preposition into "Of". Only an identifier standing in for a missing
 * name gets the treatment.
 */
export function characterTitle(character: Pick<Character, "id" | "name">): string {
  const name = character.name?.trim();
  if (name !== undefined && name !== "") return name;
  return characterDisplayName(character).replace(
    WORD_START,
    (_match, lead: string, letter: string) => lead + letter.toUpperCase(),
  );
}
