import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/theme";

import { Avatar } from "./avatar";
import { AVATAR_SHAPES } from "./shapes";

/**
 * Columns in both avatar pickers.
 *
 * Five divides the fifteen faces into three full rows and the twenty-five pigments
 * into five, so neither plate ends in an orphan; sharing the number means the two
 * grids sit on one pitch under one pair of edges instead of reading as two
 * unrelated tables of dots.
 */
export const PICKER_COLUMNS = 5;

/**
 * The square one cell occupies: the largest medallion plus the room its selection
 * ring needs on every side. Reserved whether or not the cell is chosen, so
 * choosing one moves nothing.
 */
export function pickerCellSize(theme: Theme): number {
  return theme.avatarSizes["avatar-lg"] + 2 * (theme.borderWidths.thick + theme.spacing.xxs);
}

/** Width of a picker plate: five cells and the four gutters between them. */
export function pickerGridWidth(theme: Theme): number {
  return PICKER_COLUMNS * pickerCellSize(theme) + (PICKER_COLUMNS - 1) * theme.spacing.lg;
}

/**
 * How a chosen face or pigment is marked: a two-pixel ink ring held two pixels off
 * the medallion. One treatment, shared by both pickers — the old pair (a gilt
 * hairline on the faces, a heavy oxblood ring on the pigments) read as two
 * different kinds of selection.
 */
export const PICKER_RING = "rounded-full border-thick p-xxs";

export type ShapePickerProps = {
  /** Currently selected shape id. */
  value: string;
  onChange: (shape: string) => void;
  /** Pigment id the previews are tinted with, so the grid shows the real choice. */
  color: string;
  className?: string;
};

/**
 * The fifteen faces as an even plate, five to a row, named on hover. The chosen
 * one wears the ring, and only the ring.
 */
export function ShapePicker({ value, onChange, color, className }: ShapePickerProps) {
  const theme = useTheme();

  return (
    <View
      role="radiogroup"
      className={cn("flex-row flex-wrap gap-lg", className)}
      style={{ width: pickerGridWidth(theme) }}
    >
      {AVATAR_SHAPES.map((shape) => {
        const selected = shape.id === value;
        return (
          <Tooltip key={shape.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <Pressable
                role="radio"
                aria-checked={selected}
                accessibilityLabel={shape.label}
                onPress={() => onChange(shape.id)}
                className={cn(
                  PICKER_RING,
                  "transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover",
                  selected ? "border-foreground" : "border-transparent",
                )}
              >
                <Avatar shape={shape.id} color={color} size="lg" />
              </Pressable>
            </TooltipTrigger>
            <TooltipContent>
              <Text>{shape.label}</Text>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </View>
  );
}
