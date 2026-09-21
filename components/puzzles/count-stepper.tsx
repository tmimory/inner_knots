import { useState } from "react";
import { View } from "react-native";

import { Button, Input, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type CountStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** How much one press of a button moves the count. */
  step?: number;
  /** Accessible name for the field — "Runs", "Games". */
  label: string;
  className?: string;
};

/** The nearest whole count inside the bounds; anything unreadable falls to `min`. */
export function clampCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * A small whole-number field with a minus and a plus.
 *
 * Every puzzle screen counts something this way — how many times one character
 * answers, how many games two of them play — so the typing behaviour is written
 * once: what was typed is kept on screen, tagged with the count it produced, so a
 * half-typed "1" on the way to "12" survives while a count changed from outside
 * still wins.
 */
export function CountStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  className,
}: CountStepperProps) {
  const [typed, setTyped] = useState<{ text: string; from: number } | null>(null);
  const text = typed?.from === value ? typed.text : String(value);

  return (
    <View className={cn("flex-row items-center gap-xxs", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-control-sm w-control-sm"
        accessibilityLabel={`${label}: one fewer`}
        disabled={value <= min}
        onPress={() => onChange(clampCount(value - step, min, max))}
      >
        <Text className="font-mono">−</Text>
      </Button>
      <Input
        className="h-control-sm w-3xl px-xs text-center"
        keyboardType="number-pad"
        accessibilityLabel={label}
        value={text}
        onChangeText={(next) => {
          const parsed = Number.parseInt(next, 10);
          const count = Number.isFinite(parsed) ? clampCount(parsed, min, max) : value;
          setTyped({ text: next, from: count });
          if (count !== value) onChange(count);
        }}
        onBlur={() => setTyped(null)}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-control-sm w-control-sm"
        accessibilityLabel={`${label}: one more`}
        disabled={value >= max}
        onPress={() => onChange(clampCount(value + step, min, max))}
      >
        <Text className="font-mono">+</Text>
      </Button>
    </View>
  );
}
