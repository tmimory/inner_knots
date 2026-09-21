import { View } from "react-native";

import { Avatar, medallionVariants, type AvatarSize } from "@/components/avatars";
import { Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { RunConfig } from "@/lib/domain/run";
import { pluralize } from "@/lib/format";
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

export type RosterAvatarsProps = {
  config: RunConfig;
  characters: ReadonlyMap<string, Character>;
  size?: AvatarSize;
};

/** The roster as a row of faces, for a list row. */
export function RosterAvatars({ config, characters, size = "sm" }: RosterAvatarsProps) {
  return (
    <View className="flex-row items-center gap-xs">
      {rosterOf(config).map((seat, index) => (
        <CharacterFace
          key={`${seat.slot ?? ""}${seat.characterId}-${index}`}
          character={characters.get(seat.characterId)}
          size={size}
        />
      ))}
    </View>
  );
}

/** The roster as named rows with their run counts, for the overview tab. */
export function RosterList({ config, characters }: Omit<RosterAvatarsProps, "size">) {
  return (
    <View className="gap-sm">
      {rosterOf(config).map((seat, index) => (
        <View key={`${seat.slot ?? ""}${seat.characterId}-${index}`} className="flex-row items-center gap-sm">
          <CharacterFace character={characters.get(seat.characterId)} size="md" />
          <View className="flex-1 gap-xxs">
            <Text variant="small" className="font-display">
              {seat.slot ? `${seat.slot} · ` : ""}
              {nameOf(seat.characterId, characters)}
            </Text>
            <Text variant="muted" className="font-mono text-xs">
              {seat.characterId}
            </Text>
          </View>
          <Text variant="muted" className="text-xs">
            {pluralize(seat.runs, "run")}
          </Text>
        </View>
      ))}
    </View>
  );
}
