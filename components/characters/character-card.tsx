import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Card, Chevron, Text } from "@/components/ui";
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
 * A full-width row rather than a tile in a grid. Three tiles across a reading
 * column leave one orphaned on a second row and give each card a height of its
 * own as the blurb wraps; a row fills the column it is in, keeps one height, and
 * gives the name, the blurb and the metadata a column each. The name is set in
 * the body serif: small caps belong to the page's own furniture, not to its
 * contents.
 */
export function CharacterCard({ character, className }: CharacterCardProps) {
  return (
    <Link href={{ pathname: "/characters/[id]", params: { id: character.id } }} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`Edit ${characterDisplayName(character)}`}
        className={className}
      >
        <Card pressable className="flex-row items-center gap-md rounded-md p-lg">
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="md" />
          <View className="flex-1 gap-xxs">
            <Text className="font-body text-lg text-foreground" numberOfLines={1}>
              {characterTitle(character)}
            </Text>
            <Text variant="meta" numberOfLines={1}>
              {characterBlurb(character)}
            </Text>
          </View>
          {/* The facts hide before the name and the blurb do when the row narrows. */}
          <Text variant="meta" numberOfLines={1} className="hidden wide:flex">
            {characterMeta(character)}
          </Text>
          <Chevron direction="right" />
        </Card>
      </Pressable>
    </Link>
  );
}
