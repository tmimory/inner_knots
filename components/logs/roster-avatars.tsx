import { View } from "react-native";

import { Avatar, medallionVariants, type AvatarSize } from "@/components/avatars";
import { Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { RunConfig } from "@/lib/domain/run";
import { cn } from "@/lib/utils";

/** One seat on a run's roster: who answered, and how many times they were asked. */
export type RosterSeat = {
  characterId: string;
  runs: number;
  /** The slot a prisoner's-dilemma player sat in. Absent for the other puzzles. */
  slot?: "A" | "B";
};

/** The roster of any puzzle, in one shape. A dilemma has two seats, always. */
export function rosterOf(config: RunConfig): RosterSeat[] {
  switch (config.puzzle) {
    case "trolley":
    case "adventure":
      return config.roster.map((entry) => ({ characterId: entry.characterId, runs: entry.runs }));
    case "prisoners-dilemma":
      return [
        { characterId: config.playerA, runs: config.runs, slot: "A" },
        { characterId: config.playerB, runs: config.runs, slot: "B" },
      ];
  }
}

export type CharacterFaceProps = {
  character?: Character;
  size?: AvatarSize;
  className?: string;
};

/** A character's medallion, or a blank one when the character has been deleted. */
export function CharacterFace({ character, size = "sm", className }: CharacterFaceProps) {
  if (!character) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel="a character that no longer exists"
        className={cn(medallionVariants({ size }), "bg-muted", className)}
      >
        <Text variant="muted" className="font-mono text-xs">
          ?
        </Text>
      </View>
    );
  }
  return (
    <Avatar
      shape={character.avatar.shape}
      color={character.avatar.color}
      size={size}
      className={className}
    />
  );
}

/** The name a run knows a character by, even after the character is gone. */
export function nameOf(characterId: string, characters: ReadonlyMap<string, Character>): string {
  const character = characters.get(characterId);
  return character ? characterDisplayName(character) : characterId;
}

/**
 * The smallest a face is drawn: two or three of them on one line of a ledger,
 * saying who answered without taking the line over.
 *
 * Unframed, because a medallion at this size is all frame: the parchment disc and
 * its hairline ring outweighed the drawing inside them and turned a
 * name-plus-faces row into a row of buttons. So the ink goes straight onto the
 * page, with no ring and no fill.
 */
function MiniFace({ character }: { character?: Character }) {
  if (!character) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel="a character that no longer exists"
        className={cn(medallionVariants({ size: "xs", frame: false }), "bg-muted")}
      >
        <Text variant="muted" className="font-mono text-xs">
          ?
        </Text>
      </View>
    );
  }

  return (
    <Avatar
      shape={character.avatar.shape}
      color={character.avatar.color}
      size="xs"
      frame={false}
    />
  );
}

export type RosterAvatarsProps = {
  config: RunConfig;
  characters: ReadonlyMap<string, Character>;
  size?: AvatarSize;
  /** Draw the faces at their smallest, with no medallion, for a one-line row. */
  dense?: boolean;
};

/** The roster as a row of faces, for a list row. */
export function RosterAvatars({ config, characters, size = "sm", dense = false }: RosterAvatarsProps) {
  return (
    <View className="flex-row items-center gap-xs">
      {rosterOf(config).map((seat, index) =>
        dense ? (
          <MiniFace
            key={`${seat.slot ?? ""}${seat.characterId}-${index}`}
            character={characters.get(seat.characterId)}
          />
        ) : (
          <CharacterFace
            key={`${seat.slot ?? ""}${seat.characterId}-${index}`}
            character={characters.get(seat.characterId)}
            size={size}
          />
        ),
      )}
    </View>
  );
}
