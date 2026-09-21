import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

import { pickerCellSize, pickerGridWidth, PICKER_RING } from "./shape-picker";

/** Perceived lightness of a `#rrggbb`, 0 (black) to 1 (white). */
function lightness(hex: string): number {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 0xff;
}

/** Roughly where a pigment stops taking a cream mark and starts taking an ink one. */
const MID_LIGHTNESS = 0.6;

export type ColorPickerProps = {
  /** Currently selected pigment id. */
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

/**
 * The scribe's pigment box: twenty-five swatches, each named on hover, on the same
 * five-column pitch and between the same edges as the faces above it.
 *
 * The chosen pigment wears the pickers' one selection ring and a check drawn in
 * whichever of the two inks the pigment can carry — so the mark stays legible on
 * an indigo dot and on an ivory one alike.
 */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const theme = useTheme();
  const cell = pickerCellSize(theme);

  return (
    <View
      role="radiogroup"
      className={cn("flex-row flex-wrap gap-lg", className)}
      style={{ width: pickerGridWidth(theme) }}
    >
      {theme.avatarPalette.map((pigment) => {
        const selected = pigment.id === value;
        const mark =
          lightness(pigment.hex) > MID_LIGHTNESS ? theme.colors.foreground : theme.colors.card;
        return (
          <View key={pigment.id} className="items-center" style={{ width: cell }}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Pressable
                  role="radio"
                  aria-checked={selected}
                  accessibilityLabel={pigment.label}
                  onPress={() => onChange(pigment.id)}
                  className={cn(
                    PICKER_RING,
                    "transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover",
                    selected ? "border-foreground" : "border-transparent",
                  )}
                >
                  <View
                    className="h-avatar-md w-avatar-md items-center justify-center rounded-full border-hairline border-border"
                    style={{ backgroundColor: pigment.hex }}
                  >
                    {selected ? (
                      <Text className="font-display text-sm" style={{ color: mark }}>
                        ✓
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{pigment.label}</Text>
              </TooltipContent>
            </Tooltip>
          </View>
        );
      })}
    </View>
  );
}
