import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { AVATAR_SHAPES } from "./shapes";

export type ShapePickerProps = {
  /** Currently selected shape id. */
  value: string;
  onChange: (shape: string) => void;
  /** Pigment id the previews are tinted with, so the grid shows the real choice. */
  color: string;
  className?: string;
};

/**
 * The fifteen faces as an even grid — eight to a row at the form's width, so the
 * set reads as a plate of medallions rather than a ragged wrap. The selected one
 * wears the ring, and only the ring; each is named on hover, like the pigments.
 */
export function ShapePicker({ value, onChange, color, className }: ShapePickerProps) {
  return (
    <View role="radiogroup" className={cn("flex-row flex-wrap gap-md", className)}>
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
                className="rounded-full transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover"
              >
                <Avatar shape={shape.id} color={color} size="lg" ring={selected} />
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
