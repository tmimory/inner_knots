import type { ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { RosterEntry } from "@/lib/domain/run";

/** One line of a results block: who it is, what they are called, and their tally. */
export type RosterGroup<T> = {
  /** The character id, which is also the row's key. */
  id: string;
  /** The character, while the roster still knows one by that id. */
  character?: Character;
  /** Their display name, or the raw id when the character is gone. */
  name: string;
  /** What the summary counted for them, or `undefined` before they answered. */
  tally?: T;
  /** The face drawn before the name, or nothing when the character is gone. */
  accessory?: ReactNode;
};

/**
 * The rows a results block draws, in the order a reader expects them.
 *
 * The roster is the order on screen; anything the summary knows about and the
 * roster does not (a character removed mid-run) is appended rather than lost. A
 * character the roster still names but who has not answered yet keeps their row
 * with no tally, so a run that is half done reads as half done rather than as a
 * shorter roster.
 *
 * Every puzzle's results answer the same question — how did each of these people
 * decide? — so the list is built once and each screen decides what to draw from
 * it: bars, a table of endings, or both off the same rows.
 */
export function rosterGroups<T>(
  roster: readonly RosterEntry[],
  perCharacter: Readonly<Record<string, T>>,
  characters: ReadonlyMap<string, Character>,
): RosterGroup<T>[] {
  const ids = [
    ...roster.map((entry) => entry.characterId),
    ...Object.keys(perCharacter).filter((id) => !roster.some((entry) => entry.characterId === id)),
  ];

  return ids.map((id) => {
    const character = characters.get(id);
    return {
      id,
      character,
      name: character ? characterDisplayName(character) : id,
      tally: perCharacter[id],
      accessory: character ? (
        <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
      ) : undefined,
    };
  });
}
