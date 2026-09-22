/**
 * The character steering prompt: the system message that turns a bare model into
 * a character. Derived from the character's `steering` block every time it is
 * needed, so editing `prompts/characters/*.md` changes every character at once.
 *
 * - `raw`  — no system prompt at all; the model answers as itself.
 * - `bio`  — the bio sentence only.
 * - `full` — bio, then principles, then values. Empty sections are omitted.
 */
import { sendsConvictions, type Character } from "@/lib/domain/character";
import { render } from "@/lib/prompts/compose";

import { joinSections } from "../types";

/** Just enough of a character to compose the prompt, so previews need no id. */
export type SteerableCharacter = Pick<Character, "steering">;

function nonEmpty(items: readonly string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

/**
 * A capital followed by a lowercase letter, or the one-letter article "A" on its
 * own: a sentence opening, not an acronym. "A freed slave" used to keep its
 * capital because the article has no lowercase letter after it.
 */
const SENTENCE_OPENING = /^(?:[A-Z][a-z]|A\s)/;

/**
 * The bio finishes the sentence that "You are" begins, so a bio typed as a
 * sentence of its own ("An old questioner of the agora.") would otherwise land a
 * capital mid-sentence. An acronym or a shipped product name ("GPT-5 in a toga",
 * "TypeSafe's evaluator") keeps its capital.
 */
function asSentenceFragment(bio: string): string {
  return SENTENCE_OPENING.test(bio) ? bio.charAt(0).toLowerCase() + bio.slice(1) : bio;
}

/**
 * The composed system prompt, or `null` when the character contributes none
 * (mode `raw`, or a mode whose every section turned out to be empty).
 */
export async function composeSteeringPrompt(character: SteerableCharacter): Promise<string | null> {
  const { mode, bio, principles, values } = character.steering;
  if (mode === "raw") return null;

  const sections: string[] = [];
  const trimmedBio = bio?.trim() ?? "";
  if (trimmedBio.length > 0) {
    sections.push(await render("characters/bio", { bio: asSentenceFragment(trimmedBio) }));
  }

  if (sendsConvictions(mode)) {
    const usablePrinciples = nonEmpty(principles);
    if (usablePrinciples.length > 0) {
      sections.push(await render("characters/principles", { principles: usablePrinciples }));
    }
    const usableValues = nonEmpty(values);
    if (usableValues.length > 0) {
      sections.push(await render("characters/values", { values: usableValues }));
    }
  }

  const prompt = joinSections(sections);
  return prompt.length > 0 ? prompt : null;
}
