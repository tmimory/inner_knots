import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

/**
 * Pigments to a row. Twenty-five split 13 + 12 reads as a plate of two even rows;
 * left to wrap on its own the last row would be an orphan of whatever is left, and
 * would move again the next time a spacing token changes.
 */
const PIGMENTS_PER_ROW = 13;

function inRows<T>(items: readonly T[], perRow: number): T[][] {
  const rows: T[][] = [];
  for (let at = 0; at < items.length; at += perRow) rows.push(items.slice(at, at + perRow));
  return rows;
}

export type ColorPickerProps = {
  /** Currently selected pigment id. */
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

/**
 * The scribe's pigment box: twenty-five swatches, each named on hover, thirteen to
 * a row at the form's width and aligned to the same left edge as the faces.
 *
 * The chosen pigment wears a pale inner rim inside an oxblood ring, so the mark is
 * legible on an indigo dot and on an ivory one alike. Every swatch reserves the
 * ring's space, so choosing one moves nothing.
 */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View role="radiogroup" className={cn("gap-md", className)}>
      {inRows(theme.avatarPalette, PIGMENTS_PER_ROW).map((row, index) => (
        <View key={index} className="flex-row flex-wrap gap-md">
          {row.map((pigment) => {
            const selected = pigment.id === value;
            return (
              <Tooltip key={pigment.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Pressable
                    role="radio"
                    aria-checked={selected}
                    accessibilityLabel={pigment.label}
                    onPress={() => onChange(pigment.id)}
                    className={cn(
                      "rounded-full border-hairline p-xxs transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover",
                      selected ? "border-primary" : "border-transparent",
                    )}
                  >
                    <View
                      className={cn(
                        "h-2xl w-2xl rounded-full",
                        selected ? "border-thick border-card" : "border-hairline border-border",
                      )}
                      style={{ backgroundColor: pigment.hex }}
                    />
                  </Pressable>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{pigment.label}</Text>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </View>
      ))}
    </View>
  );
}
