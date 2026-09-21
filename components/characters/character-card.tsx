import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Badge, Card, Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { OUTPUT_MODE_LABELS, STEERING_MODE_LABELS } from "./labels";

export type CharacterCardProps = {
  character: Character;
  className?: string;
};

/**
 * One character in the roster grid: face, name, and the three facts that decide
 * how it will answer — who runs it, in what mode, and how much of a self it was
 * given.
 */
export function CharacterCard({ character, className }: CharacterCardProps) {
  return (
    <Link href={{ pathname: "/characters/[id]", params: { id: character.id } }} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`Edit ${characterDisplayName(character)}`}
        className={cn("min-w-menu grow", className)}
      >
        <Card pressable className="flex-row items-center gap-lg p-lg">
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="lg" />
          <View className="flex-1 gap-xs">
            <Text variant="h4" numberOfLines={1}>
              {characterDisplayName(character)}
            </Text>
            <Text variant="muted" numberOfLines={1}>
              {`${character.provider} · ${character.model}`}
            </Text>
            <View className="flex-row flex-wrap items-center gap-xs">
              <Badge variant="outline">
                <Text>{OUTPUT_MODE_LABELS[character.outputMode]}</Text>
              </Badge>
              <Badge variant={character.steering.mode === "raw" ? "muted" : "secondary"}>
                <Text>{STEERING_MODE_LABELS[character.steering.mode]}</Text>
              </Badge>
              {character.effort ? (
                <Badge variant="muted">
                  <Text>{`effort: ${character.effort}`}</Text>
                </Badge>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
