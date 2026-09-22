import type { ReactNode } from "react";
import { View } from "react-native";

import { Label, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The two moves, in the order every two-by-two on this screen reads them.
 *
 * The payoff matrix and the outcome counts are the same table twice — one asking
 * what each square is worth, one saying how often it happened — so they share
 * their axes rather than each naming them.
 */
export const MOVES = ["Testify", "Stay silent"] as const;

export type OutcomeGridProps = {
  /** Whose move the rows are, named above the row labels. */
  rowPlayer: string;
  /** Whose move the columns are, named above the column labels. */
  columnPlayer: string;
  /**
   * The four squares in reading order: both testify, only the row player
   * testifies, only the column player testifies, both stay silent.
   */
  cells: readonly ReactNode[];
  /** One line under the table, for whatever the squares cannot hold. */
  footnote?: ReactNode;
  className?: string;
};

/**
 * A two-by-two on the bargain's own axes: the row player's move down the side,
 * the column player's move across the top, one set of headers and no cell chrome.
 *
 * The squares are already a grid; a border and a caption around each one only
 * repeat what the position says.
 */
export function OutcomeGrid({
  rowPlayer,
  columnPlayer,
  cells,
  footnote,
  className,
}: OutcomeGridProps) {
  return (
    <View className={cn("gap-sm", className)}>
      {/*
        Both axes named on one line: the row player's name sits over the column of
        row labels it belongs to, and the column player's is centred over the pair
        of columns it spans rather than sitting on the first one.
      */}
      <View className="flex-row items-end gap-xl">
        {/* Over the column of row labels, because that column is this player. */}
        <View className="w-avatar-xl">
          <Text variant="meta" numberOfLines={1}>
            {rowPlayer}
          </Text>
        </View>
        {/* Centred across both input columns and the gap between them. */}
        <View className="flex-1 items-center">
          <Text variant="meta" numberOfLines={1}>
            {columnPlayer}
          </Text>
        </View>
      </View>

      <View className="flex-row items-end gap-xl">
        <View className="w-avatar-xl" />
        {MOVES.map((move) => (
          <View key={move} className="flex-1">
            <Label numberOfLines={1}>{move}</Label>
          </View>
        ))}
      </View>

      {MOVES.map((move, row) => (
        <View key={move} className="flex-row items-start gap-xl">
          <View className="min-h-control-md w-avatar-xl justify-center">
            <Label numberOfLines={1}>{move}</Label>
          </View>
          <View className="flex-1">{cells[row * 2]}</View>
          <View className="flex-1">{cells[row * 2 + 1]}</View>
        </View>
      ))}

      {footnote}
    </View>
  );
}
