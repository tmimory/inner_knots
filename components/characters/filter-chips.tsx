import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
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
 * "any" needs no chip of its own, and a facet with nothing to choose between
 * draws nothing at all.
 */
export function FilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: FilterChipsProps<T>) {
  if (options.length < 2) return null;

  return (
    <View className={cn("flex-row flex-wrap items-center gap-xs", className)}>
      <Text variant="muted" className="mr-xxs">
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
            className={cn(
              "h-control-sm items-center justify-center rounded-sm px-md transition-colors duration-fast",
              selected
                ? "bg-primary active:opacity-hover web:hover:opacity-hover"
                : "border-hairline border-border bg-transparent active:bg-muted web:hover:bg-muted",
            )}
          >
            <Text
              className={cn(
                "font-body text-sm",
                selected ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
