import { useState, type ComponentProps } from "react";
import { TextInput, View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type TextareaProps = ComponentProps<typeof TextInput> & {
  /** Rendered height in text rows. */
  rows?: number;
  /** When set together with `maxLength`, shows an "n / max" counter under the field. */
  showCount?: boolean;
};

/**
 * Multi-line field. Pass `maxLength` to enforce a limit (prompts and briefings all
 * have one) and `showCount` to display the "n / max" counter.
 */
export function Textarea({
  className,
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
  const [internal, setInternal] = useState(defaultValue ?? "");
  const text = value ?? internal;

  function handleChangeText(next: string) {
    if (value === undefined) setInternal(next);
    onChangeText?.(next);
  }

  return (
    <View className="gap-xs">
      <TextInput
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        editable={editable}
        maxLength={maxLength}
        value={text}
        onChangeText={handleChangeText}
        placeholderTextColor={theme.colors.mutedForeground}
        style={{ minHeight: rows * theme.lineHeights.base }}
        className={cn(
          "rounded-md border-hairline border-border bg-input p-md font-body text-base text-foreground",
          "web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
          !editable && "opacity-disabled",
          className,
        )}
        {...props}
      />
      {showCount && maxLength !== undefined ? (
        <Text variant="muted" className="self-end">
          {`${text.length} / ${maxLength}`}
        </Text>
      ) : null}
    </View>
  );
}
