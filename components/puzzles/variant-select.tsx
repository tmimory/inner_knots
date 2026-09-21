import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";

/** One framing on offer. The copy is UI copy; the prompt itself lives in markdown. */
export type VariantOption<Id extends string = string> = {
  id: Id;
  label: string;
  /** One line saying what this framing does to the question. */
  description: string;
};

export type VariantSelectProps<Id extends string = string> = {
  value: Id;
  onChange: (value: Id) => void;
  options: readonly VariantOption<Id>[];
  /** Accessible name for the group as a whole. */
  label?: string;
  className?: string;
};

/**
 * A segmented radio group of prompt framings.
 *
 * The description is part of the control rather than a tooltip: choosing between
 * "a thought experiment" and "you work for the trolley company" is the choice the
 * screen is actually about, and it should not need hovering to read.
 */
export function VariantSelect<Id extends string = string>({
  value,
  onChange,
  options,
  label = "Prompt variant",
  className,
}: VariantSelectProps<Id>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={cn("flex-row flex-wrap gap-sm", className)}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            role="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            onPress={() => onChange(option.id)}
            className={cn(
              "min-w-menu flex-1 gap-xxs rounded-md border-hairline p-md transition-colors duration-fast",
              selected
                ? "border-thick border-ring bg-muted"
                : "border-border bg-transparent active:bg-muted web:hover:bg-muted",
            )}
          >
            <Text className={cn("font-display text-sm", selected && "text-primary")}>
              {option.label}
            </Text>
            <Text variant="muted">{option.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
