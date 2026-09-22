/**
 * Turning a roster into the faces a prompt preview can be read as.
 *
 * The pure half of `usePromptPreview`, in a module of its own so it can be
 * tested without pulling in React or `apiFetch`'s platform import: a viewpoint
 * is arithmetic over a character, and that is the part worth getting right.
 */
import type { Viewpoint } from "@/components/puzzles/prompt-view";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import { decisionStyleFor } from "@/lib/domain/enums";
import type { RosterEntry } from "@/lib/domain/run";

/**
 * The roster's characters as viewpoints, in seat order.
 *
 * Duplicates collapse: the prisoner's dilemma lets one character take both
 * seats, and two identical chips offering the same prompt is a choice with one
 * answer. The style is derived exactly as a run derives it, from the provider
 * and the output mode together, so the preview cannot claim an ending the run
 * would not send.
 */
export function viewpointsOf(characters: readonly Character[]): Viewpoint[] {
  const seen = new Set<string>();
  const viewpoints: Viewpoint[] = [];
  for (const character of characters) {
    if (seen.has(character.id)) continue;
    seen.add(character.id);
    viewpoints.push({
      id: character.id,
      label: characterDisplayName(character),
      provider: character.provider,
      decisionStyle: decisionStyleFor(character.provider, character.outputMode),
      avatar: character.avatar,
    });
  }
  return viewpoints;
}

/**
 * The characters a roster actually seats, in roster order.
 *
 * A roster is ids; a viewpoint needs the character behind one. An id the
 * collection no longer knows drops out rather than becoming an empty chip.
 */
export function seatedCharacters(
  roster: readonly RosterEntry[],
  byId: ReadonlyMap<string, Character>,
): Character[] {
  return roster.flatMap((entry) => {
    const character = byId.get(entry.characterId);
    return character ? [character] : [];
  });
}
