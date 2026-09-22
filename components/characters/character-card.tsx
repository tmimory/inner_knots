import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Chevron, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import { characterDisplayName, type Character } from "@/lib/domain";

import { characterBlurb, characterMetaParts, characterTitle } from "./labels";

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
 * The row runs edge to edge of the column it sits in: the face starts on the
 * page's own left axis and the chevron ends on the hairline's right edge, under
 * the header's button. Inset by a step, both marks floated a few pixels inside
 * the rule that was supposed to measure them.
 *
 * The three lines are one column, left-aligned on one axis: name, two lines of
 * the sentence, then the facts. Hung at the row's right edge instead, the facts
 * began at a different x on every row — three ragged starts that the eye reads
 * as three columns that failed to line up.
 */
export function CharacterCard({ character, className }: CharacterCardProps) {
  const meta = characterMetaParts(character);

  return (
    <Link href={{ pathname: "/characters/[id]", params: { id: character.id } }} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`Edit ${characterDisplayName(character)}`}
        className={cn(
          "flex-row items-center gap-md border-b-hairline border-border py-md",
          "transition-colors duration-fast active:bg-muted web:hover:bg-muted/subtle",
          className,
        )}
      >
        <Avatar shape={character.avatar.shape} color={character.avatar.color} size="md" />
        <View className="flex-1 gap-xxs">
          <Text className="font-body text-lg text-foreground" numberOfLines={1}>
            {characterTitle(character)}
          </Text>
          {/*
            Two lines of the bio and then the ellipsis: one line cut a sentence
            off mid-clause on every row with anything to say, and an unclamped
            paragraph made the roster a wall. Clamped by the renderer rather than
            by a `slice` in the label, so the break lands between words.
          */}
          <Text variant="meta" numberOfLines={2}>
            {characterBlurb(character)}
          </Text>
          {/*
            One line, four slots, always in this order: the model in the mono
            voice as the thing you scan down the column for, the provider and the
            count around it in the quiet ink, and the steering mode as a small-caps
            token so it cannot be misread as another part of the model's name.
          */}
          <Text variant="subtle" numberOfLines={1}>
            <Text className="font-mono text-xs text-foreground">{meta.model}</Text>
            {` · ${meta.provider} · `}
            <Text className="font-display text-xs text-subtle-foreground">{meta.mode}</Text>
            {` · ${meta.convictions}`}
          </Text>
        </View>
        <Chevron direction="right" />
      </Pressable>
    </Link>
  );
}
