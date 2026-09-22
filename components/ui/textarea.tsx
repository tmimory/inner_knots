import type { ComponentProps } from "react";
import { TextInput } from "react-native";

import { CountedField, FIELD_CLASSES, useFieldText } from "@/components/ui/text-field";
import { splitLayoutClasses } from "@/components/ui/layout-classes";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type TextareaProps = ComponentProps<typeof TextInput> & {
  /** Rendered height in text rows. */
  rows?: number;
  /** Show the "n / max" counter under the field. On whenever `maxLength` is set. */
  showCount?: boolean;
  /** Extra classes for the wrapper; layout classes in `className` move there on their own. */
  containerClassName?: string;
};

/**
 * Multi-line field. Pass `maxLength` to enforce a limit (prompts and briefings
 * all have one) and it counts itself.
 *
 * The counter is always up, so the field's height never changes under the cursor
 * and the limit can be read before the first keystroke. A textarea keeps its
 * wrapper even uncounted: its height is set in rows, and a box whose height is
 * its own business wants a layout parent either way.
 */
export function Textarea({
  className,
  containerClassName,
  editable = true,
  rows = 4,
  showCount = true,
  maxLength,
  value,
  defaultValue,
  onChangeText,
  ...props
}: TextareaProps) {
  const theme = useTheme();
  const { text, handleChangeText } = useFieldText(value, defaultValue, onChangeText);
  const counted = showCount && maxLength !== undefined;
  const split = splitLayoutClasses(className);

  return (
    <CountedField
      count={text.length}
      max={counted ? maxLength : undefined}
      className={cn(split.container, containerClassName)}
    >
      <TextInput
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        editable={editable}
        maxLength={maxLength}
        value={text}
        onChangeText={handleChangeText}
        placeholderTextColor={theme.colors.subtleForeground}
        style={{ minHeight: rows * theme.lineHeights.base }}
        className={cn(FIELD_CLASSES, "p-md", !editable && "opacity-disabled", split.field)}
        {...props}
      />
    </CountedField>
  );
}
