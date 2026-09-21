import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Card, Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { characterTitle, OUTPUT_MODE_META, STEERING_MODE_META } from "./labels";

export type CharacterCardProps = {
  character: Character;
  className?: string;
};

/**
 * One character in the grid: face, name, and the facts that decide how it will
 * answer — who runs it, in what mode, and how much of a self it was given.
 *
 * Fixed width rather than stretched, so a roster of three reads as three cards
 * clustered to the left instead of thirds of an empty row.
 */
export function CharacterCard({ character, className }: CharacterCardProps) {
  const steering = STEERING_MODE_META[character.steering.mode];
  return (
    <Link href={{ pathname: "/characters/[id]", params: { id: character.id } }} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`Edit ${characterDisplayName(character)}`}
        className={cn("w-inspector", className)}
      >
        <Card
          pressable
          className="flex-row items-center gap-md p-lg transition-shadow duration-fast web:hover:shadow-ink-raised"
        >
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="lg" />
          <View className="flex-1 gap-xxs">
            <Text variant="h4" numberOfLines={1}>
              {characterTitle(character)}
            </Text>
            <Text variant="muted" numberOfLines={1}>
              {`${character.provider} · ${character.model}`}
            </Text>
            <Text variant="muted" className="text-xs" numberOfLines={1}>
              {[OUTPUT_MODE_META[character.outputMode], steering, character.effort]
                .filter((part) => part !== undefined)
                .join(" · ")}
            </Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
