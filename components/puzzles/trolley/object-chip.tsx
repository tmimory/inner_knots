import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { cn } from "@/lib/utils";

import { BOARD } from "./geometry";
import { ObjectGlyph } from "./object-glyph";

export type ObjectChipProps = {
  item: TrolleyObject;
  /**
   * When given, the chip carries the "×" that takes it off the track. The
   * catalogue's copies leave it out: there is nothing there to remove.
   */
  onRemove?: () => void;
  /** State classes the two uses differ in — the palette's hover and drag rings. */
  className?: string;
  /** Anything the chip should carry after its label, such as a drag handle. */
  children?: ReactNode;
};

/**
 * One object, as a chip: the glyph, the name, and nothing else.
 *
 * The same component draws a thing standing on a track and the same thing waiting
 * in the catalogue, because they are the same thing — a tile you pick up and a
 * tile you put down should not be two different objects with two different
 * silhouettes. The catalogue was a grid of equal cells holding bare words, so the
 * drag vocabulary changed shape halfway through the gesture; now a chip leaves
 * the flow and lands on a rail unchanged.
 *
 * It sizes to its own label up to a cap: a five-wide grid made "Your Dog" two
 * thirds empty box, and a chip wide enough to read "Suitcase with $10,000 in It"
 * whole would crowd the four beside it.
 */
export function ObjectChip({ item, onRemove, className, children }: ObjectChipProps) {
  return (
    <View
      style={{ height: BOARD.slotHeight, maxWidth: BOARD.chipMaxWidth }}
      className={cn(
        "flex-row items-center gap-xs rounded-sm border-hairline border-border bg-card px-sm shadow-ink-soft",
        className,
      )}
    >
      <ObjectGlyph icon={item.icon} />
      <Text variant="small" numberOfLines={1} className="shrink">
        {item.label}
      </Text>
      {onRemove ? (
        <Pressable
          role="button"
          accessibilityLabel={`Take ${item.label} off the track`}
          onPress={onRemove}
          className="h-lg w-lg items-center justify-center rounded-full transition-colors duration-fast active:bg-muted web:hover:bg-muted"
        >
          <Text className="font-mono text-xs">×</Text>
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}
