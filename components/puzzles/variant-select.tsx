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
 * A radio list of prompt framings: one row each, name and consequence on the
 * same line.
 *
 * The description is part of the control rather than a tooltip — choosing between
 * "a thought experiment" and "you work for the trolley company" is the choice the
 * screen is actually about. As equal-width tiles the copy wrapped at three
 * different depths and the row read as three unrelated cards; as rows the eye
 * runs down one edge and compares the sentences.
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
      className={cn("gap-xs", className)}
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
              "flex-row flex-wrap items-baseline gap-x-md gap-y-xxs rounded-sm border-hairline px-md py-sm transition-colors duration-fast",
              selected
                ? "border-ring bg-muted/subtle"
                : "border-border bg-transparent active:bg-muted web:hover:bg-muted/subtle",
            )}
          >
            <Text className={cn("font-body", selected ? "text-primary" : "text-foreground")}>
              {option.label}
            </Text>
            <Text variant="meta" className="flex-1">
              {option.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
