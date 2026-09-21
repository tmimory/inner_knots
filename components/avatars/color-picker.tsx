import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type ColorPickerProps = {
  /** Currently selected pigment id. */
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

/** The scribe's pigment box: twenty-five swatches, each named on hover. */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View className={cn("flex-row flex-wrap gap-sm", className)}>
      {theme.avatarPalette.map((pigment) => {
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
                  "h-2xl w-2xl items-center justify-center rounded-full",
                  selected ? "border-thick border-ring" : "border-hairline border-border",
                )}
                style={{ backgroundColor: pigment.hex }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <Text>{pigment.label}</Text>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </View>
  );
}
