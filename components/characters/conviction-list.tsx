import { View } from "react-native";

import { Button, Input, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type ConvictionListProps = {
  /** The lines, in the order they will reach the prompt. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Per-line character cap, from `CHARACTER_LIMITS`. */
  maxLength: number;
  /** How many lines the list may hold, from `CHARACTER_LIMITS`. */
  maxItems: number;
  /** Label for the add button, e.g. "Add principle". */
  addLabel: string;
  /** Singular noun for the accessible name of a row's remove control. */
  itemLabel: string;
  placeholder?: string;
  className?: string;
};

/**
 * A short, ordered list of sentences — the principles a character holds itself to,
 * or the values it cares about. Each row is one capped line whose remove control
 * sits inside the field's right padding, so every row shares both edges; the add
 * button closes once the list is full, so the limit is visible rather than
 * enforced by a refusal at save time.
 *
 * How full the list is belongs to the caller, which puts it on the field's label
 * row beside the word it counts.
 */
export function ConvictionList({
  value,
  onChange,
  maxLength,
  maxItems,
  addLabel,
  itemLabel,
  placeholder,
  className,
}: ConvictionListProps) {
  const full = value.length >= maxItems;

  function replace(index: number, text: string) {
    onChange(value.map((item, at) => (at === index ? text : item)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, at) => at !== index));
  }

  return (
    <View className={cn("gap-sm", className)}>
      {value.map((item, index) => (
        // The row's identity is its position: reordering is not offered, and a
        // content key would remount the field on every keystroke.
        <View key={index} className="justify-center">
          <Input
            value={item}
            onChangeText={(text) => replace(index, text)}
            maxLength={maxLength}
            placeholder={placeholder}
            className="pr-control-icon transition-colors duration-fast web:hover:border-ring"
          />
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={`Remove ${itemLabel} ${index + 1}`}
            className="absolute right-none top-none"
            onPress={() => removeAt(index)}
          >
            <Text className="font-mono text-muted-foreground">×</Text>
          </Button>
        </View>
      ))}

      {/*
        A small ghost button, not a line of text: "+ Add principle" set as bare
        prose under a column of fields reads as a caption explaining them. The
        counter is no longer its neighbour — it belongs on the group's label row,
        where every other counter on the form now sits.
      */}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={full}
        onPress={() => onChange([...value, ""])}
      >
        <Text className="font-mono">+</Text>
        <Text>{addLabel}</Text>
      </Button>
    </View>
  );
}
