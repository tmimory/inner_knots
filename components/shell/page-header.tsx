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
        "flex-row items-end justify-between gap-lg border-b-hairline border-border pb-lg",
        className,
      )}
    >
      <View className="flex-1 gap-xxs">
        <Text variant="h1">{title}</Text>
        {subtitle ? <Text variant="greek">{subtitle}</Text> : null}
      </View>
      {right ? <View className="flex-row items-center gap-sm">{right}</View> : null}
    </View>
  );
}
