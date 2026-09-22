import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { AVATAR_SHAPES } from "./shapes";

/**
 * Columns in the face plate.
 *
 * Eight, because a picker is a plate of choices that should fill the measure it
 * is given: at five the fifteen faces stacked into three tall rows that ended two
 * hundred pixels short of the fields above them, and the first fold of the form
 * was nothing but dots. Eight across puts them in two rows between the form's own
 * edges, and the identity block stops outweighing everything under it.
 */
export const SHAPE_PICKER_COLUMNS = 8;

/** Columns in the pigment plate: twenty-five swatches in two rows. */
export const COLOR_PICKER_COLUMNS = 13;

/**
 * The width of one cell, as a share of the plate.
 *
 * A percentage rather than a measured square: the plate then spans whatever
 * measure the form has, and both grids sit on the form's left and right edges
 * however wide the column gets. Each cell centres its medallion, so the pitch is
 * even even though the last row is short.
 */
export function pickerColumnWidth(columns: number): `${number}%` {
  return `${100 / columns}%`;
}

/**
 * How a chosen face or pigment is marked: a two-pixel ink ring held two pixels off
 * the medallion. One treatment, shared by both pickers — the old pair (a ring on
 * the faces, a ring plus a check glyph on the pigments) read as two different
 * kinds of selection, and the check hid the very pigment it was marking.
 */
export const PICKER_RING = "rounded-full border-thick p-xxs";

/** Classes every picker cell shares: the ring's box, its hover and its press. */
export const PICKER_CELL =
  "transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover";

export type PickerGridProps<T> = {
  /** The choices, in the order they are drawn. */
  items: readonly T[];
  /** How many to a row. The cells divide the plate's width evenly between them. */
  columns: number;
  keyOf: (item: T) => string;
  /** Name shown on hover and read out by a screen reader. */
  labelOf: (item: T) => string;
  isSelected: (item: T) => boolean;
  onPick: (item: T) => void;
  /** The thing being chosen: a face medallion, a pigment dot. */
  renderSwatch: (item: T) => ReactNode;
  className?: string;
};

/**
 * A plate of round choices: one radio group, an even pitch, a name on hover and
 * the app's one selection ring.
 *
 * Both pickers are this grid with a different swatch inside it. Drawn twice, they
 * drifted — the pigments grew a check mark the faces never had, and the ring
 * weights stopped matching — so the wiring lives here once and each picker brings
 * only its own list and what a cell looks like.
 */
export function PickerGrid<T>({
  items,
  columns,
  keyOf,
  labelOf,
  isSelected,
  onPick,
  renderSwatch,
  className,
}: PickerGridProps<T>) {
  return (
    <View role="radiogroup" className={cn("flex-row flex-wrap gap-y-md", className)}>
      {items.map((item) => {
        const selected = isSelected(item);
        return (
          <View
            key={keyOf(item)}
            className="items-center"
            style={{ width: pickerColumnWidth(columns) }}
          >
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Pressable
                  role="radio"
                  aria-checked={selected}
                  accessibilityLabel={labelOf(item)}
                  onPress={() => onPick(item)}
                  className={cn(
                    PICKER_RING,
                    PICKER_CELL,
                    selected ? "border-foreground" : "border-transparent",
                  )}
                >
                  {renderSwatch(item)}
                </Pressable>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{labelOf(item)}</Text>
              </TooltipContent>
            </Tooltip>
          </View>
        );
      })}
    </View>
  );
}

export type ShapePickerProps = {
  /** Currently selected shape id. */
  value: string;
  onChange: (shape: string) => void;
  /** Pigment id the previews are tinted with, so the grid shows the real choice. */
  color: string;
  className?: string;
};

/**
 * The fifteen faces as an even plate, eight to a row, named on hover. The chosen
 * one wears the ring, and only the ring.
 */
export function ShapePicker({ value, onChange, color, className }: ShapePickerProps) {
  return (
    <PickerGrid
      items={AVATAR_SHAPES}
      columns={SHAPE_PICKER_COLUMNS}
      keyOf={(shape) => shape.id}
      labelOf={(shape) => shape.label}
      isSelected={(shape) => shape.id === value}
      onPick={(shape) => onChange(shape.id)}
      renderSwatch={(shape) => <Avatar shape={shape.id} color={color} size="lg" />}
      className={className}
    />
  );
}
