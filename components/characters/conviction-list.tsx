import { View } from "react-native";

import { Button, Text, Textarea } from "@/components/ui";
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
 * or the values it cares about. Each row is a capped textarea with a remove
 * control; the add button closes once the list is full, so the limit is visible
 * rather than enforced by a refusal at save time.
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
        <View key={index} className="flex-row items-start gap-sm">
          <View className="flex-1">
            <Textarea
              value={item}
              onChangeText={(text) => replace(index, text)}
              maxLength={maxLength}
              rows={2}
              placeholder={placeholder}
            />
          </View>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={`Remove ${itemLabel} ${index + 1}`}
            onPress={() => removeAt(index)}
          >
            <Text className="font-mono text-muted-foreground">×</Text>
          </Button>
        </View>
      ))}

      <View className="flex-row items-center gap-md">
        <Button
          variant="outline"
          size="sm"
          disabled={full}
          onPress={() => onChange([...value, ""])}
        >
          <Text>{addLabel}</Text>
        </Button>
        <Text variant="muted">{`${value.length} / ${maxItems}`}</Text>
      </View>
    </View>
  );
}
