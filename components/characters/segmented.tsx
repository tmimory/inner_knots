import { Pressable, View } from "react-native";

import { Text, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** When set, the segment cannot be chosen and the reason shows on hover. */
  disabledReason?: string;
};

export type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Accessible name for the group, e.g. "Output mode". */
  label: string;
  className?: string;
};

/**
 * A two- or three-way choice drawn as one connected control: fewer decisions on
 * screen than a select, and every alternative visible at once, which is what the
 * output-mode and steering-mode choices want.
 *
 * A disabled segment stays hoverable on purpose — the tooltip explaining why it
 * cannot be chosen is the whole point of still drawing it.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <View
      role="radiogroup"
      accessibilityLabel={label}
      className={cn(
        "flex-row items-center gap-xxs self-start rounded-md border-hairline border-border bg-muted p-xxs",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const blocked = option.disabledReason !== undefined;
        const segment = (
          <Pressable
            role="radio"
            aria-checked={selected}
            aria-disabled={blocked}
            onPress={() => {
              if (!blocked) onChange(option.value);
            }}
            className={cn(
              "h-control-sm items-center justify-center rounded-sm px-lg transition-colors duration-fast",
              selected ? "bg-card shadow-ink-soft" : "bg-transparent web:hover:bg-card/subtle",
              blocked && "opacity-disabled",
            )}
          >
            <Text
              className={cn("font-display text-sm", selected ? "text-primary" : "text-foreground")}
            >
              {option.label}
            </Text>
          </Pressable>
        );

        if (!blocked) return <View key={option.value}>{segment}</View>;

        return (
          <Tooltip key={option.value} delayDuration={0}>
            <TooltipTrigger asChild>{segment}</TooltipTrigger>
            <TooltipContent>
              <Text>{option.disabledReason}</Text>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </View>
  );
}
