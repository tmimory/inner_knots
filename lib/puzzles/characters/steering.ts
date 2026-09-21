/**
 * The character steering prompt: the system message that turns a bare model into
 * a character. Derived from the character's `steering` block every time it is
 * needed, so editing `prompts/characters/*.md` changes every character at once.
 *
 * - `raw`  — no system prompt at all; the model answers as itself.
 * - `bio`  — the bio sentence only.
 * - `full` — bio, then principles, then values. Empty sections are omitted.
 */
import type { Character } from "@/lib/domain/character";
import { render } from "@/lib/prompts/compose";

import { joinSections } from "../types";

/** Just enough of a character to compose the prompt, so previews need no id. */
export type SteerableCharacter = Pick<Character, "steering">;

function nonEmpty(items: readonly string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
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
  if (trimmedBio.length > 0) sections.push(await render("characters/bio", { bio: trimmedBio }));

  if (mode === "full") {
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
