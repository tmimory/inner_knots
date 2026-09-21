import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
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

/** The fifteen shapes as a wrapping grid; the selected one wears the ring. */
export function ShapePicker({ value, onChange, color, className }: ShapePickerProps) {
  return (
    <View className={cn("flex-row flex-wrap gap-md", className)}>
      {AVATAR_SHAPES.map((shape) => {
        const selected = shape.id === value;
        return (
          <Pressable
            key={shape.id}
            role="radio"
            aria-checked={selected}
            accessibilityLabel={shape.label}
            onPress={() => onChange(shape.id)}
            className={cn(
              "items-center gap-xxs rounded-md p-xs transition-colors duration-fast",
              selected ? "bg-muted" : "bg-transparent web:hover:bg-muted/subtle",
            )}
          >
            <Avatar shape={shape.id} color={color} size="lg" ring={selected} />
            <Text variant="muted" className="text-xs">
              {shape.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
