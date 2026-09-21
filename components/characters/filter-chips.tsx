import { Pressable, View } from "react-native";

import { Badge, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type ChipOption<T extends string> = { value: T; label: string };

export type FilterChipsProps<T extends string> = {
  /** Name of the facet, shown before the chips. */
  label: string;
  /** The chosen value, or `null` for "any". */
  value: T | null;
  onChange: (value: T | null) => void;
  options: readonly ChipOption<T>[];
  className?: string;
};

/**
 * One facet of the character filter. Pressing the chosen chip again clears it, so
 * "any" needs no chip of its own.
 */
export function FilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: FilterChipsProps<T>) {
  if (options.length === 0) return null;

  return (
    <View className={cn("flex-row flex-wrap items-center gap-xs", className)}>
      <Text variant="muted" className="font-display">
        {label}
      </Text>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="checkbox"
            aria-checked={selected}
            onPress={() => onChange(selected ? null : option.value)}
            className="rounded-full transition-opacity duration-fast active:opacity-hover web:hover:opacity-hover"
          >
            <Badge variant={selected ? "secondary" : "outline"}>
              <Text>{option.label}</Text>
            </Badge>
          </Pressable>
        );
      })}
    </View>
  );
}
