/**
 * Finding a character by typing at it.
 *
 * The characters screen and the pickers on the puzzle pages search the same four
 * things, so they share the matcher and the placeholder: adding a fifth
 * searchable field should not be a thing one of them can miss.
 */
import { characterDisplayName, type Character } from "@/lib/domain";

/**
 * Placeholder for every character search box in the app.
 *
 * Two words, because a placeholder is a label for an empty field, not a manual:
 * the list of what is matched belonged to a field nobody had typed in yet.
 */
export const CHARACTER_SEARCH_PLACEHOLDER = "Search characters";

/** Everything about a character that a search query is matched against. */
function searchText(character: Character): string {
  return [
    character.id,
    characterDisplayName(character),
    character.provider,
    character.model,
  ]
    .join(" ")
    .toLowerCase();
}

/** True when the character matches the query. An empty query matches everything. */
export function matchesCharacterQuery(character: Character, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || searchText(character).includes(needle);
}
