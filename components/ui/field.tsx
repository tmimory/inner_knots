import type { ReactNode } from "react";
import { View } from "react-native";

import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
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
 * One labelled control on a form: label row, control, then either the hint or the
 * validation message. Every field in the app is one of these, so the vertical
 * rhythm and the error treatment cannot drift between two forms.
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

export type SectionHeadingProps = {
  title: string;
  /** One line under the heading, in the screen's own voice. */
  description?: string;
  /** Controls that belong to this section, aligned to the end of the heading row. */
  right?: ReactNode;
  className?: string;
};

/**
 * The heading of a block of form: a display-font title, an optional line of
 * explanation, and an optional slot for the controls that act on the block.
 *
 * It is its own component because two containers use it — {@link FormSection} on
 * a plain surface and the puzzle screens' `Section` on a Scroll panel — and a
 * heading that reads differently on two screens is a heading that has drifted.
 */
export function SectionHeading({ title, description, right, className }: SectionHeadingProps) {
  return (
    <View className={cn("flex-row items-start justify-between gap-lg", className)}>
      <View className="flex-1 gap-xxs">
        <Text variant="h3">{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
      {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
    </View>
  );
}

export type FormSectionProps = SectionHeadingProps & {
  children?: ReactNode;
};

/** A titled block of fields. */
export function FormSection({
  title,
  description,
  right,
  children,
  className,
}: FormSectionProps) {
  return (
    <View className={cn("gap-md", className)}>
      <SectionHeading title={title} description={description} right={right} />
      {children}
    </View>
  );
}
