import { useState, type ComponentProps } from "react";
import { TextInput, View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type TextareaProps = ComponentProps<typeof TextInput> & {
  /** Rendered height in text rows. */
  rows?: number;
  /** When set together with `maxLength`, offers the "n / max" counter. */
  showCount?: boolean;
};

/**
 * The share of the limit a field has to reach before its counter appears on its
 * own. Below this the number is noise: nobody writing the second sentence of a
 * 500-character briefing is rationing characters, and a permanent "124 / 500"
 * under every field puts a second, smaller number beside every label on the page.
 * Past it the limit is real news, so the counter stays up whether or not the
 * field has the cursor.
 */
const COUNT_THRESHOLD = 0.8;

/**
 * Multi-line field. Pass `maxLength` to enforce a limit (prompts and briefings all
 * have one) and `showCount` to offer the "n / max" counter.
 *
 * The counter is shown while the field is focused, or once the text is past
 * {@link COUNT_THRESHOLD} of the limit. The row it sits in keeps its height in
 * both states, so a field does not jump when it takes the cursor.
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
  onFocus,
  onBlur,
  ...props
}: TextareaProps) {
  const theme = useTheme();
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [focused, setFocused] = useState(false);
  const text = value ?? internal;

  function handleChangeText(next: string) {
    if (value === undefined) setInternal(next);
    onChangeText?.(next);
  }

  const counted = showCount && maxLength !== undefined;
  const near =
    counted && text.length >= Math.floor(maxLength * COUNT_THRESHOLD);

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
        placeholderTextColor={theme.colors.subtleForeground}
        style={{ minHeight: rows * theme.lineHeights.base }}
        className={cn(
          "rounded-sm border-hairline border-border bg-input p-md font-body text-base text-foreground",
          "web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
          !editable && "opacity-disabled",
          className,
        )}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {counted ? (
        <Text
          variant="meta"
          className="self-end"
          aria-hidden={!(focused || near)}
        >
          {focused || near ? `${text.length} / ${maxLength}` : " "}
        </Text>
      ) : null}
    </View>
  );
}
