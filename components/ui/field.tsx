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
 *
 * The `right` slot sits on the heading row itself, not under it, so a count or a
 * control lines up with the title rather than floating beside the description.
 */
export function SectionHeading({ title, description, right, className }: SectionHeadingProps) {
  return (
    <View className={cn("gap-xs", className)}>
      <View className="flex-row items-center justify-between gap-lg">
        <Text variant="h3" className="flex-1">
          {title}
        </Text>
        {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
      </View>
      {description ? <Text variant="meta">{description}</Text> : null}
    </View>
  );
}

export type FormSectionProps = SectionHeadingProps & {
  children?: ReactNode;
  /**
   * Draw the hairline that separates this section from the one above. On by
   * default — it is the thing standing in for the card border a section used to
   * wear. Turn it off for the one section that opens a panel.
   */
  divider?: boolean;
};

/**
 * A titled block of fields.
 *
 * A section is a heading and its content with air around it, not a box: stacked
 * cards turn a form into a list of unrelated objects, while a rule plus space
 * says "same page, next matter" without drawing four more edges.
 *
 * The air above the heading is half the air below it. A rule with equal space on
 * both sides reads as a page break that happens to have a title under it; pulled
 * close, it reads as the underscore of the heading it introduces.
 */
export function FormSection({
  title,
  description,
  right,
  children,
  divider = true,
  className,
}: FormSectionProps) {
  return (
    <View
      className={cn("gap-lg", divider && "border-t-hairline border-border pt-md", className)}
    >
      <SectionHeading title={title} description={description} right={right} />
      {children}
    </View>
  );
}
