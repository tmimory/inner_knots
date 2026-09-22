import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  /** `default` sits on a form line with the inputs; `sm` rides a toolbar. */
  size?: "default" | "sm";
  className?: string;
};

/**
 * A two- or three-way choice drawn as one connected control: fewer decisions on
 * screen than a select, and every alternative visible at once, which is what the
 * output-mode, steering-mode and filter choices want.
 *
 * The chosen segment wears the app's one selection language — the `selection` tan
 * and the label in the rubric red — the same treatment a selected {@link Badge}
 * takes. Fill and border together were two marks for one state, and the red
 * hairline made a filter read as an error; the fill alone says "on" and lets the
 * page's primary button stay the loudest thing on screen. The fill is a step
 * deeper than `muted` on purpose: the track is the cream field fill every input on
 * the same line uses, and at `muted` the lit segment was too close to it to find.
 *
 * A disabled segment stays hoverable on purpose — the tooltip explaining why it
 * cannot be chosen is the whole point of still drawing it.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "default",
  className,
}: SegmentedProps<T>) {
  return (
    <View
      role="radiogroup"
      accessibilityLabel={label}
      // No border: the track is the field fill, and the lit segment is the only
      // edge the control needs. The `p-xs` inset around a `control-sm` segment
      // makes the whole control exactly `control-md`, so it sits on the same line
      // as the inputs and selects it shares a form — or a toolbar — with.
      className={cn(
        "flex-row items-center gap-xxs self-start rounded-sm bg-input",
        size === "sm" ? "p-xxs" : "p-xs",
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
              "items-center justify-center rounded-sm transition-colors duration-fast",
              size === "sm" ? "h-control-sm px-md" : "h-control-sm px-lg",
              selected
                ? "bg-selection"
                : "bg-transparent web:hover:bg-muted/subtle",
              blocked && "opacity-disabled",
            )}
          >
            <Text
              className={cn(
                "font-body",
                size === "sm" ? "text-sm" : "text-base",
                selected ? "text-primary" : "text-foreground",
              )}
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
