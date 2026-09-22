import type { ReactNode } from "react";
import { View } from "react-native";

import { Label, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

/** The two moves, in the order every two-by-two on this screen reads them. */
const MOVES = [true, false] as const;

export type OutcomeGridProps = {
  /** Whose move the rows are: their name labels the column of row headers. */
  rowPlayer: string;
  /** Whose move the columns are: their name labels each column header. */
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
 * One axis header: whose move it is, then which move.
 *
 * The name sits on the header of the row or column it actually names rather than
 * floating over the table — two names on a line above a two-by-two line up with
 * nothing, and the reader is left to guess which axis is whose.
 */
function AxisHeader({ name, testifies }: { name: string; testifies: boolean }) {
  return (
    <View className="gap-xxs">
      <Label numberOfLines={1}>{name}</Label>
      <Text variant="meta" numberOfLines={1}>
        {testifies ? "testifies" : "stays silent"}
      </Text>
    </View>
  );
}

/**
 * A two-by-two on the bargain's own axes: the row player's move down the side,
 * the column player's move across the top.
 *
 * The payoff matrix and the outcome counts are the same table twice — one asking
 * what each square is worth, one saying how often it happened — so they share
 * their axes rather than each naming them. Whatever chrome a square needs is the
 * square's own business: a count wants none, and a payoff cell holding two names
 * and two fields wants an outline.
 */
export function OutcomeGrid({
  rowPlayer,
  columnPlayer,
  cells,
  footnote,
  className,
}: OutcomeGridProps) {
  return (
    <View className={cn("gap-md", className)}>
      <View className="flex-row items-end gap-lg border-b-hairline border-border pb-sm">
        {/* The corner: the column of row headers has its player named on it. */}
        <View className="w-avatar-xl" />
        {MOVES.map((testifies) => (
          <View key={String(testifies)} className="flex-1">
            <AxisHeader name={columnPlayer} testifies={testifies} />
          </View>
        ))}
      </View>

      {MOVES.map((testifies, row) => (
        <View key={String(testifies)} className="flex-row items-start gap-lg">
          <View className="w-avatar-xl pt-xs">
            <AxisHeader name={rowPlayer} testifies={testifies} />
          </View>
          <View className="flex-1">{cells[row * 2]}</View>
          <View className="flex-1">{cells[row * 2 + 1]}</View>
        </View>
      ))}

      {footnote}
    </View>
  );
}
