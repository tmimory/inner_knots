import type { ReactNode } from "react";
import { View } from "react-native";

import { Label, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FieldProps = {
  label: string;
  /** Explanatory line under the control. Hidden while an error is showing. */
  hint?: string;
  /** Validation message; replaces the hint and is drawn in the destructive tone. */
  error?: string | null;
  /** Rendered at the end of the label row, for a refresh control or a toggle. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * One labelled control in the character editor: label row, control, then either
 * the hint or the validation message. Every field on the form is one of these, so
 * the vertical rhythm and the error treatment cannot drift between them.
 */
export function Field({ label, hint, error, action, children, className }: FieldProps) {
  return (
    <View className={cn("gap-xs", className)}>
      <View className="min-h-control-sm flex-row items-center justify-between gap-md">
        <Label>{label}</Label>
        {action ? <View className="flex-row items-center gap-sm">{action}</View> : null}
      </View>
      {children}
      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** A titled block of fields inside a Scroll panel. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("gap-md", className)}>
      <View className="gap-xxs">
        <Text variant="h3">{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}
