import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Actions rendered at the end of the header row. */
  right?: ReactNode;
  className?: string;
};

/** Title block at the top of every screen, closed by a hairline rule. */
export function PageHeader({ title, subtitle, right, className }: PageHeaderProps) {
  return (
    <View
      className={cn(
        "gap-md border-b-hairline border-border pb-lg wide:flex-row wide:items-end wide:justify-between",
        className,
      )}
    >
      <View className="flex-1 gap-xs">
        <Text variant="h1">{title}</Text>
        {subtitle ? <Text variant="greek">{subtitle}</Text> : null}
      </View>
      {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
    </View>
  );
}
