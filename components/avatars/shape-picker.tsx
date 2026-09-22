import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { AVATAR_SHAPES } from "./shapes";

/**
 * Columns in the face plate: all fifteen faces, one row.
 *
 * A plate of choices should end where the fields above it end. Eight across left
 * a second row seven cells long with a hole where the last eight would have been,
 * and the eye reads that hole as a missing option. Fifteen across is one flush
 * band of faces spanning the form's own measure, and the identity block stops
 * outweighing everything under it.
 */
export const SHAPE_PICKER_COLUMNS = 15;

/** Columns in the pigment plate: all twenty-five swatches, one flush row. */
export const COLOR_PICKER_COLUMNS = 25;

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
 * How a chosen face or pigment is marked: a two-pixel ring in the rubric red,
 * held two pixels off the medallion.
 *
 * The ring box is drawn at the same diameter whether or not the cell is chosen —
 * only the ring's colour changes — so picking a face never makes it jump a size
 * larger than the fourteen beside it. One treatment shared by both pickers: the
 * old pair (a ring on the faces, a ring plus a check glyph on the pigments) read
 * as two kinds of selection, and the check hid the very pigment it marked.
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
                    selected ? "border-primary" : "border-transparent",
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
 * The fifteen faces as one flush band across the form's measure, named on hover.
 * The chosen one wears the ring, and only the ring.
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
      renderSwatch={(shape) => <Avatar shape={shape.id} color={color} size="md" />}
      className={className}
    />
  );
}
