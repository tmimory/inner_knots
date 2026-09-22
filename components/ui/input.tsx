import type { ComponentProps } from "react";
import { TextInput } from "react-native";

import { CountedField, FIELD_CLASSES, useFieldText } from "@/components/ui/text-field";
import { splitLayoutClasses } from "@/components/ui/layout-classes";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type InputProps = ComponentProps<typeof TextInput> & {
  /**
   * Show the "n / max" counter under the field. On whenever `maxLength` is set;
   * turn it off for a field whose cap is an implementation detail rather than
   * something the user is working against.
   */
  showCount?: boolean;
  /**
   * Extra classes for the wrapper a counted field grows. Layout classes written
   * in `className` move there on their own (see `layout-classes.ts`), so this is
   * only for the rare case that wants to say something the field itself should
   * not hear.
   */
  containerClassName?: string;
};

/**
 * Single-line field. Pass `maxLength` — always from a `*_LIMITS` constant — and
 * it counts itself.
 *
 * Uncounted, this is a bare `TextInput` exactly as it always was: the wrapper
 * appears only when there is a counter to put under the field, so a search box
 * or a stepper keeps the flex behaviour, and the DOM, that it had before.
 */
export function Input({
  className,
  containerClassName,
  editable = true,
  showCount = true,
  maxLength,
  value,
  defaultValue,
  onChangeText,
  ...props
}: InputProps) {
  const theme = useTheme();
  const { text, handleChangeText } = useFieldText(value, defaultValue, onChangeText);
  const counted = showCount && maxLength !== undefined;
  const split = counted ? splitLayoutClasses(className) : { container: undefined, field: className };

  const field = (
    <TextInput
      editable={editable}
      maxLength={maxLength}
      value={counted ? text : value}
      defaultValue={counted ? undefined : defaultValue}
      onChangeText={counted ? handleChangeText : onChangeText}
      placeholderTextColor={theme.colors.subtleForeground}
      className={cn(
        FIELD_CLASSES,
        "h-control-md px-md",
        !editable && "opacity-disabled",
        split.field,
      )}
      {...props}
    />
  );

  if (!counted) return field;

  return (
    <CountedField
      count={text.length}
      max={maxLength}
      className={cn(split.container, containerClassName)}
    >
      {field}
    </CountedField>
  );
}
