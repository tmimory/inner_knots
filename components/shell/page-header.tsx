import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Actions rendered at the end of the title row: one action, or a muted count. */
  right?: ReactNode;
  className?: string;
};

/**
 * Title block at the top of every screen.
 *
 * The `right` slot sits on the title row rather than below it, so a count set as
 * plain muted text lands on the title's baseline instead of drifting beside the
 * subtitle. There is no rule under the header any more: the first section draws
 * its own, and two hairlines a few pixels apart read as a mistake.
 */
export function PageHeader({ title, subtitle, right, className }: PageHeaderProps) {
  return (
    <View className={cn("gap-xs", className)}>
      <View className="gap-md wide:flex-row wide:items-end wide:justify-between">
        <Text variant="h1" className="wide:flex-1">
          {title}
        </Text>
        {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
      </View>
      {subtitle ? <Text variant="greek">{subtitle}</Text> : null}
    </View>
  );
}
