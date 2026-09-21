import type { ComponentProps } from "react";
import { View } from "react-native";

import { GreekKey } from "@/components/shell/greek-key";
import { cn } from "@/lib/utils";

export type ScrollProps = ComponentProps<typeof View> & {
  /** Draws a meander rule along the top edge. */
  ornament?: boolean;
};

/**
 * The parchment panel most content sits on: a card with a slightly heavier edge,
 * so a screen reads as a sheet laid on the desk rather than a floating box.
 */
export function Scroll({ className, ornament = true, children, ...props }: ScrollProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-lg border-thick border-border bg-card shadow-ink-raised",
        className,
      )}
      {...props}
    >
      {ornament ? <GreekKey repeats={24} tone="border" className="bg-muted" /> : null}
      <View className="gap-md p-xl">{children}</View>
    </View>
  );
}
