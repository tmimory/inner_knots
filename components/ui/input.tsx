import type { ComponentProps } from "react";
import { TextInput } from "react-native";

import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type InputProps = ComponentProps<typeof TextInput>;

export function Input({ className, editable = true, ...props }: InputProps) {
  const theme = useTheme();
  return (
    <TextInput
      editable={editable}
      placeholderTextColor={theme.colors.mutedForeground}
      className={cn(
        "h-control-md rounded-md border-hairline border-border bg-input px-md font-body text-base text-foreground",
        "web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
        !editable && "opacity-disabled",
        className,
      )}
      {...props}
    />
  );
}
