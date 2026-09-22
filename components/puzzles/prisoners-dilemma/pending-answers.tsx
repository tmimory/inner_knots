import { View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import { PLAYER_LABELS, playerNames } from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

export type PendingAnswersProps = {
  /** The two seats, either of which may still be empty. */
  players: { a?: Character; b?: Character };
  className?: string;
};

/**
 * The two answers that are not in yet.
 *
 * "Their answers appear here." is a sentence about a screen rather than a part of
 * one. The rail instead draws the shape the results will take — two named rows
 * and the em dash that stands where a choice will go — so the empty state and the
 * filled one are the same table, once without its contents.
 */
export function PendingAnswers({ players, className }: PendingAnswersProps) {
  const names = playerNames(players);

  return (
    <View className={cn("gap-none", className)}>
      {/*
        The one heading the empty table needs: without it the two em dashes at the
        end of the rows are a column of punctuation nobody has named.
      */}
      <View className="flex-row items-center gap-sm">
        <Text variant="meta" className="flex-1">
          Player
        </Text>
        <Text variant="meta">Choice</Text>
      </View>
      {(["a", "b"] as const).map((side, index) => {
        const character = players[side];
        const label = PLAYER_LABELS[index];
        return (
          <View
            key={side}
            accessibilityLabel={`${label}: no answer yet`}
            className="flex-row items-center gap-sm border-b-hairline border-border py-sm"
          >
            {character ? (
              <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
            ) : (
              <View className="h-avatar-sm w-avatar-sm rounded-full border-hairline border-dashed border-border" />
            )}
            <Text variant="meta" numberOfLines={1}>
              {label}
            </Text>
            <Text numberOfLines={1} className="flex-1 shrink">
              {character ? names[side] : ""}
            </Text>
            <Text variant="muted" className="font-mono">
              —
            </Text>
          </View>
        );
      })}
    </View>
  );
}
