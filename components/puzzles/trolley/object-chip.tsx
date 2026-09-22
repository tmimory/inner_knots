import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { cn } from "@/lib/utils";

import { BOARD } from "./geometry";
import { ObjectGlyph } from "./object-glyph";

export type ObjectChipProps = {
  item: TrolleyObject;
  /** State classes the uses differ in — the palette's hover and drag rings. */
  className?: string;
  /** Anything the chip should carry after its label, such as a drag handle. */
  children?: ReactNode;
};

/**
 * One object, as a chip: the glyph, the name, and nothing else.
 *
 * This is the catalogue's tile, and the thing a drag carries. What it lands on is
 * a rail, where the object stops being a chip and becomes a figure standing on
 * the track (`track-object.tsx`): the tile is the thing in your hand, the figure
 * is the thing in the trolley's way.
 *
 * It sizes to its own label up to a cap: an equal-column grid made "Your Dog" two
 * thirds empty box, and a chip wide enough to read "Suitcase with $10,000 in It"
 * whole would crowd the four beside it.
 */
export function ObjectChip({ item, className, children }: ObjectChipProps) {
  return (
    <View
      style={{ height: BOARD.chipHeight, maxWidth: BOARD.chipMaxWidth }}
      className={cn(
        "flex-row items-center gap-xs rounded-sm border-hairline border-border bg-card px-sm shadow-ink-soft",
        className,
      )}
    >
      <ObjectGlyph icon={item.icon} />
      <Text variant="small" numberOfLines={1} className="shrink">
        {item.label}
      </Text>
      {children}
    </View>
  );
}
