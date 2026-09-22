import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * What every text field on the page wears: the input surface, the hairline, the
 * body voice and the focus ring. `Input` adds its height and side padding,
 * `Textarea` its box padding; everything a reader would call "a field looks like
 * this" is said once, here.
 */
export const FIELD_CLASSES = cn(
  "rounded-sm border-hairline border-border bg-input font-body text-base text-foreground",
  "web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
);

export type FieldCounterProps = {
  /** How much of the limit is used: characters typed, or items in a list. */
  value: number;
  /** The limit itself, always from a `*_LIMITS` constant in `lib/domain`. */
  max: number;
  className?: string;
};

/**
 * How full a capped field is: "124 / 500".
 *
 * Always on, wherever a limit exists. It used to appear only with the cursor or
 * past four fifths of the cap, which meant the one question a limit raises —
 * "how much room is left?" — could only be answered by typing into the field and
 * watching what happened. A limit the user cannot see is a limit that arrives as
 * a refusal.
 *
 * Metadata size in the metadata ink, set in lining, fixed-width figures so the
 * number neither drops below the line nor shifts width as it counts.
 */
export function FieldCounter({ value, max, className }: FieldCounterProps) {
  return (
    <Text variant="meta" className={cn("tabular", className)}>{`${value} / ${max}`}</Text>
  );
}

export type CountedFieldProps = {
  /** The control itself. */
  children: ReactNode;
  /** Characters typed. */
  count: number;
  /** The cap, when there is one. Without it the field stands alone, uncounted. */
  max?: number;
  className?: string;
};

/**
 * A field with its counter under it, at the field's own right edge.
 *
 * One component rather than the same four lines in `Input` and in `Textarea`, so
 * the gap between a field and its number, and the side the number sits on, are
 * decided once.
 */
export function CountedField({ children, count, max, className }: CountedFieldProps) {
  return (
    <View className={cn("gap-xxs", className)}>
      {children}
      {max === undefined ? null : (
        <FieldCounter value={count} max={max} className="self-end" />
      )}
    </View>
  );
}

/**
 * The text a counted field is showing, whether or not the caller controls it.
 *
 * A counter has to know the length of the value, which an uncontrolled field
 * keeps to itself, so both `Input` and `Textarea` mirror it here and drive the
 * native control from the mirror.
 */
export function useFieldText(
  value: string | undefined,
  defaultValue: string | undefined,
  onChangeText: ((text: string) => void) | undefined,
) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const text = value ?? internal;

  function handleChangeText(next: string) {
    if (value === undefined) setInternal(next);
    onChangeText?.(next);
  }

  return { text, handleChangeText };
}
