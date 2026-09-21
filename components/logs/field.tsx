import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";

/**
 * A label over a value: the unit every read-only panel on the logs screens is
 * built out of. Distinct from `components/characters/field.tsx`, which wraps an
 * editable control with its hint and error — this one only displays.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-xs">
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** {@link Field} with prose for a value. */
export function FieldText({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <Text variant="small">{value}</Text>
    </Field>
  );
}

/** {@link Field} with a value that is an id, a payload or a model's own words. */
export function FieldCode({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <Text variant="code" selectable>
        {value}
      </Text>
    </Field>
  );
}
