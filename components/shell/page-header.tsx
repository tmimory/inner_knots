import type { ReactNode } from "react";
import { View } from "react-native";

import { GreekKey } from "@/components/shell/greek-key";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** How many meander repeats the rule under the title is drawn with. */
const ORNAMENT_REPEATS = 24;

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Actions rendered at the end of the header row. */
  right?: ReactNode;
  /** Rules a meander under the title, the way a scribe heads a new section. */
  ornament?: boolean;
  className?: string;
};

/** Title block at the top of every screen. */
export function PageHeader({
  title,
  subtitle,
  right,
  ornament = false,
  className,
}: PageHeaderProps) {
  return (
    <>
      <View className={cn("flex-row items-end justify-between gap-lg pb-lg", className)}>
        <View className="flex-1 gap-xxs">
          <Text variant="h1">{title}</Text>
          {subtitle ? <Text variant="greek">{subtitle}</Text> : null}
        </View>
        {right ? <View className="flex-row items-center gap-sm">{right}</View> : null}
      </View>
      {ornament ? <GreekKey repeats={ORNAMENT_REPEATS} tone="border" /> : null}
    </>
  );
}
