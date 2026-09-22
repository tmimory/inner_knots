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
 * the header's button.
 *
 * Three lines on the left, two columns on the right. The left block is prose —
 * the name, one line of the sentence, and the model it runs — and the right is
 * tabulated: the steering mode as a small-caps token and how many convictions it
 * carries, each in a fixed-width cell aligned to the row's right edge, so the
 * same fact sits at the same x on every row and the roster can be read down a
 * column instead of re-parsed line by line. The bio is clamped to one line for
 * the same reason: rows of one height are a table, rows of two are a stack.
 *
 * A tally the mode ignores — convictions kept on a raw or bio character — says
 * so in the cell ("ignores 4 convictions") and drops to the subtle ink, so a count the model never hears
 * is not set as heavily as one it does.
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
          <Text variant="meta" numberOfLines={1}>
            {characterBlurb(character)}
          </Text>
          {/*
            What the row runs on, as one quiet line: the model id in the mono
            voice — the thing you scan the column for — and who serves it in the
            serif beside it, one step quieter. Set in the body ink it was the
            heaviest mark in the row, so the machine that answers outweighed the
            character doing the answering.
          */}
          <Text variant="subtle" numberOfLines={1}>
            <Text className="font-mono text-xs text-muted-foreground">{meta.model}</Text>
            {` · ${meta.provider}`}
          </Text>
        </View>
        {/*
          The tabulated half, held to the height of the name's own line so the
          columns and the chevron read against the row's title rather than
          floating at the centre of a three-line block.
        */}
        <View className="h-control-sm flex-row items-center gap-lg self-start">
          <Text
            className="w-4xl text-right font-display text-xs text-subtle-foreground"
            numberOfLines={1}
          >
            {meta.mode}
          </Text>
          <Text
            variant={meta.convictionsIgnored ? "subtle" : "meta"}
            className="w-tally tabular text-right"
            numberOfLines={1}
          >
            {meta.convictions}
          </Text>
          <Chevron direction="right" />
        </View>
      </Pressable>
    </Link>
  );
}
