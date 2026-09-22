import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Chevron, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import { characterDisplayName, type Character } from "@/lib/domain";

import { characterBlurb, characterMeta, characterTitle } from "./labels";

export type CharacterCardProps = {
  character: Character;
  className?: string;
};

/**
 * One character in the roster: face, name, the sentence it was given about
 * itself, and the facts that decide how it will answer.
 *
 * A row on a ruled page, not a card. A list of framed, filled panels turns a
 * roster into a stack of unrelated objects, each with four edges asking to be
 * read; a hairline between rows says "next entry" with one line, and the hover
 * tint is the only frame a clickable row needs.
 *
 * The three lines are one column, left-aligned on one axis: name, the sentence,
 * then the facts. Hung at the row's right edge instead, the facts began at a
 * different x on every row — three ragged starts that the eye reads as three
 * columns that failed to line up.
 */
export function CharacterCard({ character, className }: CharacterCardProps) {
  return (
    <Link href={{ pathname: "/characters/[id]", params: { id: character.id } }} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`Edit ${characterDisplayName(character)}`}
        className={cn(
          "flex-row items-center gap-md border-b-hairline border-border px-sm py-md",
          "transition-colors duration-fast active:bg-muted web:hover:bg-muted/subtle",
          className,
        )}
      >
        <Avatar shape={character.avatar.shape} color={character.avatar.color} size="md" />
        <View className="flex-1 gap-xxs">
          <Text className="font-body text-lg text-foreground" numberOfLines={1}>
            {characterTitle(character)}
          </Text>
          <Text variant="meta" numberOfLines={1}>
            {characterBlurb(character)}
          </Text>
          <Text variant="subtle" numberOfLines={1}>
            {characterMeta(character)}
          </Text>
        </View>
        <Chevron direction="right" />
      </Pressable>
    </Link>
  );
}
