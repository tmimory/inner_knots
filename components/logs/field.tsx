import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FieldProps = { label: string; children: ReactNode; className?: string };
export type FieldValueProps = { label: string; value: string; className?: string };

/**
 * The narrowest a stat in a header row may be drawn.
 *
 * A row of stats laid out purely by their content puts "1.0s" eight pixels from
 * "7 / 7" and "Sep 21, 2026 07:23:16 PM" a hundred and forty from the next — the
 * eye reads uneven intervals as an accident. A floor under each one turns the row
 * into a measure.
 */
export const STAT_MIN_WIDTH = "min-w-field";

/**
 * The name of a thing, not the thing: a field's label, a table's column head, the
 * word beside a status bullet.
 *
 * Small caps in the display face at the caption size and in full ink, rather than
 * a smaller, paler line of body serif — set as quiet prose a label read as the
 * quietest prose on the page instead of as a label. One component rather than the
 * same three classes written wherever a label happens to be needed.
 */
export function LabelText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text variant="meta" className={cn("font-display text-foreground", className)}>
      {children}
    </Text>
  );
}

/**
 * A label over a value: the unit every read-only panel on the logs screens is
 * built out of. Distinct from `components/characters/field.tsx`, which wraps an
 * editable control with its hint and error — this one only displays.
 */
export function Field({ label, children, className }: FieldProps) {
  return (
    <View className={cn("gap-xs", className)}>
      <LabelText>{label}</LabelText>
      {children}
    </View>
  );
}

/** {@link Field} with prose for a value. */
export function FieldText({ label, value, className }: FieldValueProps) {
  return (
    <Field label={label} className={className}>
      <Text variant="small">{value}</Text>
    </Field>
  );
}

/** {@link Field} with a value that is an id, a payload or a model's own words. */
export function FieldCode({ label, value, className }: FieldValueProps) {
  return (
    <Field label={label} className={className}>
      <Text variant="code" selectable>
        {value}
      </Text>
    </Field>
  );
}
