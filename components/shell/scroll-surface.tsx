import type { ComponentProps } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

export type ScrollProps = ComponentProps<typeof View>;

/**
 * The parchment panel most content sits on: a card that carries its own padding,
 * so a screen reads as a sheet laid on the desk rather than a floating box.
 */
export function Scroll({ className, children, ...props }: ScrollProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-lg border-hairline border-border bg-card shadow-ink-soft",
        className,
      )}
      {...props}
    >
      <View className="gap-lg p-lg wide:p-xl">{children}</View>
    </View>
  );
}
